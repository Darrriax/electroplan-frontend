import AutoElectricalRouter from './AutoElectricalRouter';

// Cable length variables (in centimeters)
let cable1_5mm = 0;  // For lighting circuits (yellow cables)
let cable2_5mm = 0;  // For regular and powerful sockets (blue cables)
let cable4_0mm = 0;  // For high-power sockets (red cables)

export default class CableLengthCalculator {
  constructor(store) {
    this.store = store;
    this.router = new AutoElectricalRouter(store);
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
   * Calculate total length of 1.5mm² cables (lighting circuits)
   */
  calculate1_5mmCables(walls, rooms, switches, wallLights, ceilingLights, panel, junctionBoxes) {
    // Calculate length for switch-to-light connections
    switches.forEach(switchObj => {
      if (!this.router.doesSwitchControlAnything(switchObj)) return;

      const switchPoint = this.router.calculatePointPosition(switchObj, walls, 20);
      if (!switchPoint) return;

      // Calculate length from switch to lights or junction box
      const room = rooms.find(r => this.router.isPointInPolygon(switchObj.position, r.path));
      if (!room) return;

      const junctionBox = junctionBoxes.find(box => box.roomId === room.id);
      if (junctionBox) {
        // Add length from switch to junction box
        const path = this.router.calculateOrthogonalPath(switchPoint, junctionBox.position, walls);
        for (let i = 0; i < path.length - 1; i++) {
          cable1_5mm += this.router.calculateDistance(path[i], path[i + 1]);
        }
      }

      // Add length for direct light connections
      this.addLightConnectionLength(switchObj, wallLights, ceilingLights, switchPoint, walls);
    });

    // Add length from junction boxes to panel
    junctionBoxes.forEach(box => {
      const panelPoints = this.router.calculatePanelConnectionPoints();
      const connectionId = `box-${box.roomId}`;
      const panelPoint = this.router.findAvailablePanelPoint(panelPoints, connectionId);
      if (!panelPoint) return;

      const path = this.router.calculateOrthogonalPath(box.position, panelPoint, walls);
      for (let i = 0; i < path.length - 1; i++) {
        cable1_5mm += this.router.calculateDistance(path[i], path[i + 1]);
      }
    });
  }

  /**
   * Calculate total length of 2.5mm² cables (regular and powerful sockets)
   */
  calculate2_5mmCables(walls, rooms, sockets, panel) {
    const regularAndPowerfulSockets = sockets.filter(s => s.deviceType !== 'high-power');
    regularAndPowerfulSockets.forEach(socket => {
      const wall = walls.find(w => w.id === socket.wall);
      if (!wall) return;

      const socketPoint = this.router.calculatePointPosition(socket, walls, socket.deviceType === 'powerful' ? 22 : 25);
      if (!socketPoint) return;

      // Add length from socket to connection point
      cable2_5mm += this.router.calculateDistance(socket.position, socketPoint);

      // Calculate panel connection point
      const panelPoints = this.router.calculatePanelConnectionPoints();
      const connectionId = `socket-${socket.id}`;
      const panelPoint = this.router.findAvailablePanelPoint(panelPoints, connectionId);
      if (!panelPoint) return;

      // Add length of path to panel
      const path = this.router.calculateOrthogonalPath(socketPoint, panelPoint, walls);
      for (let i = 0; i < path.length - 1; i++) {
        cable2_5mm += this.router.calculateDistance(path[i], path[i + 1]);
      }
    });
  }

  /**
   * Calculate total length of 4.0mm² cables (high-power sockets)
   */
  calculate4_0mmCables(walls, rooms, sockets, panel) {
    const highPowerSockets = sockets.filter(s => s.deviceType === 'high-power');
    highPowerSockets.forEach(socket => {
      const wall = walls.find(w => w.id === socket.wall);
      if (!wall) return;

      const socketPoint = this.router.calculatePointPosition(socket, walls, 27);
      if (!socketPoint) return;

      // Add length from socket to connection point
      cable4_0mm += this.router.calculateDistance(socket.position, socketPoint);

      // Calculate panel connection point
      const panelPoints = this.router.calculatePanelConnectionPoints();
      const connectionId = `high-power-${socket.id}`;
      const panelPoint = this.router.findAvailablePanelPoint(panelPoints, connectionId);
      if (!panelPoint) return;

      // Add length of path to panel
      const path = this.router.calculateOrthogonalPath(socketPoint, panelPoint, walls);
      for (let i = 0; i < path.length - 1; i++) {
        cable4_0mm += this.router.calculateDistance(path[i], path[i + 1]);
      }
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