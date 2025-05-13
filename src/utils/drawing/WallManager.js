// WallManager.js - Handles wall drawing and manipulation
import { calculateInternalPoints } from './utils/geometry.js';

export default class WallManager {
    constructor(ctx, store) {
        this.ctx = ctx;
        this.store = store;
        this.walls = [];
        this.selectedWall = null;
    }

    drawWall(wall) {
        const rect = this.calculateWallRectangle(wall.start, wall.end, wall.thickness);
        if (!rect) return;
        this.drawSimpleWall(wall, rect);
        this.drawWallDimension(wall);
    }

    drawSimpleWall(wall, rect) {
        this.ctx.fillStyle = 'rgba(220, 220, 220, 0.8)';
        this.ctx.strokeStyle = wall === this.selectedWall ? '#2196F3' : '#333';
        this.ctx.lineWidth = wall === this.selectedWall ? 2 : 1;

        this.ctx.beginPath();
        this.ctx.moveTo(rect[0].x, rect[0].y);
        this.ctx.lineTo(rect[1].x, rect[1].y);
        this.ctx.lineTo(rect[2].x, rect[2].y);
        this.ctx.lineTo(rect[3].x, rect[3].y);
        this.ctx.closePath();

        this.ctx.fill();
        this.ctx.stroke();

        if (wall === this.selectedWall) {
            this.drawWallControlPoints(wall);
        }
    }

    drawWallDimension(wall) {
        if (wall.hideDimension) return;

        const startConnections = this.findWallsConnectedToPoint(wall.start);
        const endConnections = this.findWallsConnectedToPoint(wall.end);
        const internalPoints = calculateInternalPoints(wall, startConnections, endConnections);
        
        if (!internalPoints) return;

        // ... rest of the wall dimension drawing code ...
        // (This would be the same as in the original file)
    }

    calculateWallRectangle(start, end, thickness) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < 0.001) return null;

        const nx = -dy / length;
        const ny = dx / length;
        const halfThick = thickness / 2;

        return [
            { x: start.x + nx * halfThick, y: start.y + ny * halfThick },
            { x: end.x + nx * halfThick, y: end.y + ny * halfThick },
            { x: end.x - nx * halfThick, y: end.y - ny * halfThick },
            { x: start.x - nx * halfThick, y: start.y - ny * halfThick }
        ];
    }

    drawWalls() {
        // First draw unselected walls
        this.walls.forEach(wall => {
            if (wall !== this.selectedWall) {
                this.drawWall(wall);
            }
        });

        // Then draw selected wall on top
        if (this.selectedWall) {
            this.drawWall(this.selectedWall);
        }
    }

    // ... other wall-related methods ...
} 