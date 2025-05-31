import AutoElectricalRouter from './AutoElectricalRouter';
// Cable length variables (in centimeters)
let cable1_5mm = 0;  // For lighting circuits (yellow cables)
let cable2_5mm = 0;  // For regular and powerful sockets (blue cables)
let cable4_0mm = 0;  // For high-power sockets (red cables)

export default class CableLengthCalculator {
  constructor(store) {
    this.store = store;
    this.router = new AutoElectricalRouter(store);
    // Default ceiling height in centimeters
    this.CEILING_HEIGHT = this.store.state.walls.defaultHeight / 10;
  }

  /**
   * Reset all cable length counters
   */
  resetCounters() {
    cable1_5mm = 0;
    cable2_5mm = 0;
    cable4_0mm = 0;
  }

  /**
   * Get all cable lengths
   * @returns {Object} Object containing all cable lengths
   */
  getCableLengths() {
    this.resetCounters();
    this.calculateAllCableLengths();
    
    return {
      cable1_5mm,
      cable2_5mm,
      cable4_0mm
    };
  }

  /**
   * Calculate lengths for all cable types
   */
  calculateAllCableLengths() {
    const walls = this.store.state.walls.walls || [];
    const rooms = this.store.state.rooms.rooms || [];
    const sockets = this.store.state.sockets.sockets || [];
    const switches = this.store.state.switches.switches || [];
    const wallLights = this.store.getters['lights/getAllWallLights'] || [];
    const ceilingLights = this.store.getters['lights/getAllCeilingLights'] || [];
    const panel = this.router.getElectricalPanelPosition();
    const junctionBoxes = this.router.distributionBoxes;

    if (!panel) return;

    this.calculate1_5mmCables(walls, rooms, switches, wallLights, ceilingLights, panel, junctionBoxes);
    this.calculate2_5mmCables(walls, rooms, sockets, panel);
    this.calculate4_0mmCables(walls, rooms, sockets, panel);
  }

  /**
   * Calculate vertical cable run length
   * @param {Object} device Device object (socket, panel, etc.)
   * @returns {number} Length of vertical cable run in cm
   */
  calculateVerticalRun(device) {
    // Default to 100cm if no height specified
    const defaultHeight = 100;
    
    if (!device || !device.dimensions) {
      return this.CEILING_HEIGHT - defaultHeight;
    }
    
    const floorHeight = device.dimensions.floorHeight || defaultHeight;
    return this.CEILING_HEIGHT - floorHeight;
  }

  /**
   * Calculate total length of 1.5mm² cables (lighting circuits)
   */
  calculate1_5mmCables(walls, rooms, switches, wallLights, ceilingLights, panel, junctionBoxes) {
  
  }

