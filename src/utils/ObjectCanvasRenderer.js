import drawDoor from './objectDrawing/drawDoor';
import drawWindow from './objectDrawing/drawWindow';

export default class ObjectCanvasRenderer {
  constructor(store, ctx) {
    this.store = store;
    this.ctx = ctx;
    this.panOffset = { x: 0, y: 0 };
    this.zoom = 1;

    store.subscribe((mutation, state) => {
      if (mutation.type.startsWith('doors/') || mutation.type.startsWith('windows/')) {
        this.redrawAll(state);
      }
    });
  }

  updateTransform(panOffset, zoom) {
    this.panOffset = panOffset;
    this.zoom = zoom;
  }

  // Helper method to check if two points are equal (within a small threshold)
  pointsAreEqual(p1, p2, threshold = 1) {
    return Math.abs(p1.x - p2.x) < threshold && Math.abs(p1.y - p2.y) < threshold;
  }

  calculateDoorPosition(door, walls) {
    const wall = walls.find(w => w.id === door.wall);
    if (!wall) return null;

    // Calculate wall vector
    const wallVector = {
      x: wall.end.x - wall.start.x,
      y: wall.end.y - wall.start.y
    };

    // Calculate wall length
    const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);
    if (wallLength === 0) return null;

    // Calculate unit vector of the wall
    const unitVector = {
      x: wallVector.x / wallLength,
      y: wallVector.y / wallLength
    };

    // Calculate door position using only centerOffset
    const doorPosition = {
      x: wall.start.x + unitVector.x * door.centerOffset,
      y: wall.start.y + unitVector.y * door.centerOffset,
      rotation: Math.atan2(wallVector.y, wallVector.x)
    };

    return doorPosition;
  }

  redrawAll(state) {
    if (!this.ctx) return;

    // Save the current context state
    this.ctx.save();

    // Apply pan and zoom transformations
    this.ctx.translate(this.panOffset.x, this.panOffset.y);
    this.ctx.scale(this.zoom, this.zoom);

    // Draw doors
    if (state.doors && state.doors.doors) {
      state.doors.doors.forEach(door => {
        if (!door.position) return;
        
        const plainDoor = {
          ...door,
          position: {
            x: door.position.x,
            y: door.position.y,
            rotation: door.position.rotation || 0
          }
        };
        drawDoor(this.ctx, plainDoor);
      });
    }

    // Draw windows
    if (state.windows && state.windows.windows) {
      state.windows.windows.forEach(window => {
        if (!window.position) return;
        
        const plainWindow = {
          ...window,
          position: {
            x: window.position.x,
            y: window.position.y,
            rotation: window.position.rotation || 0
          }
        };
        drawWindow(this.ctx, plainWindow);
      });
    }

    // Restore the context state
    this.ctx.restore();
  }
} 