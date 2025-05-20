import WallCenteredObject from './objectManagers/WallCenteredObject';

export default class ObjectCanvasRenderer {
  constructor(store, ctx) {
    this.store = store;
    this.ctx = ctx;
    this.panOffset = { x: 0, y: 0 };
    this.zoom = 1;
    this.wallCenteredObject = new WallCenteredObject(store);

    // Subscribe to store mutations
    store.subscribe((mutation, state) => {
      // Listen for object changes
      if (mutation.type.startsWith('doors/') || mutation.type.startsWith('windows/')) {
        this.redrawAll(state);
      }
      
      // Listen for transform updates
      if (mutation.type === 'canvas/updateTransform') {
        this.updateTransform(mutation.payload.panOffset, mutation.payload.zoom);
        this.redrawAll(state);
      }
    });
  }

  updateTransform(panOffset, zoom) {
    this.panOffset = panOffset;
    this.zoom = zoom;
    this.wallCenteredObject.updateTransform(panOffset, zoom);
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

  drawDoor(ctx, door, wall) {
    if (!door || !wall) return;
    
    // Apply current transform
    ctx.save();
    ctx.translate(this.panOffset.x, this.panOffset.y);
    ctx.scale(this.zoom, this.zoom);
    
    // Draw the door using WallCenteredObject
    this.wallCenteredObject.drawFinalObject(ctx, door, wall);
    
    ctx.restore();
  }

  drawWindow(ctx, window, wall) {
    if (!window || !wall) return;
    
    // Apply current transform
    ctx.save();
    ctx.translate(this.panOffset.x, this.panOffset.y);
    ctx.scale(this.zoom, this.zoom);
    
    // Draw the window using WallCenteredObject
    this.wallCenteredObject.drawFinalObject(ctx, window, wall);
    
    ctx.restore();
  }

  redrawAll(state) {
    if (!this.ctx) return;
    
    // Apply transform
    this.ctx.save();
    this.ctx.translate(this.panOffset.x, this.panOffset.y);
    this.ctx.scale(this.zoom, this.zoom);

    // Get all objects from state
    const doors = state.doors?.doors || [];
    const windows = state.windows?.windows || [];
    const walls = state.walls?.walls || [];

    // Draw all doors
    doors.forEach(door => {
      const wall = walls.find(w => w.id === door.wallId);
      if (wall) {
        this.wallCenteredObject.drawFinalObject(this.ctx, door, wall);
      }
    });

    // Draw all windows
    windows.forEach(window => {
      const wall = walls.find(w => w.id === window.wallId);
      if (wall) {
        this.wallCenteredObject.drawFinalObject(this.ctx, window, wall);
      }
    });

    this.ctx.restore();
  }
} 