  /**
   * Calculate total length of 2.5mm² cables (powerful sockets and junction boxes)
   */
  calculate2_5mmCables(walls, rooms, sockets, panel) {
    if (!panel) return;

    // Get wall height from store (converting from mm to cm)
    const WALL_HEIGHT = this.store.state.walls.defaultHeight / 10; // Convert from mm to cm
    console.log('Wall height (cm):', WALL_HEIGHT);

    // Calculate panel's vertical run once (converting from mm to cm)
    const panelHeight = (panel.dimensions && panel.dimensions.floorHeight) ? 
      panel.dimensions.floorHeight / 10 : // Convert from mm to cm
      120; // Default panel height 120cm

    const panelVerticalRun = WALL_HEIGHT - panelHeight;
    console.log('Panel vertical run (cm):', panelVerticalRun);

    // First calculate cables for powerful sockets
    const powerfulSockets = sockets.filter(s => s.deviceType === 'powerful');
    
    console.log('Found powerful sockets:', powerfulSockets.map(s => ({
      id: s.id,
      type: s.deviceType,
      height: s.dimensions?.floorHeight
    })));

    // Add vertical run for panel multiplied by number of powerful sockets
    cable2_5mm += panelVerticalRun * powerfulSockets.length;
    console.log('Total panel runs for sockets (cm):', cable2_5mm);

    powerfulSockets.forEach(socket => {
      if (!socket) return;
      console.log('Processing powerful socket:', socket.id);

      const wall = walls.find(w => w.id === socket.wall);
      if (!wall) return;

      const socketPoint = this.router.calculatePointPosition(socket, walls, 22);
      if (!socketPoint) return;

      // Calculate socket's vertical run (converting from mm to cm)
      const socketHeight = socket.dimensions && socket.dimensions.floorHeight ? 
        socket.dimensions.floorHeight / 10 : // Convert from mm to cm
        30; // Default height for powerful sockets (30cm)
      
      console.log('Socket height from floor (cm):', socketHeight);
      
      // Add vertical run from ceiling to socket
      const verticalRun = WALL_HEIGHT - socketHeight;
      cable2_5mm += verticalRun;
      console.log('Added vertical run (cm):', verticalRun);
      console.log('Current total (cm):', cable2_5mm);

      // Calculate panel connection point
      const panelPoints = this.router.calculatePanelConnectionPoints();
      const connectionId = `powerful-socket-${socket.id}`;
      const panelPoint = this.router.findAvailablePanelPoint(panelPoints, connectionId);
      if (!panelPoint) return;

      // Add length of horizontal path along ceiling
      const path = this.router.calculateOrthogonalPath(socketPoint, panelPoint, walls);
      let horizontalRun = 0;
      for (let i = 0; i < path.length - 1; i++) {
        horizontalRun += this.router.calculateDistance(path[i], path[i + 1]);
      }
      cable2_5mm += horizontalRun;
      console.log('Added horizontal run (cm):', horizontalRun);
      console.log('Final total for this socket (cm):', cable2_5mm);
    });

    // Get junction boxes from project state
    const junctionBoxes = this.store.state.project.distributionBoxes || [];
    console.log('Found junction boxes:', junctionBoxes);

    // Find panel room
    const panelRoom = rooms.find(room => this.router.isPointInPolygon(panel, room.path));
    if (!panelRoom) return;

    // Process each room
    rooms.forEach(room => {
      if (room.id === panelRoom.id) return; // Skip panel room

      // Find all regular sockets in this room
      const roomSockets = sockets.filter(socket => {
        const wall = walls.find(w => w.id === socket.wall);
        return wall && 
               this.router.isPointInPolygon(socket.position, room.path) && 
               socket.deviceType !== 'powerful' && 
               socket.deviceType !== 'high-power';
      });

      if (roomSockets.length === 0) return; // Skip if no regular sockets in room

      // Group nearby sockets (within 10cm)
      const socketGroups = this.groupNearbySocketsByWall(roomSockets, walls);

      // Check if room has a junction box
      const junctionBox = junctionBoxes.find(box => box.roomId === room.id);

      // Calculate connection points for all socket groups in the room
      const groupPoints = socketGroups.map(group => {
        // Calculate average position for the group
        const avgX = group.sockets.reduce((sum, s) => sum + s.position.x, 0) / group.sockets.length;
        const avgY = group.sockets.reduce((sum, s) => sum + s.position.y, 0) / group.sockets.length;

        // Use the first socket's wall and side for the reference
        const referenceSocket = group.sockets[0];
        const point = this.router.calculatePointPosition(
          { ...referenceSocket, position: { x: avgX, y: avgY, side: referenceSocket.position.side } },
          walls,
          22
        );

        return {
          point,
          group,
          used: false,
          // Calculate vertical run once for the group
          verticalRun: WALL_HEIGHT - (referenceSocket.dimensions?.floorHeight ? referenceSocket.dimensions.floorHeight / 10 : 30)
        };
      }).filter(gp => gp.point !== null);

      if (junctionBox) {
        // Process room with junction box
        console.log('Processing room with junction box:', room.id);

        // Calculate panel connection point
        const panelPoints = this.router.calculatePanelConnectionPoints();
        const connectionId = `junction-box-${room.id}`;
        const panelPoint = this.router.findAvailablePanelPoint(panelPoints, connectionId);
        if (!panelPoint) return;

        // Add vertical run for panel
        cable2_5mm += panelVerticalRun;
        console.log('Added panel vertical run (up) (cm):', panelVerticalRun);

        // Add length of horizontal path along ceiling from panel to junction box
        const pathToBox = this.router.calculateOrthogonalPath(junctionBox.position, panelPoint, walls);
        let horizontalRun = 0;
        for (let i = 0; i < pathToBox.length - 1; i++) {
          horizontalRun += this.router.calculateDistance(pathToBox[i], pathToBox[i + 1]);
        }
        cable2_5mm += horizontalRun;
        console.log('Added horizontal run to junction box (cm):', horizontalRun);

        // Now calculate paths between socket groups in sequence
        let currentPoint = junctionBox.position;
        let processedGroupCount = 0;
        const totalGroups = groupPoints.length;

        while (groupPoints.some(gp => !gp.used)) {
          // Find the closest unused group to the current point
          let closestGroup = null;
          let minDistance = Infinity;

          groupPoints.forEach(gp => {
            if (gp.used) return;
            
            const path = this.router.calculateOrthogonalPath(currentPoint, gp.point, walls);
            let distance = 0;
            for (let i = 0; i < path.length - 1; i++) {
              distance += this.router.calculateDistance(path[i], path[i + 1]);
            }

            if (distance < minDistance) {
              minDistance = distance;
              closestGroup = {
                ...gp,
                distance,
                path
              };
            }
          });

          if (closestGroup) {
            processedGroupCount++;

            // Add horizontal path length to the group point
            cable2_5mm += closestGroup.distance;
            console.log(`Added horizontal path to socket group (cm):`, closestGroup.distance);

            // Add vertical run down to the group
            cable2_5mm += closestGroup.verticalRun;
            console.log(`Added vertical run down to socket group (cm):`, closestGroup.verticalRun);

            // If not the last group, add vertical run back up to ceiling
            if (processedGroupCount < totalGroups) {
              cable2_5mm += closestGroup.verticalRun;
              console.log(`Added vertical run up from socket group (cm):`, closestGroup.verticalRun);
            }

            // Mark this group as used and update current point
            const groupIndex = groupPoints.findIndex(gp => gp.group === closestGroup.group);
            if (groupIndex !== -1) {
              groupPoints[groupIndex].used = true;
            }
            currentPoint = closestGroup.point;
          }
        }
      } else {
        // Process room without junction box
        console.log('Processing room without junction box:', room.id);

        // Find the socket group closest to panel
        let closestToPanel = null;
        let minDistance = Infinity;

        groupPoints.forEach(gp => {
          const panelPoints = this.router.calculatePanelConnectionPoints();
          const connectionId = `regular-socket-${gp.group.sockets[0].id}`;
          const panelPoint = this.router.findAvailablePanelPoint(panelPoints, connectionId);
          if (!panelPoint) return;

          const path = this.router.calculateOrthogonalPath(gp.point, panelPoint, walls);
          let distance = 0;
          for (let i = 0; i < path.length - 1; i++) {
            distance += this.router.calculateDistance(path[i], path[i + 1]);
          }

          if (distance < minDistance) {
            minDistance = distance;
            closestToPanel = {
              ...gp,
              panelPoint,
              distance,
              path
            };
          }
        });

        if (closestToPanel) {
          // Add vertical run from panel to ceiling
          cable2_5mm += panelVerticalRun;
          console.log('Added panel vertical run (up) (cm):', panelVerticalRun);

          // Add horizontal path length from panel to first group
          cable2_5mm += closestToPanel.distance;
          console.log('Added horizontal run to first socket group (cm):', closestToPanel.distance);

          // Add vertical run down to the first group
          cable2_5mm += closestToPanel.verticalRun;
          console.log('Added vertical run down to first socket group (cm):', closestToPanel.verticalRun);

          // If there are more groups, add vertical run back up to ceiling
          if (groupPoints.length > 1) {
            cable2_5mm += closestToPanel.verticalRun;
            console.log('Added vertical run up from first socket group (cm):', closestToPanel.verticalRun);
          }

          // Mark the closest group as used
          const groupIndex = groupPoints.findIndex(gp => gp.group === closestToPanel.group);
          if (groupIndex !== -1) {
            groupPoints[groupIndex].used = true;
          }

          // Now calculate paths between remaining groups
          let currentPoint = closestToPanel.point;
          let processedGroupCount = 1; // We've already processed the first group
          const totalGroups = groupPoints.length;

          while (groupPoints.some(gp => !gp.used)) {
            // Find the closest unused group to the current point
            let closestGroup = null;
            let minDistance = Infinity;

            groupPoints.forEach(gp => {
              if (gp.used) return;
              
              const path = this.router.calculateOrthogonalPath(currentPoint, gp.point, walls);
              let distance = 0;
              for (let i = 0; i < path.length - 1; i++) {
                distance += this.router.calculateDistance(path[i], path[i + 1]);
              }

              if (distance < minDistance) {
                minDistance = distance;
                closestGroup = {
                  ...gp,
                  distance,
                  path
                };
              }
            });

            if (closestGroup) {
              processedGroupCount++;

              // Add horizontal path length to the group point
              cable2_5mm += closestGroup.distance;
              console.log('Added horizontal run to next socket group (cm):', closestGroup.distance);

              // Add vertical run down to the group
              cable2_5mm += closestGroup.verticalRun;
              console.log(`Added vertical run down to socket group (cm):`, closestGroup.verticalRun);

              // If not the last group, add vertical run back up to ceiling
              if (processedGroupCount < totalGroups) {
                cable2_5mm += closestGroup.verticalRun;
                console.log(`Added vertical run up from socket group (cm):`, closestGroup.verticalRun);
              }

              // Mark this group as used and update current point
              const groupIndex = groupPoints.findIndex(gp => gp.group === closestGroup.group);
              if (groupIndex !== -1) {
                groupPoints[groupIndex].used = true;
              }
              currentPoint = closestGroup.point;
            }
          }
        }
      }
    });
  }

