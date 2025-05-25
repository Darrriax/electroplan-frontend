export default class AutoElectricalRouter {
  constructor(store) {
    this.store = store;
    this.distributionBoxes = [];
    this.ctx = null;
    this.usedPanelPoints = new Map(); // Track which points are used by which connections
  }

  setContext(ctx) {
    this.ctx = ctx;
  }

  /**
   * Show error message using Vuex store
   * @param {string} message - Error message to display
   */
  showError(message) {
    if (this.store && this.store.state.reports) {
      this.store.dispatch('reports/setMessage', message);
    }
  }

  /**
   * Check if project has exactly one electrical panel
   * @returns {Object} Result with validation status and message
   */
  validateElectricalPanel() {
    const panels = this.store.state.panels.panels || [];

    if (panels.length === 0) {
      return {
        isValid: false,
        message: 'Error: Please add an electrical panel before using automatic cable routing.'
      };
    }

    if (panels.length > 1) {
      return {
        isValid: false,
        message: 'Error: Project can only have one electrical panel. Please remove extra panels.'
      };
    }

    return {
      isValid: true,
      message: null
    };
  }

  /**
   * Calculate the center point of a room
   * @param {Array} points - Array of room corner points
   * @returns {{x: number, y: number}} Center coordinates
   */
  calculateRoomCenter(points) {
    if (!points || points.length === 0) return { x: 0, y: 0 };

    const sumX = points.reduce((sum, point) => sum + point.x, 0);
    const sumY = points.reduce((sum, point) => sum + point.y, 0);

    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
  }

  /**
   * Check if switches in a room are grouped
   * @param {Array} switches - Array of switches in a room
   * @returns {boolean} True if switches are grouped
   */
  areSwitchesGrouped(switches) {
    if (switches.length <= 1) return true;

    // Consider switches grouped if they are within 50 units of each other
    const GROUPING_THRESHOLD = 50;

    // For each switch, check if all other switches are within the threshold
    for (let i = 0; i < switches.length; i++) {
      let allNearby = true;

      for (let j = 0; j < switches.length; j++) {
        if (i === j) continue;

        const distance = this.calculateDistance(
            switches[i].position,
            switches[j].position
        );

        if (distance > GROUPING_THRESHOLD) {
          allNearby = false;
          break;
        }
      }

      // If we found a switch where all others are nearby, the switches are grouped
      if (allNearby) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm
   * @param {Object} point - Point to check
   * @param {Array} polygon - Array of polygon points
   * @returns {boolean} True if point is inside polygon
   */
  isPointInPolygon(point, polygon) {
    // Extract x, y from the point (handle proxy objects)
    const pointX = Number(point.x);
    const pointY = Number(point.y);

    // Simple bounding box check first
    const bounds = {
      minX: Math.min(...polygon.map(p => p.x)),
      maxX: Math.max(...polygon.map(p => p.x)),
      minY: Math.min(...polygon.map(p => p.y)),
      maxY: Math.max(...polygon.map(p => p.y))
    };

    // Quick check if point is outside bounding box
    if (pointX < bounds.minX || pointX > bounds.maxX ||
        pointY < bounds.minY || pointY > bounds.maxY) {
      return false;
    }

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = Number(polygon[i].x);
      const yi = Number(polygon[i].y);
      const xj = Number(polygon[j].x);
      const yj = Number(polygon[j].y);

      const intersect = ((yi > pointY) !== (yj > pointY)) &&
          (pointX < (xj - xi) * (pointY - yi) / (yj - yi) + xi);

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Find all rooms that need distribution boxes (rooms with 2 or more ungrouped switches)
   * @returns {Array} Array of rooms needing boxes
   */
  findRoomsNeedingBoxes() {
    // First validate electrical panel
    const panelValidation = this.validateElectricalPanel();
    if (!panelValidation.isValid) {
      this.showError(panelValidation.message);
      return [];
    }

    const rooms = this.store.state.rooms.rooms || [];
    const switches = this.store.state.switches.switches || [];
    const roomsNeedingBoxes = [];

    rooms.forEach(room => {
      // Use room.path for the room boundary
      const roomPath = room.path;

      // Find switches in this room
      const switchesInRoom = switches.filter(sw => {
        return this.isPointInPolygon(sw.position, roomPath);
      });

      // Only add rooms with 2 or more switches that are NOT grouped
      if (switchesInRoom.length >= 2 && !this.areSwitchesGrouped(switchesInRoom)) {
        roomsNeedingBoxes.push({
          room,
          switches: switchesInRoom
        });
      }
    });

    return roomsNeedingBoxes;
  }

  /**
   * Get the position of the electrical panel
   * @returns {Object|null} Panel position or null if no panel exists
   */
  getElectricalPanelPosition() {
    const panels = this.store.state.panels.panels;
    if (panels && panels.length > 0) {
      return panels[0].position;
    }
    return null;
  }

  /**
   * Calculate distance between two points
   * @param {Object} point1 - First point {x, y}
   * @param {Object} point2 - Second point {x, y}
   * @returns {number} Distance between points
   */
  calculateDistance(point1, point2) {
    if (!point1 || !point2 || typeof point1.x === 'undefined' || typeof point1.y === 'undefined' ||
        typeof point2.x === 'undefined' || typeof point2.y === 'undefined') {
      return Infinity;
    }
    return Math.sqrt(
        Math.pow(point1.x - point2.x, 2) +
        Math.pow(point1.y - point2.y, 2)
    );
  }

  /**
   * Find the closest point on room boundary to target point
   * @param {Array} roomPath - Array of room boundary points
   * @param {Object} targetPoint - Point to find closest position to
   * @param {number} margin - Margin from walls (default 10 units)
   * @returns {Object} Closest valid position {x, y}
   */
  findClosestValidPosition(roomPath, targetPoint, margin = 20) {
    // First try to create a grid of potential points inside the room
    const bounds = {
      minX: Math.min(...roomPath.map(p => p.x)) + margin,
      maxX: Math.max(...roomPath.map(p => p.x)) - margin,
      minY: Math.min(...roomPath.map(p => p.y)) + margin,
      maxY: Math.max(...roomPath.map(p => p.y)) - margin
    };

    const gridSize = 10; // Smaller grid size for more precise placement
    let closestPoint = null;
    let minDistance = Infinity;

    // Try points in a grid pattern
    for (let x = bounds.minX; x <= bounds.maxX; x += gridSize) {
      for (let y = bounds.minY; y <= bounds.maxY; y += gridSize) {
        const testPoint = { x, y };

        // Check if point is inside room with margin
        if (this.isPointInPolygon(testPoint, roomPath)) {
          // Check if point is at least margin units away from all walls
          let isSafeFromWalls = true;
          for (let i = 0; i < roomPath.length; i++) {
            const j = (i + 1) % roomPath.length;
            const distToWall = this.distanceToLine(
                testPoint,
                roomPath[i],
                roomPath[j]
            );
            if (distToWall < margin) {
              isSafeFromWalls = false;
              break;
            }
          }

          if (isSafeFromWalls) {
            const distance = this.calculateDistance(testPoint, targetPoint);
            if (distance < minDistance) {
              minDistance = distance;
              closestPoint = testPoint;
            }
          }
        }
      }
    }

    // If no valid point found, return room center as fallback
    return closestPoint || this.calculateRoomCenter(roomPath);
  }

  /**
   * Calculate distance from point to line segment
   * @param {Object} point - Point to check
   * @param {Object} lineStart - Start point of line
   * @param {Object} lineEnd - End point of line
   * @returns {number} Distance from point to line
   */
  distanceToLine(point, lineStart, lineEnd) {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Create distribution boxes for all rooms that need them
   * @returns {Array} Array of distribution box objects
   */
  createDistributionBoxes() {
    const roomsNeedingBoxes = this.findRoomsNeedingBoxes();
    const panelPosition = this.getElectricalPanelPosition();

    if (!panelPosition) {
      this.showError('Error: No electrical panel found in the project.');
      return [];
    }

    // Get all rooms
    const rooms = this.store.state.rooms.rooms || [];

    // Find which room contains the electrical panel
    const panelRoom = rooms.find(room => this.isPointInPolygon(panelPosition, room.path));

    this.distributionBoxes = roomsNeedingBoxes
        .filter(({ room }) => room.id !== panelRoom?.id) // Skip the room with the electrical panel
        .map(({ room }) => {
          // Find optimal position closest to panel while respecting room boundaries
          const position = this.findClosestValidPosition(room.path, panelPosition);

          return {
            id: `box-${room.id}`,
            position: position,
            roomId: room.id,
            radius: 8  // 80mm diameter = 40mm radius
          };
        });

    return this.distributionBoxes;
  }

  /**
   * Draw distribution boxes on the canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} transform - Canvas transform object with panOffset and zoom
   */
  drawBoxes(ctx, transform) {
    // Only draw boxes if routing is active
    if (!this.store.state.project.isRoutingActive) {
      return;
    }

    ctx.save();

    // Apply transform
    ctx.translate(transform.panOffset.x, transform.panOffset.y);
    ctx.scale(transform.zoom, transform.zoom);

    // Draw each box
    this.distributionBoxes.forEach(box => {
      ctx.beginPath();
      ctx.arc(box.position.x, box.position.y, box.radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#2196F3';  // Changed to blue
      ctx.lineWidth = 3 / transform.zoom;
      ctx.stroke();
      ctx.fillStyle = 'rgba(33, 150, 243, 0.2)';  // Light blue fill
      ctx.fill();

      // Add a label
      ctx.fillStyle = '#000';
      ctx.font = `${12 / transform.zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('Junction Box', box.position.x, box.position.y - box.radius - 5 / transform.zoom);
    });

    ctx.restore();
  }

  /**
   * Get the power source for a specific room
   * @param {string} roomId - ID of the room
   * @returns {Object|null} Position of junction box or panel
   */
  getPowerSourcePosition(roomId) {
    // First check if room has active switches that need a junction box
    const junctionBox = this.distributionBoxes.find(b => b.roomId === roomId);
    const switches = this.store.state.switches.switches || [];
    const roomSwitches = switches.filter(sw => {
      return this.isPointInPolygon(sw.position, this.store.state.rooms.rooms.find(r => r.id === roomId)?.path || []);
    });
    const hasActiveSwitches = roomSwitches.some(sw => this.doesSwitchControlAnything(sw));

    // Only use junction box if it exists AND there are active switches
    if (junctionBox && hasActiveSwitches) {
      return junctionBox.position;
    }

    // If no junction box or no active switches, use electrical panel
    const panels = this.store.state.panels.panels || [];
    if (panels.length > 0) {
      return panels[0].position;
    }

    return null;
  }

  /**
   * Calculate point position from wall considering wall slope and socket side
   * @param {Object} socket - Socket object with position and wall ID
   * @param {Array} walls - Array of wall objects
   * @param {number} distance - Distance from wall in cm
   * @param {number} horizontalOffset - Optional horizontal offset in cm
   * @returns {Object|null} Calculated point position or null if wall not found
   */
  calculatePointPosition(socket, walls, distance, horizontalOffset = 0) {
    // Find the wall the socket is mounted on
    const wall = walls.find(w => w.id === socket.wall);
    if (!wall) return null;

    // Calculate wall vector (from start to end)
    const wallVector = {
      x: wall.end.x - wall.start.x,
      y: wall.end.y - wall.start.y
    };

    // Calculate wall length
    const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);

    // Normalize wall vector
    const normalizedWall = {
      x: wallVector.x / wallLength,
      y: wallVector.y / wallLength
    };

    // Calculate normal vector (perpendicular to wall)
    // Points inside the room
    let normalVector = {
      x: normalizedWall.y,
      y: -normalizedWall.x
    };

    // If socket is on the right side, flip the normal vector
    if (socket.position.side === 'right') {
      normalVector.x = -normalVector.x;
      normalVector.y = -normalVector.y;
    }

    // Apply horizontal offset if needed
    const offsetPosition = {
      x: socket.position.x + (normalizedWall.x * horizontalOffset),
      y: socket.position.y + (normalizedWall.y * horizontalOffset)
    };

    // Calculate final point position
    return {
      x: offsetPosition.x + (normalVector.x * distance),
      y: offsetPosition.y + (normalVector.y * distance)
    };
  }

  /**
   * Draw all elements (boxes and connection points)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} transform - Canvas transform object
   */
  draw(ctx, transform) {
    if (!this.store.state.project.isRoutingActive) return;

    // Reset used panel points tracking at the start of each draw
    this.usedPanelPoints.clear();

    this.drawActiveAreas(ctx, transform);
    this.drawPanelPoints(ctx, transform);
    this.drawBoxes(ctx, transform);
    this.drawSocketPoints(ctx, transform);
    this.drawSwitchPoints(ctx, transform);
    this.drawLightPoints(ctx, transform);
    this.drawLightSwitchConnections(ctx, transform);
    this.drawSwitchToPanelConnections(ctx, transform);  // Add this line
    this.drawRoomToPanelConnections(ctx, transform);
  }

  /**
   * Draw connections from switches to panel points
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} transform - Canvas transform object
   */
  drawSwitchToPanelConnections(ctx, transform) {
    if (!this.store.state.project.isRoutingActive) return;

    const panel = this.getElectricalPanelPosition();
    if (!panel) return;

    const rooms = this.store.state.rooms.rooms || [];
    const walls = this.store.state.walls.walls || [];
    const switches = this.store.state.switches.switches || [];
    const panelPoints = this.calculatePanelConnectionPoints();

    // Find panel room
    const panelRoom = rooms.find(room => this.isPointInPolygon(panel, room.path));
    if (!panelRoom) return;

    ctx.save();
    ctx.translate(transform.panOffset.x, transform.panOffset.y);
    ctx.scale(transform.zoom, transform.zoom);

    // Group switches by room
    const switchesByRoom = new Map();
    switches.forEach(switchObj => {
      const wall = walls.find(w => w.id === switchObj.wall);
      if (!wall) return;

      rooms.forEach(room => {
        if (this.isPointInPolygon(switchObj.position, room.path)) {
          if (!switchesByRoom.has(room.id)) {
            switchesByRoom.set(room.id, []);
          }
          switchesByRoom.get(room.id).push(switchObj);
        }
      });
    });

    // Process each room
    rooms.forEach(room => {
      const roomSwitches = switchesByRoom.get(room.id) || [];

      if (room.id === panelRoom.id) {
        // For panel room, connect all active switches directly to panel
        roomSwitches.forEach(switchObj => {
          // Only draw connection if switch controls lights
          if (!this.doesSwitchControlAnything(switchObj)) return;

          const switchPoint = this.calculatePointPosition(switchObj, walls, 20);
          if (!switchPoint) return;

          const connectionId = `switch-${switchObj.id}`;
          const panelPoint = this.findAvailablePanelPoint(panelPoints, connectionId);
          if (!panelPoint) return;

          // Draw connection using orthogonal path
          const path = this.calculateOrthogonalPath(switchPoint, panelPoint, walls);
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          path.forEach((point, i) => {
            if (i === 0) return;
            ctx.lineTo(point.x, point.y);
          });
          ctx.strokeStyle = '#D4AC0D';
          ctx.lineWidth = 2 / transform.zoom;
          ctx.stroke();
        });
      } else {
        // For other rooms
        const junctionBox = this.distributionBoxes.find(box => box.roomId === room.id);

        if (junctionBox) {
          // Check if any switches in the room control lights
          const hasActiveSwitches = roomSwitches.some(sw => this.doesSwitchControlAnything(sw));

          // Connect active switches to junction box
          roomSwitches.forEach((switchObj, index) => {
            // Only draw connection if switch controls lights
            if (!this.doesSwitchControlAnything(switchObj)) return;

            const switchPoint = this.calculatePointPosition(switchObj, walls, 20);
            if (!switchPoint) return;

            // Calculate offset for multiple switches
            let targetPoint = { ...junctionBox.position };
            if (roomSwitches.length > 1) {
              const pathVector = {
                x: junctionBox.position.x - switchPoint.x,
                y: junctionBox.position.y - switchPoint.y
              };
              const pathLength = Math.sqrt(pathVector.x * pathVector.x + pathVector.y * pathVector.y);
              const offsetVector = {
                x: -pathVector.y / pathLength,
                y: pathVector.x / pathLength
              };

              const offset = (index - (roomSwitches.length - 1) / 2) * 3;
              targetPoint = {
                x: junctionBox.position.x + offsetVector.x * offset,
                y: junctionBox.position.y + offsetVector.y * offset
              };
            }

            // Draw connection to junction box
            const path = this.calculateOrthogonalPath(switchPoint, targetPoint, walls);
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            path.forEach((point, i) => {
              if (i === 0) return;
              ctx.lineTo(point.x, point.y);
            });
            ctx.strokeStyle = '#D4AC0D';
            ctx.lineWidth = 2 / transform.zoom;
            ctx.stroke();
          });

          // Only connect junction box to panel if there are active switches
          if (hasActiveSwitches) {
            const connectionId = `box-${room.id}`;
            const panelPoint = this.findAvailablePanelPoint(panelPoints, connectionId);
            if (panelPoint) {
              // Calculate offset point (3cm down from junction box)
              const offsetPoint = {
                x: junctionBox.position.x,
                y: junctionBox.position.y + 3
              };

              // Draw connection to panel
              const path = this.calculateOrthogonalPath(offsetPoint, panelPoint, walls);
              ctx.beginPath();
              ctx.moveTo(path[0].x, path[0].y);
              path.forEach((point, i) => {
                if (i === 0) return;
                ctx.lineTo(point.x, point.y);
              });
              ctx.strokeStyle = '#D4AC0D';
              ctx.lineWidth = 2 / transform.zoom;
              ctx.stroke();
            }
          }
        } else if (roomSwitches.length === 1) {
          // Single switch room - connect directly to panel if it controls lights
          const switchObj = roomSwitches[0];
          if (!this.doesSwitchControlAnything(switchObj)) return;

          const switchPoint = this.calculatePointPosition(switchObj, walls, 20);
          if (!switchPoint) return;

          const connectionId = `switch-${switchObj.id}`;
          const panelPoint = this.findAvailablePanelPoint(panelPoints, connectionId);
          if (!panelPoint) return;

          // Draw connection using orthogonal path
          const path = this.calculateOrthogonalPath(switchPoint, panelPoint, walls);
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          path.forEach((point, i) => {
            if (i === 0) return;
            ctx.lineTo(point.x, point.y);
          });
          ctx.strokeStyle = '#D4AC0D';
          ctx.lineWidth = 2 / transform.zoom;
          ctx.stroke();
        }
      }
    });

    ctx.restore();
  }

  /**
   * Check if a switch controls any lights or groups
   * @param {Object} switchObj - The switch object to check
   * @returns {boolean} True if switch controls any lights or groups
   */
  doesSwitchControlAnything(switchObj) {
    const lights = this.store.state.lights.lights || [];

    // Check for connected groups in single switch
    if (switchObj.connectedGroup && switchObj.connectedGroup.lightRefs && switchObj.connectedGroup.lightRefs.length > 0) {
      return true;
    }

    // Check for connected groups in double switch
    if (switchObj.type === 'double-switch') {
      if (switchObj.connectedGroup1 && switchObj.connectedGroup1.lightRefs && switchObj.connectedGroup1.lightRefs.length > 0) {
        return true;
      }
      if (switchObj.connectedGroup2 && switchObj.connectedGroup2.lightRefs && switchObj.connectedGroup2.lightRefs.length > 0) {
        return true;
      }
    }

    // Check for directly connected lights
    return lights.some(light => {
      if (switchObj.type === 'single-switch') {
        return light.switchId === switchObj.id;
      } else if (switchObj.type === 'double-switch') {
        return light.switchIds && (light.switchIds[0] === switchObj.id || light.switchIds[1] === switchObj.id);
      }
      return false;
    });
  }

  /**
   * Draw a connection between a switch point and a panel point
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} switchPoint - Switch connection point
   * @param {Object} panelPoint - Panel connection point
   * @param {Object} transform - Transform object
   */
  drawSwitchPanelConnection(ctx, switchPoint, panelPoint, transform) {
    const path = this.calculateOrthogonalPath(switchPoint, panelPoint, this.store.state.walls.walls || []);

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    path.forEach((point, i) => {
      if (i === 0) return;
      ctx.lineTo(point.x, point.y);
    });

    ctx.strokeStyle = '#D4AC0D';
    ctx.lineWidth = 2 / transform.zoom;
    ctx.stroke();
  }

  /**
   * Draw active areas in each room
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} transform - Canvas transform object
   */
  drawActiveAreas(ctx, transform) {
    const rooms = this.store.state.rooms.rooms || [];
    if (!rooms.length) return;

    ctx.save();
    ctx.translate(transform.panOffset.x, transform.panOffset.y);
    ctx.scale(transform.zoom, transform.zoom);

    rooms.forEach(room => {
      // Calculate inner inactive area (50cm from walls)
      const inactiveArea = this.calculateInsetPath(room.path, 50);
      if (!inactiveArea || inactiveArea.length < 3) return;

      // Draw active area (between room walls and inactive area)
      ctx.beginPath();

      // Start with outer path (room walls)
      ctx.moveTo(room.path[0].x, room.path[0].y);
      for (let i = 1; i < room.path.length; i++) {
        ctx.lineTo(room.path[i].x, room.path[i].y);
      }
      ctx.closePath();

      // Cut out inner path (inactive area)
      ctx.moveTo(inactiveArea[0].x, inactiveArea[0].y);
      for (let i = inactiveArea.length - 1; i >= 0; i--) {
        ctx.lineTo(inactiveArea[i].x, inactiveArea[i].y);
      }
      ctx.closePath();

      // Fill the frame between outer and inner paths with fully transparent color
      ctx.fillStyle = 'rgba(0, 0, 255, 0)';
      ctx.fill('evenodd');

      // Draw outlines with very low opacity
      ctx.beginPath();
      ctx.moveTo(room.path[0].x, room.path[0].y);
      for (let i = 1; i < room.path.length; i++) {
        ctx.lineTo(room.path[i].x, room.path[i].y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(0, 0, 255, 0)';
      ctx.lineWidth = 1 / transform.zoom;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(inactiveArea[0].x, inactiveArea[0].y);
      for (let i = 1; i < inactiveArea.length; i++) {
        ctx.lineTo(inactiveArea[i].x, inactiveArea[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    });

    ctx.restore();
  }

  /**
   * Calculate inset path by offsetting each wall inward
   * @param {Array} roomPath - Array of room corner points
   * @param {number} offset - Offset from walls in cm
   * @returns {Array} Array of points forming the inset path
   */
  calculateInsetPath(roomPath, offset) {
    if (!roomPath || roomPath.length < 3) return null;

    // First ensure the room path is in clockwise order
    const isClockwise = this.isPathClockwise(roomPath);
    const orderedPath = isClockwise ? [...roomPath] : [...roomPath].reverse();

    const insetPoints = [];

    // Process each wall segment
    for (let i = 0; i < orderedPath.length - 1; i++) {
      const start = orderedPath[i];
      const end = orderedPath[i + 1];
      const next = orderedPath[(i + 2) % (orderedPath.length - 1)];

      // Calculate wall vector
      const wallVector = {
        x: end.x - start.x,
        y: end.y - start.y
      };

      // Calculate wall length
      const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);

      if (wallLength === 0) continue;

      // Normalize wall vector
      const normalizedWall = {
        x: wallVector.x / wallLength,
        y: wallVector.y / wallLength
      };

      // Calculate normal vector (always pointing inside for clockwise path)
      const normalVector = {
        x: normalizedWall.y,  // Changed from -normalizedWall.y
        y: -normalizedWall.x  // Changed from normalizedWall.x
      };

      // Calculate offset point
      const offsetPoint = {
        x: start.x + normalVector.x * offset,
        y: start.y + normalVector.y * offset
      };

      // Add point to inset path
      insetPoints.push(offsetPoint);

      // Calculate next wall's vector
      const nextWallVector = {
        x: next.x - end.x,
        y: next.y - end.y
      };
      const nextWallLength = Math.sqrt(nextWallVector.x * nextWallVector.x + nextWallVector.y * nextWallVector.y);

      if (nextWallLength === 0) continue;

      const nextNormalizedWall = {
        x: nextWallVector.x / nextWallLength,
        y: nextWallVector.y / nextWallLength
      };
      const nextNormalVector = {
        x: nextNormalizedWall.y,  // Changed from -nextNormalizedWall.y
        y: -nextNormalizedWall.x  // Changed from nextNormalizedWall.x
      };

      // Calculate next wall's offset point
      const nextOffsetPoint = {
        x: end.x + nextNormalVector.x * offset,
        y: end.y + nextNormalVector.y * offset
      };

      // Calculate intersection point
      const intersection = this.findLineIntersection(
          offsetPoint,
          { x: offsetPoint.x + normalizedWall.x, y: offsetPoint.y + normalizedWall.y },
          nextOffsetPoint,
          { x: nextOffsetPoint.x - nextNormalizedWall.x, y: nextOffsetPoint.y - nextNormalizedWall.y }
      );

      if (intersection) {
        insetPoints.push(intersection);
      }
    }

    // Add final point to close the path
    if (insetPoints.length > 0) {
      insetPoints.push(insetPoints[0]);
    }

    return insetPoints;
  }

  /**
   * Check if a path is in clockwise order
   * @param {Array} path - Array of points forming a path
   * @returns {boolean} True if path is clockwise
   */
  isPathClockwise(path) {
    if (!path || path.length < 3) return true;

    let sum = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i];
      const next = path[i + 1];
      sum += (next.x - current.x) * (next.y + current.y);
    }

    // Close the path
    const last = path[path.length - 1];
    const first = path[0];
    sum += (first.x - last.x) * (first.y + last.y);

    return sum >= 0;
  }

  /**
   * Calculate offset for parallel paths to prevent overlapping
   * @param {Array} existingPaths - Array of already calculated paths
   * @param {Object} currentPath - Current path being calculated
   * @param {Object} panel - Panel position
   * @returns {number} Offset distance in cm
   */
  calculateParallelPathOffset(existingPaths, currentPath, panel) {
    const SPACING = 3; // 3cm spacing between parallel lines
    let offset = 0;
    let overlappingPaths = 0;

    // Check each existing path for parallel segments
    existingPaths.forEach(existingPath => {
      // Find segments that run perpendicular to the panel
      const isParallel = this.hasParallelSegmentToPanel(existingPath, currentPath, panel);
      if (isParallel) {
        overlappingPaths++;
      }
    });

    return overlappingPaths * SPACING;
  }

  /**
   * Check if two paths have parallel segments running to panel
   * @param {Array} path1 - First path
   * @param {Array} path2 - Second path
   * @param {Object} panel - Panel position
   * @returns {boolean} True if paths have parallel segments
   */
  hasParallelSegmentToPanel(path1, path2, panel) {
    // Get the segments that connect to the panel
    const segment1 = this.getPanelConnectingSegment(path1, panel);
    const segment2 = this.getPanelConnectingSegment(path2, panel);

    if (!segment1 || !segment2) return false;

    // Check if segments are parallel (both vertical or both horizontal)
    const isVertical1 = Math.abs(segment1.start.x - segment1.end.x) < 0.1;
    const isVertical2 = Math.abs(segment2.start.x - segment2.end.x) < 0.1;

    return isVertical1 === isVertical2;
  }

  /**
   * Get the segment of path that connects to panel
   * @param {Array} path - Path array
   * @param {Object} panel - Panel position
   * @returns {Object|null} Segment connecting to panel
   */
  getPanelConnectingSegment(path, panel) {
    if (!path || path.length < 2) return null;

    // Get the last segment (connects to panel)
    const lastPoint = path[path.length - 1];
    const prevPoint = path[path.length - 2];

    return {
      start: prevPoint,
      end: lastPoint
    };
  }

  /**
   * Calculate orthogonal path between two points with parallel path offset
   * @param {Object} start - Start point
   * @param {Object} end - End point
   * @param {Array} walls - Array of walls
   * @param {number} offset - Offset for parallel paths
   * @returns {Array} Array of points forming orthogonal path
   */
  calculateOffsetOrthogonalPath(start, end, walls, offset) {
    const path = [];
    path.push(start);

    // Find nearest walls for start and end points
    const startWall = this.findNearestWallPoint(start, walls);
    const endWall = this.findNearestWallPoint(end, walls);

    if (startWall.wall && endWall.wall) {
      // If on same wall, follow wall directly
      if (startWall.wall.id === endWall.wall.id) {
        const wallVector = {
          x: startWall.wall.end.x - startWall.wall.start.x,
          y: startWall.wall.end.y - startWall.wall.start.y
        };
        const normalVector = {
          x: -wallVector.y / Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y),
          y: wallVector.x / Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y)
        };

        // Add intermediate points along wall
        const midPoint = {
          x: (start.x + end.x) / 2,
          y: (start.y + end.y) / 2
        };
        path.push({
          x: midPoint.x + normalVector.x * 30, // 30cm from wall
          y: midPoint.y + normalVector.y * 30
        });
      } else {
        // Different walls - create corner path with offset
        const isVertical = Math.abs(end.x - start.x) > Math.abs(end.y - start.y);
        if (isVertical) {
          path.push({
            x: end.x + offset,
            y: start.y
          });
        } else {
          path.push({
            x: start.x,
            y: end.y + offset
          });
        }
      }
    }

    path.push(end);
    return path;
  }

  /**
   * Draw connections from each room to the electrical panel
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} transform - Canvas transform object
   */
  drawRoomToPanelConnections(ctx, transform) {
    if (!this.store.state.project.isRoutingActive) return;

    const panel = this.getElectricalPanelPosition();
    if (!panel) return;

    const walls = this.store.state.walls.walls || [];
    const rooms = this.store.state.rooms.rooms || [];
    const sockets = this.store.state.sockets.sockets || [];

    // Calculate panel connection points
    const panelPoints = this.calculatePanelConnectionPoints();
    if (panelPoints.length === 0) return;

    ctx.save();
    ctx.translate(transform.panOffset.x, transform.panOffset.y);
    ctx.scale(transform.zoom, transform.zoom);

    // Find panel room
    const panelRoom = rooms.find(room => this.isPointInPolygon(panel, room.path));
    if (!panelRoom) return;

    // Process each room except the panel room
    rooms.forEach(room => {
      if (room.id === panelRoom.id) return;

      // Find all sockets in this room
      const roomSockets = sockets.filter(socket => {
        const wall = walls.find(w => w.id === socket.wall);
        return wall && this.isPointInPolygon(socket.position, room.path);
      });

      // Skip if room has no sockets
      if (roomSockets.length === 0) return;

      // Check if room has regular sockets
      const hasRegularSockets = roomSockets.some(socket =>
          socket.deviceType !== 'powerful' && socket.deviceType !== 'high-power'
      );

      // Find or calculate the connection point for this room
      let connectionPoint = null;
      let connectionType = null;

      // First check if room has a distribution box
      const distributionBox = this.distributionBoxes.find(box => box.roomId === room.id);
      if (distributionBox) {
        connectionPoint = distributionBox.position;
        connectionType = 'box';
      } else {
        // Group nearby sockets
        const socketClusters = this.groupSocketsByProximity(roomSockets, walls);

        // Find the cluster or single socket closest to the panel
        let nearestGroup = null;
        let minDistance = Infinity;

        socketClusters.forEach(cluster => {
          // Calculate cluster center
          const avgX = cluster.reduce((sum, s) => sum + s.position.x, 0) / cluster.length;
          const avgY = cluster.reduce((sum, s) => sum + s.position.y, 0) / cluster.length;
          const clusterCenter = { x: avgX, y: avgY };

          // Use the first socket's properties for the reference
          const referenceSocket = cluster[0];
          const wall = walls.find(w => w.id === referenceSocket.wall);
          if (!wall) return;

          // Calculate the connection point for this cluster
          const distance = referenceSocket.deviceType === 'high-power' ? 27 :
              referenceSocket.deviceType === 'powerful' ? 22 : 25;

          const point = this.calculatePointPosition(
              { ...referenceSocket, position: { ...clusterCenter, side: referenceSocket.position.side } },
              walls,
              distance
          );

          if (!point) return;

          // Calculate distance from cluster's connection point to panel
          const distanceToPanel = this.calculateDistance(point, panel);
          if (distanceToPanel < minDistance) {
            minDistance = distanceToPanel;
            nearestGroup = {
              point: point,
              cluster: cluster,
              deviceType: referenceSocket.deviceType
            };
          }
        });

        if (nearestGroup) {
          connectionPoint = nearestGroup.point;
          connectionType = 'socket';
        }
      }

      // Draw connection if we have a valid point
      if (connectionPoint) {
        const connectionId = `room-${room.id}`;
        const panelPoint = this.findAvailablePanelPoint(panelPoints, connectionId);
        if (!panelPoint) return;

        // Calculate path avoiding walls
        const path = this.calculateOrthogonalPath(connectionPoint, panelPoint, walls);

        // Only draw connection if room has regular sockets
        if (hasRegularSockets) {
          // Draw the connection
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          path.forEach((point, i) => {
            if (i === 0) return;
            ctx.lineTo(point.x, point.y);
          });

          ctx.strokeStyle = '#0000FF';
          ctx.lineWidth = 2 / transform.zoom;
          ctx.stroke();

          // Draw connection point
          ctx.beginPath();
          ctx.arc(connectionPoint.x, connectionPoint.y, 3 / transform.zoom, 0, Math.PI * 2);
          ctx.fillStyle = '#0000FF';
          ctx.fill();
        }
      }
    });

    ctx.restore();
  }

  /**
   * Find an available panel point
   * @param {Array} panelPoints - Array of panel points
   * @param {string} connectionId - Unique identifier for the connection
   * @returns {Object|null} Available panel point or null if none found
   */
  findAvailablePanelPoint(panelPoints, connectionId) {
    // First try to find if this connection already has an assigned point
    for (const [pointIndex, usedById] of this.usedPanelPoints.entries()) {
      if (usedById === connectionId) {
        return panelPoints[pointIndex];
      }
    }

    // If not, find first unused point
    for (let i = 0; i < panelPoints.length; i++) {
      if (!this.usedPanelPoints.has(i)) {
        this.usedPanelPoints.set(i, connectionId);
        return panelPoints[i];
      }
    }

    return null;
  }

  /**
   * Find the closest socket in a room to the panel
   * @param {Object} room - Room object
   * @param {Object} panel - Panel position
   * @returns {Object|null} Closest socket or null if none found
   */
  findClosestSocketInRoom(room, panel) {
    const sockets = this.store.state.sockets.sockets || [];
    const walls = this.store.state.walls.walls || [];

    let closestSocket = null;
    let minDistance = Infinity;

    sockets.forEach(socket => {
      // Find which wall this socket is on
      const wall = walls.find(w => w.id === socket.wall);
      if (!wall) return;

      // Check if wall belongs to this room
      const isInRoom = room.path.some((point, index) => {
        const nextIndex = (index + 1) % room.path.length;
        return (
            (point.x === wall.start.x && point.y === wall.start.y &&
                room.path[nextIndex].x === wall.end.x && room.path[nextIndex].y === wall.end.y) ||
            (point.x === wall.end.x && point.y === wall.end.y &&
                room.path[nextIndex].x === wall.start.x && room.path[nextIndex].y === wall.start.y)
        );
      });

      if (!isInRoom) return;

      // Calculate distance to panel
      const distance = this.calculateDistance(socket.position, panel);
      if (distance < minDistance) {
        minDistance = distance;
        closestSocket = socket;
      }
    });

    return closestSocket;
  }

  /**
   * Group sockets by room and type
   * @param {Array} sockets - Array of all sockets
   * @param {Array} walls - Array of all walls
   * @returns {Object} Grouped sockets by room and type
   */
  groupSocketsByRoom(sockets, walls) {
    const rooms = this.store.state.rooms.rooms || [];
    const socketGroups = new Map();

    sockets.forEach(socket => {
      const wall = walls.find(w => w.id === socket.wall);
      if (!wall) return;

      // Find which room contains this wall
      const room = rooms.find(r => {
        const points = r.path;
        for (let i = 0; i < points.length; i++) {
          const j = (i + 1) % points.length;
          if (
              (points[i].x === wall.start.x && points[i].y === wall.start.y &&
                  points[j].x === wall.end.x && points[j].y === wall.end.y) ||
              (points[i].x === wall.end.x && points[i].y === wall.end.y &&
                  points[j].x === wall.start.x && points[j].y === wall.start.y)
          ) {
            return true;
          }
        }
        return false;
      });

      if (room) {
        if (!socketGroups.has(room.id)) {
          socketGroups.set(room.id, {
            regular: [],
            highPower: []
          });
        }

        const group = socketGroups.get(room.id);
        // Check both deviceType and type fields for backward compatibility
        const socketType = socket.deviceType || socket.type || 'regular';
        if (socketType === 'high-power' || socketType === 'powerful') {
          group.highPower.push(socket);
        } else {
          group.regular.push(socket);
        }
      }
    });

    return socketGroups;
  }

  /**
   * Group nearby sockets together
   * @param {Array} sockets - Array of sockets
   * @param {Array} walls - Array of walls
   * @returns {Array} Array of socket clusters
   */
  groupSocketsByProximity(sockets, walls) {
    const clusters = [];
    const processed = new Set();
    const PROXIMITY_THRESHOLD = 10; // 10cm

    // Helper function to recursively find all connected sockets
    const findConnectedSockets = (socket, cluster) => {
      cluster.push(socket);
      processed.add(socket.id);

      // Look for any unprocessed sockets that are close to this one
      sockets.forEach(otherSocket => {
        if (processed.has(otherSocket.id)) return;

        // Check if sockets are on the same wall
        if (socket.wall === otherSocket.wall) {
          const distance = Math.sqrt(
              Math.pow(socket.position.x - otherSocket.position.x, 2) +
              Math.pow(socket.position.y - otherSocket.position.y, 2)
          );

          // If socket is within range, recursively find its connections
          if (distance <= PROXIMITY_THRESHOLD) {
            findConnectedSockets(otherSocket, cluster);
          }
        }
      });
    };

    // Process all sockets
    sockets.forEach(socket => {
      if (processed.has(socket.id)) return;

      const cluster = [];
      findConnectedSockets(socket, cluster);

      // Only create a cluster if there are at least 2 sockets
      if (cluster.length >= 2) {
        clusters.push(cluster);
      } else {
        // Single sockets form their own "cluster"
        clusters.push([socket]);
      }
    });

    return clusters;
  }

  /**
   * Calculate the order of socket groups for circuit routing
   * @param {Array} socketClusters - Array of socket clusters
   * @param {Object} powerSource - Position of junction box or panel
   * @returns {Array} Ordered array of socket clusters from farthest to nearest
   */
  orderSocketClustersForCircuit(socketClusters, powerSource) {
    return socketClusters.sort((a, b) => {
      const centerA = this.calculateGroupCenter(a);
      const centerB = this.calculateGroupCenter(b);
      const distanceA = this.calculateWallDistance(centerA, powerSource);
      const distanceB = this.calculateWallDistance(centerB, powerSource);
      return distanceB - distanceA; // Sort by descending distance (farthest first)
    });
  }

  /**
   * Initialize pheromone levels between all points
   * @param {Array} points - Array of points
   * @returns {Object} Matrix of pheromone levels
   */
  initializePheromones(points) {
    const pheromones = {};
    const initialPheromone = 1.0;

    points.forEach((point1, i) => {
      pheromones[i] = {};
      points.forEach((point2, j) => {
        if (i !== j) {
          pheromones[i][j] = initialPheromone;
        }
      });
    });

    return pheromones;
  }

  /**
   * Find nearest wall point for a given position
   * @param {Object} position - Position to check
   * @param {Array} walls - Array of walls
   * @returns {Object} Nearest point on wall and the wall itself
   */
  findNearestWallPoint(position, walls) {
    let minDistance = Infinity;
    let nearestPoint = null;
    let nearestWall = null;

    walls.forEach(wall => {
      const point = this.findNearestPointOnLine(
          position,
          wall.start,
          wall.end
      );

      const distance = this.calculateDistance(position, point);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = point;
        nearestWall = wall;
      }
    });

    return { point: nearestPoint, wall: nearestWall };
  }

  /**
   * Find nearest point on a line segment
   * @param {Object} point - Point to check
   * @param {Object} lineStart - Start of line segment
   * @param {Object} lineEnd - End of line segment
   * @returns {Object} Nearest point on line
   */
  findNearestPointOnLine(point, lineStart, lineEnd) {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0)
      param = dot / lenSq;

    let x, y;

    if (param < 0) {
      x = lineStart.x;
      y = lineStart.y;
    } else if (param > 1) {
      x = lineEnd.x;
      y = lineEnd.y;
    } else {
      x = lineStart.x + param * C;
      y = lineStart.y + param * D;
    }

    return { x, y };
  }

  /**
   * Calculate orthogonal path between two points following walls
   * @param {Object} start - Start point
   * @param {Object} end - End point
   * @param {Array} walls - Array of walls
   * @returns {Array} Array of points forming orthogonal path
   */
  calculateOrthogonalPath(start, end, walls) {
    const WALL_OFFSET = 30; // 30cm from wall
    const path = [];
    path.push(start);

    // Find nearest walls for start and end points
    const startWall = this.findNearestWallPoint(start, walls);
    const endWall = this.findNearestWallPoint(end, walls);

    if (startWall.wall && endWall.wall) {
      // If on same wall, follow wall directly
      if (startWall.wall.id === endWall.wall.id) {
        const wallVector = {
          x: startWall.wall.end.x - startWall.wall.start.x,
          y: startWall.wall.end.y - startWall.wall.start.y
        };
        const normalVector = {
          x: -wallVector.y / Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y),
          y: wallVector.x / Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y)
        };

        // Add intermediate points along wall
        const midPoint = {
          x: (start.x + end.x) / 2,
          y: (start.y + end.y) / 2
        };
        path.push({
          x: midPoint.x + normalVector.x * WALL_OFFSET,
          y: midPoint.y + normalVector.y * WALL_OFFSET
        });
      } else {
        // Different walls - create corner path
        const cornerPoint = {
          x: end.x,
          y: start.y
        };
        path.push(cornerPoint);
      }
    }

    path.push(end);
    return path;
  }

  /**
   * Calculate next valid point for ant movement considering active areas
   * @param {Object} current - Current point
   * @param {Object} target - Target point
   * @param {Array} roomPath - Room boundary points
   * @param {Array} walls - Array of walls
   * @returns {Object} Next point in path
   */
  calculateNextPoint(current, target, roomPath, walls) {
    // Calculate inner inactive area
    const inactiveArea = this.calculateInsetPath(roomPath, 50);
    if (!inactiveArea) return target;

    // Calculate orthogonal path
    const path = this.calculateOrthogonalPath(current, target, walls);
    if (path.length <= 1) return target;

    // Check if next point is in active area
    const nextPoint = path[1];
    if (this.isPointInActiveArea(nextPoint, roomPath, inactiveArea)) {
      return nextPoint;
    }

    // If next point is not in active area, try to find a valid point
    // First try moving parallel to walls
    const validPoint = this.findValidPointInActiveArea(current, target, roomPath, inactiveArea, walls);
    if (validPoint) {
      return validPoint;
    }

    // If no valid point found, return current point
    return current;
  }

  /**
   * Check if a point is in the active area
   * @param {Object} point - Point to check
   * @param {Array} roomPath - Room boundary points
   * @param {Array} inactiveArea - Inactive area points
   * @returns {boolean} True if point is in active area
   */
  isPointInActiveArea(point, roomPath, inactiveArea) {
    // Point must be inside room boundary
    if (!this.isPointInPolygon(point, roomPath)) {
      return false;
    }

    // Point must be outside inactive area
    if (this.isPointInPolygon(point, inactiveArea)) {
      return false;
    }

    return true;
  }

  /**
   * Find a valid point in the active area
   * @param {Object} start - Start point
   * @param {Object} end - End point
   * @param {Array} roomPath - Room boundary points
   * @param {Array} inactiveArea - Inactive area points
   * @param {Array} walls - Array of walls
   * @returns {Object|null} Valid point or null if none found
   */
  findValidPointInActiveArea(start, end, roomPath, inactiveArea, walls) {
    // Try points at different angles
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    const distance = 10; // Try points 10cm away

    for (const angle of angles) {
      const radians = angle * Math.PI / 180;
      const testPoint = {
        x: start.x + Math.cos(radians) * distance,
        y: start.y + Math.sin(radians) * distance
      };

      if (this.isPointInActiveArea(testPoint, roomPath, inactiveArea)) {
        // Check if we can reach this point without crossing walls
        const path = this.calculateOrthogonalPath(start, testPoint, walls);
        if (this.isPathValid(path, roomPath, inactiveArea)) {
          return testPoint;
        }
      }
    }

    return null;
  }

  /**
   * Check if a path is valid (stays within active area)
   * @param {Array} path - Array of points forming the path
   * @param {Array} roomPath - Room boundary points
   * @param {Array} inactiveArea - Inactive area points
   * @returns {boolean} True if path is valid
   */
  isPathValid(path, roomPath, inactiveArea) {
    if (!path || path.length < 2) return false;

    // Check each segment of the path
    for (let i = 0; i < path.length - 1; i++) {
      const start = path[i];
      const end = path[i + 1];

      // Check multiple points along the segment
      for (let t = 0; t <= 1; t += 0.1) {
        const point = {
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t
        };

        if (!this.isPointInActiveArea(point, roomPath, inactiveArea)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Calculate probability of moving to next point
   * @param {number} currentIndex - Current point index
   * @param {Array} unvisited - Array of unvisited point indices
   * @param {Object} pheromones - Pheromone levels matrix
   * @param {Array} points - Array of points
   * @returns {Array} Array of probabilities for each unvisited point
   */
  calculateProbabilities(currentIndex, unvisited, pheromones, points) {
    if (!points[currentIndex] || !pheromones[currentIndex]) return [];

    const walls = this.store.state.walls.walls || [];
    const alpha = 1.0; // Pheromone importance
    const beta = 2.0;  // Distance importance

    const probabilities = [];
    let sum = 0;

    unvisited.forEach(nextIndex => {
      if (!points[nextIndex]) return;

      const current = points[currentIndex];
      const target = points[nextIndex];

      // Calculate path following walls
      const path = this.calculateOrthogonalPath(current, target, walls);
      const pathLength = this.calculatePathLength(path.map((p, i) => ({ id: i, position: p })), path);

      if (pathLength === Infinity) return;

      const pheromone = pheromones[currentIndex][nextIndex] || 1.0;
      const probability = Math.pow(pheromone, alpha) * Math.pow(1.0 / pathLength, beta);
      probabilities.push({ index: nextIndex, probability });
      sum += probability;
    });

    if (sum === 0) return [];

    probabilities.forEach(p => p.probability /= sum);
    return probabilities;
  }

  /**
   * Select next point based on probabilities
   * @param {Array} probabilities - Array of probabilities
   * @returns {number} Selected point index
   */
  selectNextPoint(probabilities) {
    const random = Math.random();
    let sum = 0;

    for (const p of probabilities) {
      sum += p.probability;
      if (random <= sum) {
        return p.index;
      }
    }

    return probabilities[probabilities.length - 1].index;
  }

  /**
   * Update pheromone levels
   * @param {Object} pheromones - Pheromone levels matrix
   * @param {Array} paths - Array of paths found by ants
   * @param {Array} points - Array of points
   */
  updatePheromones(pheromones, paths, points) {
    const evaporationRate = 0.1;
    const Q = 1.0; // Pheromone deposit factor

    // Evaporation
    Object.keys(pheromones).forEach(i => {
      Object.keys(pheromones[i]).forEach(j => {
        pheromones[i][j] *= (1 - evaporationRate);
      });
    });

    // Deposit new pheromones
    paths.forEach(path => {
      const pathLength = this.calculatePathLength(path, points);
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        pheromones[from][to] += Q / pathLength;
        pheromones[to][from] += Q / pathLength; // Symmetric update
      }
    });
  }

  /**
   * Calculate total path length
   * @param {Array} path - Array of point indices
   * @param {Array} points - Array of points
   * @returns {number} Total path length
   */
  calculatePathLength(path, points) {
    let length = 0;
    for (let i = 0; i < path.length - 1; i++) {
      length += this.calculateDistance(points[path[i]], points[path[i + 1]]);
    }
    return length;
  }

  /**
   * Find optimal path using Ant Colony Optimization
   * @param {Array} points - Array of points
   * @param {Object} powerSource - Power source position (junction box or panel)
   * @returns {Array} Optimal path as array of point indices
   */
  findOptimalPath(points, powerSource) {
    if (!points || points.length === 0 || !powerSource) return [];

    // Validate all points have valid coordinates
    const validPoints = points.filter(point =>
        point && typeof point.x !== 'undefined' && typeof point.y !== 'undefined'
    );

    if (validPoints.length === 0) return [];
    if (validPoints.length === 1) return [0];

    const numAnts = 10;
    const numIterations = 4;
    let pheromones = this.initializePheromones(validPoints);
    let bestPath = null;
    let bestLength = Infinity;

    // Find closest point to power source
    let endPointIndex = 0;
    let minDistance = Infinity;
    validPoints.forEach((point, index) => {
      const distance = this.calculateDistance(point, powerSource);
      if (distance < minDistance) {
        minDistance = distance;
        endPointIndex = index;
      }
    });

    // If we only have 2 points (including end point), return direct path
    if (validPoints.length === 2) {
      return [1 - endPointIndex, endPointIndex];
    }

    // Main ACO loop
    for (let iter = 0; iter < numIterations; iter++) {
      const paths = [];

      // Each ant finds a path
      for (let ant = 0; ant < numAnts; ant++) {
        const unvisited = validPoints.map((_, index) => index).filter(i => i !== endPointIndex);
        if (unvisited.length === 0) continue;

        const path = [unvisited[Math.floor(Math.random() * unvisited.length)]];

        // Build path
        while (unvisited.length > 0) {
          const currentIndex = path[path.length - 1];
          if (typeof currentIndex === 'undefined') break;

          const probabilities = this.calculateProbabilities(currentIndex, unvisited, pheromones, validPoints);
          if (probabilities.length === 0) break;

          const nextIndex = this.selectNextPoint(probabilities);
          if (typeof nextIndex === 'undefined') break;

          path.push(nextIndex);
          const index = unvisited.indexOf(nextIndex);
          if (index > -1) {
            unvisited.splice(index, 1);
          }
        }

        // Add end point
        path.push(endPointIndex);
        paths.push(path);

        // Update best path
        const pathLength = this.calculatePathLength(path, validPoints);
        if (pathLength < bestLength) {
          bestLength = pathLength;
          bestPath = [...path];
        }
      }

      // Update pheromone levels
      this.updatePheromones(pheromones, paths, validPoints);
    }

    return bestPath || [];
  }

  /**
   * Find optimal circuit path visiting all points within active area
   * @param {Array} points - Array of points to visit
   * @param {Object} powerSource - Power source position
   * @param {Array} walls - Array of walls
   * @param {Array} roomPath - Room boundary points
   * @returns {Array} Optimal path as array of point indices
   */
  findOptimalCircuitPath(points, powerSource, walls, roomPath) {
    if (!points || points.length === 0 || !powerSource || !roomPath) return [];

    // Calculate inactive area
    const inactiveArea = this.calculateInsetPath(roomPath, 50);
    if (!inactiveArea) return [];

    // Validate all points have valid coordinates
    const validPoints = points.filter(point =>
        point && typeof point.x !== 'undefined' && typeof point.y !== 'undefined' &&
        this.isPointInActiveArea(point, roomPath, inactiveArea)
    );

    if (validPoints.length === 0) return [];
    if (validPoints.length === 1) return [0];

    const numAnts = 10;
    const numIterations = 4;
    let pheromones = this.initializePheromones(validPoints);
    let bestPath = null;
    let bestLength = Infinity;

    // Find farthest point from power source to start
    let startPointIndex = 0;
    let maxDistance = -Infinity;
    validPoints.forEach((point, index) => {
      const distance = this.calculateDistance(point, powerSource);
      if (distance > maxDistance) {
        maxDistance = distance;
        startPointIndex = index;
      }
    });

    // Main ACO loop
    for (let iter = 0; iter < numIterations; iter++) {
      const paths = [];

      // Each ant finds a path
      for (let ant = 0; ant < numAnts; ant++) {
        // Start from the farthest point
        const path = [startPointIndex];
        const unvisited = validPoints.map((_, index) => index)
            .filter(i => i !== startPointIndex);

        // Build path visiting all points
        while (unvisited.length > 0) {
          const currentIndex = path[path.length - 1];
          if (typeof currentIndex === 'undefined') break;

          const probabilities = this.calculateProbabilities(currentIndex, unvisited, pheromones, validPoints, roomPath, inactiveArea, walls);
          if (probabilities.length === 0) break;

          const nextIndex = this.selectNextPoint(probabilities);
          if (typeof nextIndex === 'undefined') break;

          path.push(nextIndex);
          const index = unvisited.indexOf(nextIndex);
          if (index > -1) {
            unvisited.splice(index, 1);
          }
        }

        paths.push(path);

        // Calculate total path length including connections between points
        const pathLength = this.calculateTotalCircuitLength(path, validPoints, walls, roomPath, inactiveArea);
        if (pathLength < bestLength && this.isCircuitPathValid(path, validPoints, roomPath, inactiveArea)) {
          bestLength = pathLength;
          bestPath = [...path];
        }
      }

      // Update pheromone levels
      this.updatePheromones(pheromones, paths, validPoints);
    }

    return bestPath || [];
  }

  /**
   * Check if a circuit path is valid (stays within active area)
   * @param {Array} path - Array of point indices
   * @param {Array} points - Array of actual points
   * @param {Array} roomPath - Room boundary points
   * @param {Array} inactiveArea - Inactive area points
   * @returns {boolean} True if path is valid
   */
  isCircuitPathValid(path, points, roomPath, inactiveArea) {
    if (!path || path.length < 2) return false;

    // Check each segment of the circuit
    for (let i = 0; i < path.length - 1; i++) {
      const start = points[path[i]];
      const end = points[path[i + 1]];

      // Calculate orthogonal path for this segment
      const segmentPath = this.calculateOrthogonalPath(start, end, walls);

      // Check if segment path is valid
      if (!this.isPathValid(segmentPath, roomPath, inactiveArea)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate total length of circuit path including orthogonal connections
   * @param {Array} path - Array of point indices
   * @param {Array} points - Array of points
   * @param {Array} walls - Array of walls
   * @returns {number} Total path length
   */
  calculateTotalCircuitLength(path, points, walls) {
    let totalLength = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const start = points[path[i]];
      const end = points[path[i + 1]];

      if (!start || !end) continue;

      const orthogonalPath = this.calculateOrthogonalPath(start, end, walls);
      for (let j = 0; j < orthogonalPath.length - 1; j++) {
        totalLength += this.calculateDistance(orthogonalPath[j], orthogonalPath[j + 1]);
      }
    }

    return totalLength;
  }

  /**
   * Find optimal path for socket connections within a room
   * @param {Array} socketPoints - Array of socket points in the room
   * @param {Object} powerSource - Power source position (junction box or outermost socket)
   * @param {Array} walls - Array of walls
   * @param {Array} roomPath - Room boundary points
   * @returns {Array} Array of points forming the optimal path
   */
  findRoomSocketPath(socketPoints, powerSource, walls, roomPath) {
    if (!socketPoints || socketPoints.length === 0 || !powerSource || !roomPath) return [];

    // Start with power source
    const path = [powerSource];
    let remainingPoints = [...socketPoints];

    // Find nearest points one by one
    while (remainingPoints.length > 0) {
      const currentPoint = path[path.length - 1];
      let nearestPoint = null;
      let minDistance = Infinity;
      let nearestIndex = -1;

      // Find the nearest unvisited point
      remainingPoints.forEach((point, index) => {
        const distance = this.calculateDistance(currentPoint, point);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = point;
          nearestIndex = index;
        }
      });

      if (nearestPoint) {
        path.push(nearestPoint);
        remainingPoints.splice(nearestIndex, 1);
      }
    }

    return path;
  }

  /**
   * Draw socket points and their connections
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} transform - Canvas transform object
   */
  drawSocketPoints(ctx, transform) {
    if (!this.store.state.project.isRoutingActive) return;

    const sockets = this.store.state.sockets.sockets || [];
    const walls = this.store.state.walls.walls || [];
    const rooms = this.store.state.rooms.rooms || [];
    const panel = this.getElectricalPanelPosition();
    if (!panel) return;

    ctx.save();
    ctx.translate(transform.panOffset.x, transform.panOffset.y);
    ctx.scale(transform.zoom, transform.zoom);

    // Find panel room
    const panelRoom = rooms.find(room => this.isPointInPolygon(panel, room.path));

    // Get panel connection points
    const panelPoints = this.calculatePanelConnectionPoints();

    // Group sockets by room and type
    const socketGroups = this.groupSocketsByRoom(sockets, walls);

    // Process each room
    socketGroups.forEach((group, roomId) => {
      const isInPanelRoom = panelRoom && roomId === panelRoom.id;
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;

      const powerSource = this.getPowerSourcePosition(roomId);
      if (!powerSource) return;

      // Find junction box for this room
      const junctionBox = this.distributionBoxes.find(box => box.roomId === roomId);

      // Handle regular sockets - create a single continuous path
      if (group.regular.length > 0) {
        if (isInPanelRoom) {
          // Sort sockets by distance to panel to minimize cable crossing
          const sortedSockets = group.regular.sort((a, b) => {
            const distA = this.calculateDistance(a.position, panel);
            const distB = this.calculateDistance(b.position, panel);
            return distA - distB; // Sort by ascending distance
          });

          sortedSockets.forEach(socket => {
            const connectionId = `socket-${socket.id}`;
            // In panel room, socket points are 27cm from wall
            const point = this.calculatePointPosition(socket, walls, 27);
            if (!point) return;

            const panelPoint = this.findOptimalPanelPoint(point, panelPoints, connectionId);
            if (!panelPoint) return;

            // Draw connection
            this.drawSocketConnection(ctx, socket, point, panelPoint, transform, '#0000FF', walls);
          });
        } else {
          // For regular sockets in other rooms, create continuous path through active area
          const socketClusters = this.groupSocketsByProximity(group.regular, walls);

          // Find junction box for this room
          const junctionBox = this.distributionBoxes.find(box => box.roomId === roomId);
          const powerSource = this.getPowerSourcePosition(roomId);
          if (!powerSource) return;

          // Calculate cluster centers and their connection points
          const clusterPoints = socketClusters.map(cluster => {
            const avgX = cluster.reduce((sum, s) => sum + s.position.x, 0) / cluster.length;
            const avgY = cluster.reduce((sum, s) => sum + s.position.y, 0) / cluster.length;

            const referenceSocket = cluster[0];
            const wall = walls.find(w => w.id === referenceSocket.wall);
            if (!wall) return null;

            const point = this.calculatePointPosition(
                { ...referenceSocket, position: { x: avgX, y: avgY, side: referenceSocket.position.side } },
                walls,
                25
            );

            if (!point) return null;

            return {
              point,
              sockets: cluster,
              center: { x: avgX, y: avgY }
            };
          }).filter(cp => cp !== null);

          if (clusterPoints.length > 0) {
            // Determine start point (junction box or closest cluster to panel)
            let startPoint;
            if (junctionBox) {
              startPoint = junctionBox.position;
            } else {
              let minDistance = Infinity;
              let closestPoint = null;
              clusterPoints.forEach(cp => {
                const distance = this.calculateDistance(cp.point, powerSource);
                if (distance < minDistance) {
                  minDistance = distance;
                  closestPoint = cp.point;
                }
              });
              startPoint = closestPoint;
            }

            if (startPoint) {
              // Find path through all cluster points
              const orderedPoints = this.findRoomSocketPath(
                  clusterPoints.map(cp => cp.point).filter(p => p !== startPoint),
                  startPoint,
                  walls,
                  room.path
              );

              if (orderedPoints.length > 0) {
                // Draw the continuous path through active area
                ctx.beginPath();
                ctx.moveTo(startPoint.x, startPoint.y);

                let currentPoint = startPoint;
                for (let i = 0; i < orderedPoints.length; i++) {
                  const nextPoint = orderedPoints[i];
                  const pathSegment = this.findValidPath(currentPoint, nextPoint, room.path);

                  if (pathSegment && pathSegment.length > 0) {
                    pathSegment.forEach((point, index) => {
                      if (index === 0) return;
                      ctx.lineTo(point.x, point.y);
                    });
                  }
                  currentPoint = nextPoint;
                }

                ctx.strokeStyle = '#0000FF';
                ctx.lineWidth = 2 / transform.zoom;
                ctx.stroke();

                // Draw cluster connections
                clusterPoints.forEach(cp => {
                  ctx.beginPath();
                  ctx.arc(cp.point.x, cp.point.y, 3 / transform.zoom, 0, Math.PI * 2);
                  ctx.fillStyle = '#0000FF';
                  ctx.fill();

                  ctx.beginPath();
                  ctx.moveTo(cp.point.x, cp.point.y);
                  ctx.lineTo(cp.center.x, cp.center.y);
                  ctx.strokeStyle = '#0000FF';
                  ctx.lineWidth = 1 / transform.zoom;
                  ctx.stroke();
                });
              }
            }
          }
        }
      }

      // Handle powerful and high-power sockets
      if (group.highPower.length > 0) {
        // Sort high-power sockets by distance from panel
        const sortedHighPowerSockets = group.highPower
            .filter(s => s.deviceType === 'high-power')
            .sort((a, b) => {
              const distA = this.calculateDistance(a.position, powerSource);
              const distB = this.calculateDistance(b.position, powerSource);
              return distB - distA;
            });

        sortedHighPowerSockets.forEach((socket, index) => {
          const connectionId = `high-power-${socket.id}`;
          const distance = isInPanelRoom ? 27 : (27 - (index * 3));
          const point = this.calculatePointPosition(socket, walls, distance);
          if (!point) return;

          const panelPoint = this.findOptimalPanelPoint(point, panelPoints, connectionId);
          if (!panelPoint) return;

          this.drawSocketConnection(ctx, socket, point, panelPoint, transform, '#FF0000', walls);
        });

        // Handle powerful sockets
        const powerfulSockets = group.highPower.filter(s => s.deviceType === 'powerful');
        powerfulSockets.forEach(socket => {
          const connectionId = `powerful-${socket.id}`;
          const distance = isInPanelRoom ? 27 : 21;
          const point = this.calculatePointPosition(socket, walls, distance);
          if (!point) return;

          const panelPoint = this.findOptimalPanelPoint(point, panelPoints, connectionId);
          if (!panelPoint) return;

          this.drawSocketConnection(ctx, socket, point, panelPoint, transform, '#0000FF', walls);
        });
      }
    });

    ctx.restore();
  }

  /**
   * Draw a socket connection including the socket point and path to panel
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} socket - Socket object
   * @param {Object} point - Connection point
   * @param {Object} panelPoint - Panel connection point
   * @param {Object} transform - Transform object
   * @param {string} color - Color for the connection
   * @param {Array} walls - Array of walls
   */
  drawSocketConnection(ctx, socket, point, panelPoint, transform, color, walls) {
    // Draw line from socket to point
    ctx.beginPath();
    ctx.moveTo(socket.position.x, socket.position.y);
    ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 / transform.zoom;
    ctx.stroke();

    // Draw connection point
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3 / transform.zoom, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Draw path to panel point
    const pathToPanel = this.calculateOrthogonalPath(point, panelPoint, walls);
    ctx.beginPath();
    ctx.moveTo(pathToPanel[0].x, pathToPanel[0].y);
    pathToPanel.forEach((pathPoint, i) => {
      if (i === 0) return;
      ctx.lineTo(pathPoint.x, pathPoint.y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 / transform.zoom;
    ctx.stroke();
  }

  /**
   * Find a valid path between two points that stays within room and active area
   * @param {Object} start - Start point
   * @param {Object} end - End point
   * @param {Array} roomPath - Room boundary points
   * @returns {Array} Array of points forming the path
   */
  findValidPath(start, end, roomPath) {
    // Calculate inner inactive area
    const inactiveArea = this.calculateInsetPath(roomPath, 50);
    if (!inactiveArea) return null;

    // Try direct orthogonal path first
    const directPath = this.calculateOrthogonalPath(start, end, []);
    if (this.isPathValid(directPath, roomPath, inactiveArea)) {
      return directPath;
    }

    // If direct path is invalid, try finding a path through valid intermediate points
    const midPoints = [];

    // Try points parallel to walls in active area
    const tryPoints = [
      { x: start.x, y: end.y },
      { x: end.x, y: start.y }
    ];

    // Add additional points if needed
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const step = 20; // 20cm steps

    for (let t = 0.2; t <= 0.8; t += 0.2) {
      tryPoints.push({
        x: start.x + dx * t,
        y: start.y + dy * t
      });
    }

    // Find valid intermediate points
    for (const point of tryPoints) {
      if (this.isPointInActiveArea(point, roomPath, inactiveArea)) {
        midPoints.push(point);
      }
    }

    // Try paths through each valid intermediate point
    for (const mid of midPoints) {
      const path1 = this.calculateOrthogonalPath(start, mid, []);
      const path2 = this.calculateOrthogonalPath(mid, end, []);

      if (this.isPathValid(path1, roomPath, inactiveArea) &&
          this.isPathValid(path2, roomPath, inactiveArea)) {
        // Combine paths
        return [...path1.slice(0, -1), ...path2];
      }
    }

    // If no valid path found, return null
    return null;
  }

  /**
   * Find the closest point to the electrical panel
   * @param {Array} points - Array of points to check
   * @param {Object} panelPos - Panel position
   * @returns {Object} Closest point to panel
   */
  findClosestPointToPanel(points, panelPos) {
    if (!points || points.length === 0) return null;

    let closestPoint = points[0];
    let minDistance = this.calculateDistance(points[0], panelPos);

    points.forEach(point => {
      const distance = this.calculateDistance(point, panelPos);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    });

    return closestPoint;
  }

  /**
   * Order points to follow room perimeter
   * @param {Array} points - Points to order
   * @param {Array} roomPath - Room boundary points
   * @param {Array} walls - Array of walls
   * @returns {Array} Ordered points following room perimeter
   */
  orderPointsAlongRoomPerimeter(points, roomPath, walls) {
    if (!points || points.length === 0) return [];

    const ordered = [points[0]]; // Start with the first point (junction box or closest to panel)
    const remaining = points.slice(1);

    while (remaining.length > 0) {
      const lastPoint = ordered[ordered.length - 1];
      let nextPoint = null;
      let minPerimeterDistance = Infinity;
      let nextPointIndex = -1;

      // Find the next closest point following the room perimeter
      remaining.forEach((point, index) => {
        const perimeterDist = this.calculatePerimeterDistance(lastPoint, point, roomPath, walls);
        if (perimeterDist < minPerimeterDistance) {
          minPerimeterDistance = perimeterDist;
          nextPoint = point;
          nextPointIndex = index;
        }
      });

      if (nextPoint) {
        ordered.push(nextPoint);
        remaining.splice(nextPointIndex, 1);
      }
    }

    return ordered;
  }

  /**
   * Calculate path following room perimeter
   * @param {Object} start - Start point
   * @param {Object} end - End point
   * @param {Array} roomPath - Room boundary points
   * @param {Array} walls - Array of walls
   * @returns {Array} Path points following perimeter
   */
  calculatePerimeterPath(start, end, roomPath, walls) {
    const path = [];
    path.push(start);

    // Find nearest wall points for start and end
    const startWallPoint = this.findNearestWallPoint(start, walls);
    const endWallPoint = this.findNearestWallPoint(end, walls);

    if (startWallPoint.wall && endWallPoint.wall) {
      // If on same wall, follow wall directly
      if (startWallPoint.wall.id === endWallPoint.wall.id) {
        path.push(end);
      } else {
        // Follow room perimeter from start wall to end wall
        const perimeterPoints = this.findPerimeterPoints(
            startWallPoint.point,
            endWallPoint.point,
            roomPath
        );
        path.push(...perimeterPoints);
      }
    }

    path.push(end);
    return path;
  }

  /**
   * Find points along room perimeter between two points
   * @param {Object} start - Start point
   * @param {Object} end - End point
   * @param {Array} roomPath - Room boundary points
   * @returns {Array} Points along perimeter
   */
  findPerimeterPoints(start, end, roomPath) {
    const points = [];
    let startIndex = -1;
    let endIndex = -1;

    // Find indices of nearest perimeter points
    roomPath.forEach((point, index) => {
      if (this.calculateDistance(point, start) < 0.1) startIndex = index;
      if (this.calculateDistance(point, end) < 0.1) endIndex = index;
    });

    if (startIndex === -1 || endIndex === -1) return points;

    // Collect points along perimeter
    let currentIndex = startIndex;
    while (currentIndex !== endIndex) {
      points.push(roomPath[currentIndex]);
      currentIndex = (currentIndex + 1) % roomPath.length;
    }
    points.push(roomPath[endIndex]);

    return points;
  }

  /**
   * Calculate distance between points following room perimeter
   * @param {Object} start - Start point
   * @param {Object} end - End point
   * @param {Array} roomPath - Room boundary points
   * @param {Array} walls - Array of walls
   * @returns {number} Distance along perimeter
   */
  calculatePerimeterDistance(start, end, roomPath, walls) {
    const path = this.calculatePerimeterPath(start, end, roomPath, walls);
    let distance = 0;

    for (let i = 0; i < path.length - 1; i++) {
      distance += this.calculateDistance(path[i], path[i + 1]);
    }

    return distance;
  }

  /**
   * Calculate the central position among all sockets in a group
   * @param {Array} cluster - Array of sockets in the cluster
   * @returns {Object|null} Center position {x, y} or null if cluster is empty
   */
  calculateGroupCenter(cluster) {
    if (cluster.length === 0) return null;

    // Calculate average position of all sockets in the cluster
    const avgX = cluster.reduce((sum, socket) => sum + socket.position.x, 0) / cluster.length;
    const avgY = cluster.reduce((sum, socket) => sum + socket.position.y, 0) / cluster.length;

    return { x: avgX, y: avgY };
  }

  /**
   * Calculate the center point for a cluster of sockets
   * @param {Array} cluster - Array of sockets in the cluster
   * @param {Array} walls - Array of walls
   * @returns {Object|null} Center point position or null if invalid
   */
  calculateClusterCenter(cluster, walls) {
    if (cluster.length === 0) return null;

    // Calculate average position of all sockets in the cluster
    const avgX = cluster.reduce((sum, socket) => sum + socket.position.x, 0) / cluster.length;
    const avgY = cluster.reduce((sum, socket) => sum + socket.position.y, 0) / cluster.length;

    // Use the first socket's wall and side for the center point calculation
    const firstSocket = cluster[0];
    return this.calculatePointPosition(
        { ...firstSocket, position: { ...firstSocket.position, x: avgX, y: avgY } },
        walls,
        30 // Standard 30cm distance for regular sockets
    );
  }

  /**
   * Calculate the connection point position above a socket
   * @param {Object} socket - Socket object with position and rotation
   * @param {Array} walls - Array of wall objects
   * @param {number} distance - Distance from wall in mm
   * @returns {Object} Connection point position
   */
  calculateConnectionPoint(socket, walls, distance) {
    // Find the wall the socket is mounted on
    const wall = walls.find(w => w.id === socket.wall);
    if (!wall) return socket.position;

    // Calculate wall direction vector
    const wallVector = {
      x: wall.end.x - wall.start.x,
      y: wall.end.y - wall.start.y
    };

    // Normalize wall vector
    const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);
    const normalizedWall = {
      x: wallVector.x / wallLength,
      y: wallVector.y / wallLength
    };

    // Calculate normal vector (perpendicular to wall, pointing into room)
    // The normal direction depends on the socket's side and wall orientation
    let normalVector = {
      x: -normalizedWall.y,
      y: -normalizedWall.x
    };

    // Adjust normal direction based on socket side
    if (socket.position.side === 'right') {
      normalVector.x = -normalVector.x;
      normalVector.y = -normalVector.y;
    }

    // Calculate the connection point position
    return {
      x: socket.position.x + normalVector.x * distance,
      y: socket.position.y + normalVector.y * distance
    };
  }

  /**
   * Draw connection points above sockets
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} transform - Canvas transform object
   */
  drawSocketConnectionPoints(ctx, transform) {
    if (!this.store.state.project.isRoutingActive) return;

    const sockets = this.store.state.sockets.sockets || [];
    const walls = this.store.state.walls.walls || [];

    ctx.save();
    ctx.translate(transform.panOffset.x, transform.panOffset.y);
    ctx.scale(transform.zoom, transform.zoom);

    // Group sockets by room
    const socketsByRoom = new Map();
    sockets.forEach(socket => {
      const wall = walls.find(w => w.id === socket.wall);
      if (!wall) return;

      const room = this.findRoomContainingWall(wall);
      if (room) {
        if (!socketsByRoom.has(room.id)) {
          socketsByRoom.set(room.id, []);
        }
        socketsByRoom.get(room.id).push(socket);
      }
    });

    // Process each room's sockets
    socketsByRoom.forEach((roomSockets, roomId) => {
      // Find the box in the room or use panel if no box
      const box = this.distributionBoxes.find(b => b.roomId === roomId);
      const targetPoint = box ? box.position : this.getElectricalPanelPosition();
      if (!targetPoint) return;

      // Separate sockets by type
      const regularSockets = roomSockets.filter(s => s.deviceType === 'regular');
      const powerfulSockets = roomSockets.filter(s => s.deviceType === 'powerful' || s.deviceType === 'high-power')
          .sort((a, b) => this.calculateWallDistance(a.position, targetPoint) - this.calculateWallDistance(b.position, targetPoint));

      // Draw points for regular sockets
      regularSockets.forEach(socket => {
        const point = this.calculateConnectionPoint(socket, walls, 300); // 30cm = 300mm
        this.drawPoint(ctx, point, '#0000FF', transform);
      });

      // Draw points for powerful/high-power sockets with decreasing distances
      powerfulSockets.forEach((socket, index) => {
        const distance = 270 - (index * 30); // Start at 27cm and decrease by 3cm
        const point = this.calculateConnectionPoint(socket, walls, distance);
        this.drawPoint(ctx, point, '#FF0000', transform);
      });
    });

    ctx.restore();
  }

  /**
   * Draw a single connection point
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} point - Point position {x, y}
   * @param {string} color - Point color
   * @param {Object} transform - Canvas transform object
   */
  drawPoint(ctx, point, color, transform) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3 / transform.zoom, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  /**
   * Find the room that contains a wall
   * @param {Object} wall - Wall object
   * @returns {Object|null} Room object or null if not found
   */
  findRoomContainingWall(wall) {
    const rooms = this.store.state.rooms.rooms || [];
    return rooms.find(room => {
      const points = room.path;
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        if (
            (points[i].x === wall.start.x && points[i].y === wall.start.y &&
                points[j].x === wall.end.x && points[j].y === wall.end.y) ||
            (points[i].x === wall.end.x && points[i].y === wall.end.y &&
                points[j].x === wall.start.x && points[j].y === wall.start.y)
        ) {
          return true;
        }
      }
      return false;
    });
  }

  /**
   * Calculate the distance between a socket and a target point along the walls
   * @param {Object} socketPosition - Socket position
   * @param {Object} targetPoint - Target point (box or panel)
   * @returns {number} Distance along walls
   */
  calculateWallDistance(socketPosition, targetPoint) {
    return Math.abs(socketPosition.x - targetPoint.x) + Math.abs(socketPosition.y - targetPoint.y);
  }

  /**
   * Calculate connection points for the electrical panel
   * @returns {Array} Array of connection point positions
   */
  calculatePanelConnectionPoints() {
    const panel = this.getElectricalPanelPosition();
    if (!panel) return [];

    const rooms = this.store.state.rooms.rooms || [];
    const walls = this.store.state.walls.walls || [];
    const sockets = this.store.state.sockets.sockets || [];
    const switches = this.store.state.switches.switches || [];
    const lights = this.store.state.lights.lights || [];

    // Find the wall the panel is mounted on
    const panelWall = this.findPanelWall(panel);
    if (!panelWall) return [];

    // Find which room contains the panel
    const panelRoom = rooms.find(room => this.isPointInPolygon(panel, room.path));
    if (!panelRoom) return [];

    let totalPins = 0;

    // Process each room to count needed pins
    rooms.forEach(room => {
      if (room.id === panelRoom.id) {
        // For panel room, count all sockets and switches directly
        const roomSockets = sockets.filter(socket => {
          const wall = walls.find(w => w.id === socket.wall);
          return wall && this.isPointInPolygon(socket.position, room.path);
        });

        const roomSwitches = switches.filter(sw => {
          const wall = walls.find(w => w.id === sw.wall);
          return wall && this.isPointInPolygon(sw.position, room.path);
        });

        // Only count switches that control lights
        const activeSwitches = roomSwitches.filter(sw => this.doesSwitchControlAnything(sw));

        // Add pins for regular sockets
        if (roomSockets.some(s => s.deviceType !== 'powerful' && s.deviceType !== 'high-power')) {
          totalPins++;
        }

        // Add pins for powerful/high-power sockets
        totalPins += roomSockets.filter(s => s.deviceType === 'powerful' || s.deviceType === 'high-power').length;

        // Add pins for active switches
        totalPins += activeSwitches.length;
      } else {
        // For other rooms
        const roomSockets = sockets.filter(socket => {
          const wall = walls.find(w => w.id === socket.wall);
          return wall && this.isPointInPolygon(socket.position, room.path);
        });

        const roomSwitches = switches.filter(sw => {
          const wall = walls.find(w => w.id === sw.wall);
          return wall && this.isPointInPolygon(sw.position, room.path);
        });

        const hasRegularSockets = roomSockets.some(s => s.deviceType !== 'powerful' && s.deviceType !== 'high-power');
        const hasPowerfulSockets = roomSockets.some(s => s.deviceType === 'powerful' || s.deviceType === 'high-power');
        const hasActiveSwitches = roomSwitches.some(sw => this.doesSwitchControlAnything(sw));

        // Add pin for regular sockets if present
        if (hasRegularSockets) {
          totalPins++;
        }

        // Add pins for powerful/high-power sockets
        totalPins += roomSockets.filter(s => s.deviceType === 'powerful' || s.deviceType === 'high-power').length;

        // Add pin for junction box if room has active switches
        if (hasActiveSwitches) {
          const hasJunctionBox = this.distributionBoxes.some(box => box.roomId === room.id);
          if (hasJunctionBox || roomSwitches.length === 1) {
            totalPins++;
          }
        }
      }
    });

    if (totalPins === 0) return [];

    // Calculate points positions
    const wallVector = {
      x: panelWall.end.x - panelWall.start.x,
      y: panelWall.end.y - panelWall.start.y
    };
    const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);

    // Normalize wall vector
    const normalizedWall = {
      x: wallVector.x / wallLength,
      y: wallVector.y / wallLength
    };

    // Calculate normal vector (perpendicular to wall)
    const normalVector = {
      x: -normalizedWall.y,
      y: normalizedWall.x
    };

    // Check if normal vector points inside the room
    const testPoint = {
      x: panel.x + normalVector.x * 10,
      y: panel.y + normalVector.y * 10
    };

    // If test point is outside the room, reverse the normal vector
    if (!this.isPointInPolygon(testPoint, panelRoom.path)) {
      normalVector.x = -normalVector.x;
      normalVector.y = -normalVector.y;
    }

    // Get panel width from store (in mm, convert to cm)
    const panelWidth = (this.store.state.panels?.defaultWidth || 300) / 10;

    // Calculate spacing between points
    const spacing = panelWidth / (totalPins + 1);

    // Calculate start position (left edge of panel)
    const startPos = {
      x: panel.x - (normalizedWall.x * panelWidth / 2),
      y: panel.y - (normalizedWall.y * panelWidth / 2)
    };

    // Generate evenly spaced points
    const points = [];
    for (let i = 1; i <= totalPins; i++) {
      // Calculate position along panel width
      const distance = spacing * i;
      const point = {
        x: startPos.x + (normalizedWall.x * distance) + (normalVector.x * 10),
        y: startPos.y + (normalizedWall.y * distance) + (normalVector.y * 10),
        isUsed: false
      };
      points.push(point);
    }

    return points;
  }

  /**
   * Find the wall that the panel is mounted on
   * @param {Object} panel - Panel position
   * @returns {Object|null} Wall object or null if not found
   */
  findPanelWall(panel) {
    const walls = this.store.state.walls.walls || [];
    let closestWall = null;
    let minDistance = Infinity;

    walls.forEach(wall => {
      const distance = this.distanceToLine(panel, wall.start, wall.end);
      if (distance < minDistance) {
        minDistance = distance;
        closestWall = wall;
      }
    });

    return closestWall;
  }

  /**
   * Find intersection point of two lines
   * @param {Object} p1 - Start point of first line
   * @param {Object} p2 - End point of first line
   * @param {Object} p3 - Start point of second line
   * @param {Object} p4 - End point of second line
   * @returns {Object|null} Intersection point or null if lines are parallel
   */
  findLineIntersection(p1, p2, p3, p4) {
    const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

    if (denominator === 0) {
      return null;
    }

    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;

    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y)
    };
  }

  /**
   * Draw connection points for the electrical panel
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} transform - Canvas transform object
   */
  drawPanelPoints(ctx, transform) {
    const panelPoints = this.calculatePanelConnectionPoints();
    if (!panelPoints.length) return;

    ctx.save();
    ctx.translate(transform.panOffset.x, transform.panOffset.y);
    ctx.scale(transform.zoom, transform.zoom);

    // Draw all panel points in blue
    panelPoints.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3 / transform.zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#2196F3';
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * Check if two paths intersect
   * @param {Array} path1 - First path as array of points
   * @param {Array} path2 - Second path as array of points
   * @returns {boolean} True if paths intersect
   */
  doPathsIntersect(path1, path2) {
    // Check each segment of path1 against each segment of path2
    for (let i = 0; i < path1.length - 1; i++) {
      const line1Start = path1[i];
      const line1End = path1[i + 1];

      for (let j = 0; j < path2.length - 1; j++) {
        const line2Start = path2[j];
        const line2End = path2[j + 1];

        // Check if these line segments intersect
        const intersection = this.findLineIntersection(
            line1Start, line1End,
            line2Start, line2End
        );

        if (intersection &&
            this.isPointOnLineSegment(intersection, line1Start, line1End) &&
            this.isPointOnLineSegment(intersection, line2Start, line2End)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if a point lies on a line segment
   * @param {Object} point - Point to check
   * @param {Object} lineStart - Start of line segment
   * @param {Object} lineEnd - End of line segment
   * @returns {boolean} True if point lies on line segment
   */
  isPointOnLineSegment(point, lineStart, lineEnd) {
    const d1 = this.calculateDistance(point, lineStart);
    const d2 = this.calculateDistance(point, lineEnd);
    const lineLen = this.calculateDistance(lineStart, lineEnd);
    const buffer = 0.1; // Small buffer for floating point precision

    return Math.abs(d1 + d2 - lineLen) < buffer;
  }

  /**
   * Calculate optimal panel point assignment to minimize cable crossing
   * @param {Object} source - Source point of the cable
   * @param {Array} panelPoints - Available panel points
   * @param {string} connectionId - Unique identifier for the connection
   * @returns {Object|null} Best panel point to use
   */
  findOptimalPanelPoint(source, panelPoints, connectionId) {
    // First check if this connection already has an assigned point
    for (const [pointIndex, usedById] of this.usedPanelPoints.entries()) {
      if (usedById === connectionId) {
        return panelPoints[pointIndex];
      }
    }

    let bestPoint = null;
    let bestScore = Infinity;

    // Try each available panel point
    for (let i = 0; i < panelPoints.length; i++) {
      if (this.usedPanelPoints.has(i)) continue;

      const point = panelPoints[i];
      let score = 0;

      // Calculate base score based on distance and angle
      score += this.calculateDistance(source, point);

      // Check crossing with existing cables
      for (const [usedIndex, _] of this.usedPanelPoints.entries()) {
        const usedPoint = panelPoints[usedIndex];
        if (this.wouldCableCross(source, point, usedPoint)) {
          score += 1000; // Heavy penalty for crossing
        }
      }

      if (score < bestScore) {
        bestScore = score;
        bestPoint = point;
      }
    }

    // If we found a point, mark it as used
    if (bestPoint) {
      const index = panelPoints.indexOf(bestPoint);
      this.usedPanelPoints.set(index, connectionId);
    }

    return bestPoint;
  }

  /**
   * Check if a new cable would cross with an existing one
   * @param {Object} source - Source point of new cable
   * @param {Object} target - Target panel point of new cable
   * @param {Object} existingPoint - Existing panel point
   * @returns {boolean} True if cables would cross
   */
  wouldCableCross(source, target, existingPoint) {
    // Simple bounding box check first
    const box1 = {
      minX: Math.min(source.x, target.x),
      maxX: Math.max(source.x, target.x),
      minY: Math.min(source.y, target.y),
      maxY: Math.max(source.y, target.y)
    };

    const box2 = {
      minX: Math.min(existingPoint.x, target.x),
      maxX: Math.max(existingPoint.x, target.x),
      minY: Math.min(existingPoint.y, target.y),
      maxY: Math.max(existingPoint.y, target.y)
    };

    // If bounding boxes don't intersect, cables can't cross
    if (box1.maxX < box2.minX || box1.minX > box2.maxX ||
        box1.maxY < box2.minY || box1.minY > box2.maxY) {
      return false;
    }

    // Check actual line intersection
    return this.doPathsIntersect(
        [source, target],
        [existingPoint, target]
    );
  }

  /**
   * Draw connection points for switches
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} transform - Canvas transform object
   */
  drawSwitchPoints(ctx, transform) {
    if (!this.store.state.project.isRoutingActive) return;

    const switches = this.store.state.switches.switches || [];
    const walls = this.store.state.walls.walls || [];

    ctx.save();
    ctx.translate(transform.panOffset.x, transform.panOffset.y);
    ctx.scale(transform.zoom, transform.zoom);

    // Process each switch
    switches.forEach(switchObj => {
      // Find the wall the switch is mounted on
      const wall = walls.find(w => w.id === switchObj.wall);
      if (!wall) return;

      // Calculate connection point 20cm from wall
      const point = this.calculatePointPosition(switchObj, walls, 20);
      if (!point) return;

      // Draw connection point
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3 / transform.zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD700'; // Changed from red to yellow
      ctx.fill();

      // Draw line from switch to connection point
      ctx.beginPath();
      ctx.moveTo(switchObj.position.x, switchObj.position.y);
      ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = '#FFD700'; // Changed from red to yellow
      ctx.lineWidth = 1 / transform.zoom;
      ctx.stroke();
    });

    ctx.restore();
  }

  /**
   * Draw connection points for lights (both wall and ceiling)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} transform - Canvas transform object
   */
  drawLightPoints(ctx, transform) {
    if (!this.store.state.project.isRoutingActive) return;

    const wallLights = this.store.getters['lights/getAllWallLights'] || [];
    const ceilingLights = this.store.getters['lights/getAllCeilingLights'] || [];
    const walls = this.store.state.walls.walls || [];

    ctx.save();
    ctx.translate(transform.panOffset.x, transform.panOffset.y);
    ctx.scale(transform.zoom, transform.zoom);

    // Draw wall light points
    wallLights.forEach(light => {
      const wall = walls.find(w => w.id === light.wall);
      if (!wall) return;

      // Calculate connection point 20cm from wall
      const point = this.calculatePointPosition(light, walls, 20);
      if (!point) return;

      // Draw connection point in yellow
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3 / transform.zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD700'; // Yellow color
      ctx.fill();

      // Draw line from light to connection point
      ctx.beginPath();
      ctx.moveTo(light.position.x, light.position.y);
      ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1 / transform.zoom;
      ctx.stroke();
    });

    // Draw ceiling light points
    ceilingLights.forEach(light => {
      // For ceiling lights, the connection point is at the light's position
      ctx.beginPath();
      ctx.arc(light.position.x, light.position.y, 3 / transform.zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD700'; // Yellow color
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * Draw light-to-switch connections
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} transform - Canvas transform object
   */
  drawLightSwitchConnections(ctx, transform) {
    if (!this.store.state.project.isRoutingActive) return;

    const switches = this.store.state.switches.switches || [];
    const wallLights = this.store.getters['lights/getAllWallLights'] || [];
    const ceilingLights = this.store.getters['lights/getAllCeilingLights'] || [];
    const lightGroups = this.store.getters['lights/getLightGroups'] || [];
    const walls = this.store.state.walls.walls || [];

    ctx.save();
    ctx.translate(transform.panOffset.x, transform.panOffset.y);
    ctx.scale(transform.zoom, transform.zoom);

    // Process each switch
    switches.forEach(switchObj => {
      // Find the wall the switch is mounted on
      const wall = walls.find(w => w.id === switchObj.wall);
      if (!wall) return;

      // Get switch connection point
      const switchPoint = this.calculatePointPosition(switchObj, walls, 20);
      if (!switchPoint) return;

      if (switchObj.type === 'single-switch') {
        // Handle single switch
        if (switchObj.connectedGroup) {
          // Switch is connected to a group
          this.drawGroupLightConnection(ctx, switchObj.connectedGroup, switchPoint, transform);
        } else {
          // Check for direct light connection
          const connectedLight = [...wallLights, ...ceilingLights].find(light =>
              light.switchId === switchObj.id
          );
          if (connectedLight) {
            this.drawSingleLightConnection(ctx, connectedLight, switchPoint, transform);
          }
        }
      } else if (switchObj.type === 'double-switch') {
        // Handle double switch - both connections with offset
        if (switchObj.connectedGroup1) {
          // First group - no offset
          this.drawGroupLightConnection(ctx, switchObj.connectedGroup1, switchPoint, transform, false);
        } else {
          const connectedLight1 = [...wallLights, ...ceilingLights].find(light =>
              light.switchIds && light.switchIds[0] === switchObj.id
          );
          if (connectedLight1) {
            this.drawSingleLightConnection(ctx, connectedLight1, switchPoint, transform, false);
          }
        }

        if (switchObj.connectedGroup2) {
          // Second group - with 3cm offset
          this.drawGroupLightConnection(ctx, switchObj.connectedGroup2, switchPoint, transform, true);
        } else {
          const connectedLight2 = [...wallLights, ...ceilingLights].find(light =>
              light.switchIds && light.switchIds[1] === switchObj.id
          );
          if (connectedLight2) {
            this.drawSingleLightConnection(ctx, connectedLight2, switchPoint, transform, true);
          }
        }
      }
    });

    ctx.restore();
  }

  /**
   * Draw connection for a single light to its switch
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} light - Light object
   * @param {Object} switchPoint - Switch connection point
   * @param {Object} transform - Transform object
   * @param {boolean} [withOffset=false] - Whether to apply 3cm offset
   */
  drawSingleLightConnection(ctx, light, switchPoint, transform, withOffset = false) {
    const walls = this.store.state.walls.walls || [];
    const rooms = this.store.state.rooms.rooms || [];

    if (light.type === 'wall-light' || light.wall) {
      // Find the wall the light is mounted on
      const wall = walls.find(w => w.id === light.wall);
      if (!wall) return;

      // Calculate wall vector and normal
      const wallVector = {
        x: wall.end.x - wall.start.x,
        y: wall.end.y - wall.start.y
      };
      const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);
      const normalizedWall = {
        x: wallVector.x / wallLength,
        y: wallVector.y / wallLength
      };
      const normalVector = {
        x: -normalizedWall.y,
        y: normalizedWall.x
      };

      // Check if normal points into room
      const testPoint = {
        x: light.position.x + normalVector.x * 10,
        y: light.position.y + normalVector.y * 10
      };
      const room = rooms.find(r => this.isPointInPolygon(light.position, r.path));
      if (room && !this.isPointInPolygon(testPoint, room.path)) {
        normalVector.x = -normalVector.x;
        normalVector.y = -normalVector.y;
      }

      // Calculate connection point 20cm from wall
      const connectionPoint = {
        x: light.position.x + normalVector.x * 20,
        y: light.position.y + normalVector.y * 20
      };

      // Draw connection from light to connection point
      ctx.beginPath();
      ctx.moveTo(light.position.x, light.position.y);
      ctx.lineTo(connectionPoint.x, connectionPoint.y);
      ctx.strokeStyle = '#D4AC0D';
      ctx.lineWidth = 1 / transform.zoom;
      ctx.stroke();

      // If offset needed, calculate offset point
      let targetPoint = switchPoint;
      if (withOffset) {
        // Calculate offset vector that's perpendicular to both the wall and the path to switch
        const pathVector = {
          x: switchPoint.x - connectionPoint.x,
          y: switchPoint.y - connectionPoint.y
        };
        const pathLength = Math.sqrt(pathVector.x * pathVector.x + pathVector.y * pathVector.y);
        const normalizedPath = {
          x: pathVector.x / pathLength,
          y: pathVector.y / pathLength
        };

        // Calculate offset vector (perpendicular to path)
        const offsetVector = {
          x: -normalizedPath.y,
          y: normalizedPath.x
        };

        targetPoint = {
          x: switchPoint.x + offsetVector.x * 3, // 3cm offset
          y: switchPoint.y + offsetVector.y * 3
        };
      }

      // Calculate orthogonal path from connection point to switch
      const path = this.calculateOrthogonalPath(connectionPoint, targetPoint, walls);

      // Draw the path to switch
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      path.forEach((point, i) => {
        if (i === 0) return;
        ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = '#D4AC0D';
      ctx.lineWidth = 2 / transform.zoom;
      ctx.stroke();
    } else {
      // Ceiling light - use direct orthogonal path
      let targetPoint = switchPoint;
      if (withOffset) {
        // Calculate offset perpendicular to the path
        const pathVector = {
          x: switchPoint.x - light.position.x,
          y: switchPoint.y - light.position.y
        };
        const pathLength = Math.sqrt(pathVector.x * pathVector.x + pathVector.y * pathVector.y);
        const offsetVector = {
          x: -pathVector.y / pathLength,
          y: pathVector.x / pathLength
        };
        targetPoint = {
          x: switchPoint.x + offsetVector.x * 3,
          y: switchPoint.y + offsetVector.y * 3
        };
      }

      const path = this.calculateOrthogonalPath(light.position, targetPoint, walls);

      // Draw the path
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      path.forEach((point, i) => {
        if (i === 0) return;
        ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = '#D4AC0D';
      ctx.lineWidth = 2 / transform.zoom;
      ctx.stroke();
    }
  }

  /**
   * Draw connection for a group of lights to their switch
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} group - Light group object
   * @param {Object} switchPoint - Switch connection point
   * @param {Object} transform - Transform object
   * @param {boolean} [withOffset=false] - Whether to apply 3cm offset
   */
  drawGroupLightConnection(ctx, group, switchPoint, transform, withOffset = false) {
    const walls = this.store.state.walls.walls || [];
    const rooms = this.store.state.rooms.rooms || [];
    const wallLights = this.store.getters['lights/getAllWallLights'] || [];
    const ceilingLights = this.store.getters['lights/getAllCeilingLights'] || [];

    // Get all lights in the group
    const groupLights = group.lightRefs.map(ref => {
      if (ref.type === 'wall-light') {
        return wallLights.find(l => l.id === ref.id);
      } else {
        return ceilingLights.find(l => l.id === ref.id);
      }
    }).filter(Boolean);

    if (groupLights.length === 0) return;

    // Group lights by wall
    const lightsByWall = new Map();
    groupLights.forEach(light => {
      if (light.wall) {
        if (!lightsByWall.has(light.wall)) {
          lightsByWall.set(light.wall, []);
        }
        lightsByWall.get(light.wall).push(light);
      }
    });

    // Calculate target switch point with offset if needed
    let targetSwitchPoint = switchPoint;
    if (withOffset) {
      // Calculate path vector from first light to switch
      const firstLight = groupLights[0];
      const pathVector = {
        x: switchPoint.x - firstLight.position.x,
        y: switchPoint.y - firstLight.position.y
      };
      const pathLength = Math.sqrt(pathVector.x * pathVector.x + pathVector.y * pathVector.y);

      // Calculate offset vector perpendicular to path
      const offsetVector = {
        x: -pathVector.y / pathLength,
        y: pathVector.x / pathLength
      };

      targetSwitchPoint = {
        x: switchPoint.x + offsetVector.x * 3,
        y: switchPoint.y + offsetVector.y * 3
      };
    }

    // Process each wall's lights
    lightsByWall.forEach((wallLights, wallId) => {
      const wall = walls.find(w => w.id === wallId);
      if (!wall || wallLights.length === 0) return;

      // Calculate wall vector and normal
      const wallVector = {
        x: wall.end.x - wall.start.x,
        y: wall.end.y - wall.start.y
      };
      const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);
      const normalizedWall = {
        x: wallVector.x / wallLength,
        y: wallVector.y / wallLength
      };
      const normalVector = {
        x: -normalizedWall.y,
        y: normalizedWall.x
      };

      // Check if normal points into room
      const testPoint = {
        x: wallLights[0].position.x + normalVector.x * 10,
        y: wallLights[0].position.y + normalVector.y * 10
      };
      const room = rooms.find(r => this.isPointInPolygon(wallLights[0].position, r.path));
      if (room && !this.isPointInPolygon(testPoint, room.path)) {
        normalVector.x = -normalVector.x;
        normalVector.y = -normalVector.y;
      }

      // Find the light furthest from the switch
      const furthestLight = wallLights.reduce((furthest, current) => {
        const distCurrent = this.calculateDistance(current.position, targetSwitchPoint);
        const distFurthest = this.calculateDistance(furthest.position, targetSwitchPoint);
        return distCurrent > distFurthest ? current : furthest;
      }, wallLights[0]);

      // Sort remaining lights by their position along the wall
      const sortedLights = wallLights
          .filter(light => light !== furthestLight)
          .sort((a, b) => {
            const distA = (a.position.x - wall.start.x) * normalizedWall.x +
                (a.position.y - wall.start.y) * normalizedWall.y;
            const distB = (b.position.x - wall.start.x) * normalizedWall.x +
                (b.position.y - wall.start.y) * normalizedWall.y;
            return distA - distB;
          });

      // Calculate connection points 20cm from wall
      const furthestPoint = {
        x: furthestLight.position.x + normalVector.x * 20,
        y: furthestLight.position.y + normalVector.y * 20
      };

      // Draw connection from furthest light to its connection point
      ctx.beginPath();
      ctx.moveTo(furthestLight.position.x, furthestLight.position.y);
      ctx.lineTo(furthestPoint.x, furthestPoint.y);
      ctx.strokeStyle = '#D4AC0D';
      ctx.lineWidth = 1 / transform.zoom;
      ctx.stroke();

      // Start path from furthest light
      let currentPoint = furthestPoint;

      // Connect through each light in order along the wall
      sortedLights.forEach(light => {
        const lightPoint = {
          x: light.position.x + normalVector.x * 20,
          y: light.position.y + normalVector.y * 20
        };

        // Draw connection from light to its connection point
        ctx.beginPath();
        ctx.moveTo(light.position.x, light.position.y);
        ctx.lineTo(lightPoint.x, lightPoint.y);
        ctx.strokeStyle = '#D4AC0D';
        ctx.lineWidth = 1 / transform.zoom;
        ctx.stroke();

        // Draw straight connection parallel to wall
        ctx.beginPath();
        ctx.moveTo(currentPoint.x, currentPoint.y);
        ctx.lineTo(lightPoint.x, lightPoint.y);
        ctx.strokeStyle = '#D4AC0D';
        ctx.lineWidth = 2 / transform.zoom;
        ctx.stroke();

        currentPoint = lightPoint;
      });

      // Finally, connect the last point to the switch using orthogonal path
      const finalPath = this.calculateOrthogonalPath(currentPoint, targetSwitchPoint, walls);
      ctx.beginPath();
      ctx.moveTo(finalPath[0].x, finalPath[0].y);
      finalPath.forEach((point, i) => {
        if (i === 0) return;
        ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = '#D4AC0D';
      ctx.lineWidth = 2 / transform.zoom;
      ctx.stroke();
    });

    // Handle ceiling lights separately
    const ceilingLightsInGroup = groupLights.filter(light => !light.wall);
    if (ceilingLightsInGroup.length > 0) {
      // Find furthest ceiling light from switch
      const furthestLight = ceilingLightsInGroup.reduce((furthest, current) => {
        const distCurrent = this.calculateDistance(current.position, targetSwitchPoint);
        const distFurthest = this.calculateDistance(furthest.position, targetSwitchPoint);
        return distCurrent > distFurthest ? current : furthest;
      }, ceilingLightsInGroup[0]);

      // Sort remaining lights by distance from furthest light
      const sortedLights = ceilingLightsInGroup
          .filter(light => light !== furthestLight)
          .sort((a, b) => {
            const distA = this.calculateDistance(a.position, furthestLight.position);
            const distB = this.calculateDistance(b.position, furthestLight.position);
            return distA - distB;
          });

      // Start from furthest light
      let currentPoint = furthestLight.position;

      // Connect through each light in order
      sortedLights.forEach(light => {
        const path = this.calculateOrthogonalPath(currentPoint, light.position, walls);
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        path.forEach((point, i) => {
          if (i === 0) return;
          ctx.lineTo(point.x, point.y);
        });
        ctx.strokeStyle = '#D4AC0D';
        ctx.lineWidth = 2 / transform.zoom;
        ctx.stroke();
        currentPoint = light.position;
      });

      // Connect last light to switch
      const finalPath = this.calculateOrthogonalPath(currentPoint, targetSwitchPoint, walls);
      ctx.beginPath();
      ctx.moveTo(finalPath[0].x, finalPath[0].y);
      finalPath.forEach((point, i) => {
        if (i === 0) return;
        ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = '#D4AC0D';
      ctx.lineWidth = 2 / transform.zoom;
      ctx.stroke();
    }
  }

  /**
   * Find the light that is furthest from any wall
   * @param {Array} lights - Array of lights
   * @param {Array} walls - Array of walls
   * @returns {Object|null} Furthest light or null
   */
  findFurthestLightFromWalls(lights, walls) {
    let furthestLight = null;
    let maxDistance = -Infinity;

    lights.forEach(light => {
      let minWallDistance = Infinity;
      walls.forEach(wall => {
        const distance = this.distanceToLine(
            light.position,
            wall.start,
            wall.end
        );
        minWallDistance = Math.min(minWallDistance, distance);
      });

      if (minWallDistance > maxDistance) {
        maxDistance = minWallDistance;
        furthestLight = light;
      }
    });

    return furthestLight;
  }

  /**
   * Order lights by distance from a reference point
   * @param {Array} lights - Array of lights to order
   * @param {Object} referencePoint - Point to measure distance from
   * @returns {Array} Ordered array of lights
   */
  orderLightsByDistance(lights, referencePoint) {
    return [...lights].sort((a, b) => {
      const distA = this.calculateDistance(a.position, referencePoint);
      const distB = this.calculateDistance(b.position, referencePoint);
      return distA - distB;
    });
  }

  /**
   * Get the room path that contains a light
   * @param {Object} light - Light object
   * @returns {Array|null} Room path points or null
   */
  getRoomPath(light) {
    const rooms = this.store.state.rooms.rooms || [];
    const room = rooms.find(r => this.isPointInPolygon(light.position, r.path));
    return room ? room.path : null;
  }

  /**
   * Get the total number of panel pins needed
   * @returns {number} Total number of panel pins
   */
  getPanelPinCount() {
    const panel = this.getElectricalPanelPosition();
    if (!panel) return 0;

    const rooms = this.store.state.rooms.rooms || [];
    const walls = this.store.state.walls.walls || [];
    const sockets = this.store.state.sockets.sockets || [];
    const switches = this.store.state.switches.switches || [];

    let totalPins = 0;

    // Process each room to count needed pins
    rooms.forEach(room => {
      // Find all sockets in this room
      const roomSockets = sockets.filter(socket => {
        const wall = walls.find(w => w.id === socket.wall);
        return wall && this.isPointInPolygon(socket.position, room.path);
      });

      // Find all switches in this room
      const roomSwitches = switches.filter(sw => {
        const wall = walls.find(w => w.id === sw.wall);
        return wall && this.isPointInPolygon(sw.position, room.path);
      });

      // Count pins for regular sockets
      if (roomSockets.some(s => s.deviceType !== 'powerful' && s.deviceType !== 'high-power')) {
        totalPins++;
      }

      // Count pins for powerful/high-power sockets
      totalPins += roomSockets.filter(s => s.deviceType === 'powerful' || s.deviceType === 'high-power').length;

      // Count pins for active switches
      const activeSwitches = roomSwitches.filter(sw => this.doesSwitchControlAnything(sw));

      if (activeSwitches.length > 0) {
        // If room has a junction box or single switch, add one pin
        const hasJunctionBox = this.distributionBoxes.some(box => box.roomId === room.id);
        if (hasJunctionBox || activeSwitches.length === 1) {
          totalPins++;
        } else {
          // Otherwise, add pin for each active switch
          totalPins += activeSwitches.length;
        }
      }
    });

    return totalPins;
  }

  /**
   * Calculate total cable lengths for regular sockets and lighting circuits
   * @returns {Object} Object containing lengths in meters for regular sockets and lighting
   */
  calculateCableLengths() {
    try {
      const sockets = this.store.state.sockets.sockets || [];
      const walls = this.store.state.walls.walls || [];
      const rooms = this.store.state.rooms.rooms || [];
      const switches = this.store.state.switches.switches || [];
      const wallLights = this.store.getters['lights/getAllWallLights'] || [];
      const ceilingLights = this.store.getters['lights/getAllCeilingLights'] || [];
      const panel = this.getElectricalPanelPosition();

      if (!panel || !rooms.length) return { regularSockets: 0, lighting: 0 };

      let regularSocketLength = 0;
      let lightingLength = 0;

      // Standard heights in centimeters
      const CEILING_HEIGHT = 250;  // 2.5m ceiling height
      const SOCKET_HEIGHT = 30;    // 30cm from floor
      const SWITCH_HEIGHT = 120;   // 1.2m from floor
      const WALL_LIGHT_HEIGHT = 180; // 1.8m from floor
      const PANEL_HEIGHT = 140;    // 1.4m from floor

      // Process regular sockets
      const regularSocketGroups = this.groupSocketsByProximity(sockets.filter(s =>
          s.deviceType !== 'powerful' && s.deviceType !== 'high-power'
      ), walls);

      regularSocketGroups.forEach(group => {
        if (group.length === 0) return;

        // Sort sockets by their x position to maintain logical order
        const sortedSockets = [...group].sort((a, b) => a.position.x - b.position.x);

        // Start from the panel
        let currentPoint = panel;

        // Initial descent from ceiling to first socket height
        regularSocketLength += CEILING_HEIGHT - SOCKET_HEIGHT;

        // Connect each socket in the group
        sortedSockets.forEach((socket, index) => {
          // Add horizontal distance to this socket
          regularSocketLength += this.calculateDistance(currentPoint, socket.position);

          // If this is not the last socket, add distance to next socket
          if (index < sortedSockets.length - 1) {
            regularSocketLength += this.calculateDistance(socket.position, sortedSockets[index + 1].position);
          }

          currentPoint = socket.position;
        });

        // Final ascent back to ceiling
        regularSocketLength += CEILING_HEIGHT - SOCKET_HEIGHT;
      });

      // Process switches and lights
      switches.forEach(switchObj => {
        const switchPoint = switchObj.position;
        if (!switchPoint) return;

        // Descent from ceiling to switch height
        lightingLength += CEILING_HEIGHT - SWITCH_HEIGHT;

        // Add horizontal distance from panel to switch
        lightingLength += this.calculateDistance(panel, switchPoint);

        if (switchObj.type === 'single-switch') {
          const connectedLight = [...wallLights, ...ceilingLights].find(light =>
              light.switchId === switchObj.id
          );
          if (connectedLight) {
            // Add horizontal distance from switch to light
            lightingLength += this.calculateDistance(switchPoint, connectedLight.position);

            // Add vertical distance based on light type
            if (connectedLight.type === 'wall-light') {
              lightingLength += Math.abs(WALL_LIGHT_HEIGHT - SWITCH_HEIGHT);
            } else {
              lightingLength += CEILING_HEIGHT - SWITCH_HEIGHT;
            }
          }
        }

        // Ascent back to ceiling
        lightingLength += CEILING_HEIGHT - SWITCH_HEIGHT;
      });

      // Process wall lights not connected to switches
      const unconnectedWallLights = wallLights.filter(light => !light.switchId);
      unconnectedWallLights.forEach(light => {
        // Descent from ceiling to wall light height
        lightingLength += CEILING_HEIGHT - WALL_LIGHT_HEIGHT;

        // Add horizontal distance from panel to light
        lightingLength += this.calculateDistance(panel, light.position);

        // Ascent back to ceiling
        lightingLength += CEILING_HEIGHT - WALL_LIGHT_HEIGHT;
      });

      // Process ceiling lights not connected to switches
      const unconnectedCeilingLights = ceilingLights.filter(light => !light.switchId);
      unconnectedCeilingLights.forEach(light => {
        // Only need vertical run to ceiling
        lightingLength += CEILING_HEIGHT;

        // Add horizontal distance from panel to light
        lightingLength += this.calculateDistance(panel, light.position);
      });

      // Add panel vertical runs
      regularSocketLength += (CEILING_HEIGHT - PANEL_HEIGHT) * 2;
      lightingLength += (CEILING_HEIGHT - PANEL_HEIGHT) * 2;

      // Add 10% safety margin
      regularSocketLength *= 1.1;
      lightingLength *= 1.1;

      // Convert from cm to meters
      return {
        regularSockets: Math.max(0, Math.ceil(regularSocketLength / 100)),
        lighting: Math.max(0, Math.ceil(lightingLength / 100))
      };
    } catch (error) {
      console.error('Error calculating cable lengths:', error);
      return { regularSockets: 0, lighting: 0 };
    }
  }

  /**
   * Group lights by proximity
   * @param {Array} lights - Array of lights
   * @param {Array} walls - Array of walls
   * @returns {Array} Array of light clusters
   */
  groupLightsByProximity(lights, walls) {
    const clusters = [];
    const processed = new Set();
    const PROXIMITY_THRESHOLD = 50; // 50cm

    lights.forEach(light => {
      if (processed.has(light.id)) return;

      const cluster = [light];
      processed.add(light.id);

      lights.forEach(otherLight => {
        if (processed.has(otherLight.id)) return;

        const distance = this.calculateDistance(light.position, otherLight.position);
        if (distance <= PROXIMITY_THRESHOLD) {
          cluster.push(otherLight);
          processed.add(otherLight.id);
        }
      });

      clusters.push(cluster);
    });

    return clusters;
  }

  /**
   * Get all lights in a group
   * @param {Object} group - Light group object
   * @returns {Array} Array of light objects
   */
  getLightsInGroup(group) {
    if (!group || !group.lightRefs) return [];

    const wallLights = this.store.getters['lights/getAllWallLights'] || [];
    const ceilingLights = this.store.getters['lights/getAllCeilingLights'] || [];

    return group.lightRefs.map(ref => {
      if (ref.type === 'wall-light') {
        return wallLights.find(l => l.id === ref.id);
      } else {
        return ceilingLights.find(l => l.id === ref.id);
      }
    }).filter(Boolean);
  }

  /**
   * Calculate length of cable needed for a single light connection
   * @param {Object} light - Light object
   * @param {Object} switchPoint - Switch connection point
   * @param {Array} walls - Array of walls
   * @param {Array} rooms - Array of rooms
   * @param {boolean} [withOffset=false] - Whether to apply offset
   * @returns {number} Cable length in centimeters
   */
  calculateSingleLightLength(light, switchPoint, walls, rooms, withOffset = false) {
    let length = 0;

    if (light.type === 'wall-light' || light.wall) {
      const wall = walls.find(w => w.id === light.wall);
      if (!wall) return 0;

      // Calculate connection point 20cm from wall
      const point = this.calculatePointPosition(light, walls, 20);
      if (!point) return 0;

      // Add length from light to connection point
      length += this.calculateDistance(light.position, point);

      // Calculate target point with offset if needed
      let targetPoint = switchPoint;
      if (withOffset) {
        const pathVector = {
          x: switchPoint.x - point.x,
          y: switchPoint.y - point.y
        };
        const pathLength = Math.sqrt(pathVector.x * pathVector.x + pathVector.y * pathVector.y);
        const offsetVector = {
          x: -pathVector.y / pathLength,
          y: pathVector.x / pathLength
        };
        targetPoint = {
          x: switchPoint.x + offsetVector.x * 3,
          y: switchPoint.y + offsetVector.y * 3
        };
      }

      // Add length from connection point to switch
      const path = this.calculateOrthogonalPath(point, targetPoint, walls);
      length += this.calculatePathLength(path.map((p, i) => ({ id: i, position: p })), path);
    } else {
      // Ceiling light - direct path
      let targetPoint = switchPoint;
      if (withOffset) {
        const pathVector = {
          x: switchPoint.x - light.position.x,
          y: switchPoint.y - light.position.y
        };
        const pathLength = Math.sqrt(pathVector.x * pathVector.x + pathVector.y * pathVector.y);
        const offsetVector = {
          x: -pathVector.y / pathLength,
          y: pathVector.x / pathLength
        };
        targetPoint = {
          x: switchPoint.x + offsetVector.x * 3,
          y: switchPoint.y + offsetVector.y * 3
        };
      }

      const path = this.calculateOrthogonalPath(light.position, targetPoint, walls);
      length += this.calculatePathLength(path.map((p, i) => ({ id: i, position: p })), path);
    }

    return length;
  }

  /**
   * Calculate length of cable needed for a group of lights
   * @param {Object} group - Light group object
   * @param {Object} switchPoint - Switch connection point
   * @param {Array} walls - Array of walls
   * @param {Array} rooms - Array of rooms
   * @param {boolean} [withOffset=false] - Whether to apply offset
   * @returns {number} Cable length in centimeters
   */
  calculateGroupLightLength(group, switchPoint, walls, rooms, withOffset = false) {
    let length = 0;
    const wallLights = this.store.getters['lights/getAllWallLights'] || [];
    const ceilingLights = this.store.getters['lights/getAllCeilingLights'] || [];

    // Get all lights in the group
    const groupLights = group.lightRefs.map(ref => {
      if (ref.type === 'wall-light') {
        return wallLights.find(l => l.id === ref.id);
      } else {
        return ceilingLights.find(l => l.id === ref.id);
      }
    }).filter(Boolean);

    if (groupLights.length === 0) return 0;

    // Calculate target switch point with offset if needed
    let targetSwitchPoint = switchPoint;
    if (withOffset) {
      const firstLight = groupLights[0];
      const pathVector = {
        x: switchPoint.x - firstLight.position.x,
        y: switchPoint.y - firstLight.position.y
      };
      const pathLength = Math.sqrt(pathVector.x * pathVector.x + pathVector.y * pathVector.y);
      const offsetVector = {
        x: -pathVector.y / pathLength,
        y: pathVector.x / pathLength
      };
      targetSwitchPoint = {
        x: switchPoint.x + offsetVector.x * 3,
        y: switchPoint.y + offsetVector.y * 3
      };
    }

    // Group lights by wall
    const lightsByWall = new Map();
    groupLights.forEach(light => {
      if (light.wall) {
        if (!lightsByWall.has(light.wall)) {
          lightsByWall.set(light.wall, []);
        }
        lightsByWall.get(light.wall).push(light);
      }
    });

    // Process wall lights
    lightsByWall.forEach((wallLights, wallId) => {
      const wall = walls.find(w => w.id === wallId);
      if (!wall || wallLights.length === 0) return;

      // Find furthest light from switch
      const furthestLight = wallLights.reduce((furthest, current) => {
        const distCurrent = this.calculateDistance(current.position, targetSwitchPoint);
        const distFurthest = this.calculateDistance(furthest.position, targetSwitchPoint);
        return distCurrent > distFurthest ? current : furthest;
      }, wallLights[0]);

      // Calculate connection point for furthest light
      const furthestPoint = this.calculatePointPosition(furthestLight, walls, 20);
      if (!furthestPoint) return;

      // Add length from furthest light to its connection point
      length += this.calculateDistance(furthestLight.position, furthestPoint);

      // Sort remaining lights by position along wall
      const sortedLights = wallLights
          .filter(light => light !== furthestLight)
          .sort((a, b) => {
            const distA = this.calculateDistance(a.position, furthestLight.position);
            const distB = this.calculateDistance(b.position, furthestLight.position);
            return distA - distB;
          });

      // Connect through remaining lights
      let currentPoint = furthestPoint;
      sortedLights.forEach(light => {
        const lightPoint = this.calculatePointPosition(light, walls, 20);
        if (!lightPoint) return;

        // Add length from light to connection point
        length += this.calculateDistance(light.position, lightPoint);

        // Add length between connection points
        length += this.calculateDistance(currentPoint, lightPoint);
        currentPoint = lightPoint;
      });

      // Add length from last light to switch
      const finalPath = this.calculateOrthogonalPath(currentPoint, targetSwitchPoint, walls);
      length += this.calculatePathLength(finalPath.map((p, i) => ({ id: i, position: p })), finalPath);
    });

    // Process ceiling lights
    const ceilingLightsInGroup = groupLights.filter(light => !light.wall);
    if (ceilingLightsInGroup.length > 0) {
      // Find furthest ceiling light from switch
      const furthestLight = ceilingLightsInGroup.reduce((furthest, current) => {
        const distCurrent = this.calculateDistance(current.position, targetSwitchPoint);
        const distFurthest = this.calculateDistance(furthest.position, targetSwitchPoint);
        return distCurrent > distFurthest ? current : furthest;
      }, ceilingLightsInGroup[0]);

      // Sort remaining lights by distance from furthest light
      const sortedLights = ceilingLightsInGroup
          .filter(light => light !== furthestLight)
          .sort((a, b) => {
            const distA = this.calculateDistance(a.position, furthestLight.position);
            const distB = this.calculateDistance(b.position, furthestLight.position);
            return distA - distB;
          });

      // Connect through lights
      let currentPoint = furthestLight.position;
      sortedLights.forEach(light => {
        const path = this.calculateOrthogonalPath(currentPoint, light.position, walls);
        length += this.calculatePathLength(path.map((p, i) => ({ id: i, position: p })), path);
        currentPoint = light.position;
      });

      // Add length from last light to switch
      const finalPath = this.calculateOrthogonalPath(currentPoint, targetSwitchPoint, walls);
      length += this.calculatePathLength(finalPath.map((p, i) => ({ id: i, position: p })), finalPath);
    }

    return length;
  }

} 