  /**
   * Group nearby sockets that are on the same wall and within 10cm of each other
   * @param {Array} sockets - Array of sockets to group
   * @param {Array} walls - Array of walls
   * @returns {Array} Array of socket groups
   */
  groupNearbySocketsByWall(sockets, walls) {
    const groups = [];
    const processed = new Set();
    const PROXIMITY_THRESHOLD = 10; // 10cm

    sockets.forEach(socket => {
      if (processed.has(socket.id)) return;

      const group = {
        sockets: [socket],
        wall: socket.wall
      };
      processed.add(socket.id);

      // Find all nearby sockets on the same wall
      sockets.forEach(otherSocket => {
        if (processed.has(otherSocket.id)) return;
        if (otherSocket.wall !== socket.wall) return;

        const distance = Math.sqrt(
          Math.pow(socket.position.x - otherSocket.position.x, 2) +
          Math.pow(socket.position.y - otherSocket.position.y, 2)
        );

        if (distance <= PROXIMITY_THRESHOLD) {
          group.sockets.push(otherSocket);
          processed.add(otherSocket.id);
        }
      });

      groups.push(group);
    });

    return groups;
  }

  /**
   * Calculate total length of 4.0mm² cables (high-power sockets only)
   */
  calculate4_0mmCables(walls, rooms, sockets, panel) {
    if (!panel) return;

    // Get only high-power sockets
    const highPowerSockets = sockets.filter(s => s.deviceType === 'high-power');
    
    console.log('Found high-power sockets:', highPowerSockets.map(s => ({
      id: s.id,
      type: s.deviceType,
      height: s.dimensions?.floorHeight
    })));

    if (highPowerSockets.length === 0) {
      console.log('No high-power sockets found');
      return;
    }

    // Get wall height from store (converting from mm to cm)
    const WALL_HEIGHT = this.store.state.walls.defaultHeight / 10; // Convert from mm to cm
    console.log('Wall height (cm):', WALL_HEIGHT);

    // Calculate panel's vertical run once (converting from mm to cm)
    const panelHeight = (panel.dimensions && panel.dimensions.floorHeight) ? 
      panel.dimensions.floorHeight / 10 : // Convert from mm to cm
      120; // Default panel height 120cm

    const panelVerticalRun = WALL_HEIGHT - panelHeight;
    console.log('Panel vertical run (cm):', panelVerticalRun);

    // Add vertical run for panel multiplied by number of high-power sockets
    cable4_0mm += panelVerticalRun * highPowerSockets.length;
    console.log('Total panel runs (cm):', cable4_0mm);

    highPowerSockets.forEach(socket => {
      if (!socket) return;
      console.log('Processing high-power socket:', socket.id);

      const wall = walls.find(w => w.id === socket.wall);
      if (!wall) return;

      const socketPoint = this.router.calculatePointPosition(socket, walls, 27);
      if (!socketPoint) return;

      // Calculate socket's vertical run (converting from mm to cm)
      const socketHeight = socket.dimensions && socket.dimensions.floorHeight ? 
        socket.dimensions.floorHeight / 10 : // Convert from mm to cm
        70; // Default height for high-power sockets (70cm)
      
      console.log('Socket height from floor (cm):', socketHeight);
      
      // Add vertical run from ceiling to socket
      const verticalRun = WALL_HEIGHT - socketHeight;
      cable4_0mm += verticalRun;
      console.log('Added vertical run (cm):', verticalRun);
      console.log('Current total (cm):', cable4_0mm);

      // Calculate panel connection point
      const panelPoints = this.router.calculatePanelConnectionPoints();
      const connectionId = `high-power-${socket.id}`;
      const panelPoint = this.router.findAvailablePanelPoint(panelPoints, connectionId);
      if (!panelPoint) return;

      // Add length of horizontal path along ceiling
      const path = this.router.calculateOrthogonalPath(socketPoint, panelPoint, walls);
      let horizontalRun = 0;
      for (let i = 0; i < path.length - 1; i++) {
        horizontalRun += this.router.calculateDistance(path[i], path[i + 1]);
      }
      cable4_0mm += horizontalRun;
      console.log('Added horizontal run (cm):', horizontalRun);
      console.log('Final total for this socket (cm):', cable4_0mm);
    });
  }

  /**
   * Add cable length for light connections
   */
  addLightConnectionLength(switchObj, wallLights, ceilingLights, switchPoint, walls) {
    if (switchObj.type === 'single-switch') {
      if (switchObj.connectedGroup) {
        this.addGroupLightLength(switchObj.connectedGroup, wallLights, ceilingLights, switchPoint, walls);
      } else {
        const connectedLight = [...wallLights, ...ceilingLights].find(light => 
          light.switchId === switchObj.id
        );
        if (connectedLight) {
          this.addSingleLightLength(connectedLight, switchPoint, walls);
        }
      }
    } else if (switchObj.type === 'double-switch') {
      if (switchObj.connectedGroup1) {
        this.addGroupLightLength(switchObj.connectedGroup1, wallLights, ceilingLights, switchPoint, walls, false);
      }
      if (switchObj.connectedGroup2) {
        this.addGroupLightLength(switchObj.connectedGroup2, wallLights, ceilingLights, switchPoint, walls, true);
      }
    }
  }

  /**
   * Add cable length for a group of lights
   */
  addGroupLightLength(group, wallLights, ceilingLights, switchPoint, walls, withOffset = false) {
    const groupLights = group.lightRefs.map(ref => {
      if (ref.type === 'wall-light') {
        return wallLights.find(l => l.id === ref.id);
      } else {
        return ceilingLights.find(l => l.id === ref.id);
      }
    }).filter(Boolean);

    if (groupLights.length === 0) return;

    // Calculate target switch point with offset if needed
    let targetPoint = switchPoint;
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
      targetPoint = {
        x: switchPoint.x + offsetVector.x * 3,
        y: switchPoint.y + offsetVector.y * 3
      };
    }

    // Add length for each light connection
    groupLights.forEach(light => {
      this.addSingleLightLength(light, targetPoint, walls);
    });
  }

  /**
   * Add cable length for a single light connection
   */
  addSingleLightLength(light, switchPoint, walls) {
    if (light.wall) {
      const wall = walls.find(w => w.id === light.wall);
      if (!wall) return;

      const lightPoint = this.router.calculatePointPosition(light, walls, 20);
      if (!lightPoint) return;

      // Add length from light to connection point
      cable1_5mm += this.router.calculateDistance(light.position, lightPoint);

      // Add length of path to switch
      const path = this.router.calculateOrthogonalPath(lightPoint, switchPoint, walls);
      for (let i = 0; i < path.length - 1; i++) {
        cable1_5mm += this.router.calculateDistance(path[i], path[i + 1]);
      }
    } else {
      // For ceiling lights, calculate direct path
      const path = this.router.calculateOrthogonalPath(light.position, switchPoint, walls);
      for (let i = 0; i < path.length - 1; i++) {
        cable1_5mm += this.router.calculateDistance(path[i], path[i + 1]);
      }
    }
  }
} 