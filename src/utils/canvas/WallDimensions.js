// utils/canvas/WallDimensions.js
import { fabric } from 'fabric';

export class WallDimensions {
    constructor(canvas, store) {
        this.canvas = canvas;
        this.store = store;
        this.dimensionTexts = [];
    }

    clearDimensions() {
        this.dimensionTexts.forEach(text => this.canvas.remove(text));
        this.dimensionTexts = [];
    }

    drawForWall(wall) {
        if (!wall || !wall.start || !wall.end) {
            console.warn('Invalid wall data for dimensions:', wall);
            return;
        }

        // Calculate wall properties if not provided
        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const length = wall.length || Math.sqrt(dx * dx + dy * dy) * 10; // Convert to mm if needed
        const thickness = wall.thickness || 20; // Default thickness

        // Find midpoint of the wall
        const midX = (wall.start.x + wall.end.x) / 2;
        const midY = (wall.start.y + wall.end.y) / 2;

        // Calculate wall angle
        const angle = Math.atan2(dy, dx);
        const angleDeg = angle * 180 / Math.PI;

        // Create dimension text with proper orientation
        const isFlipped = angleDeg > 90 && angleDeg < 270;
        const textAngle = isFlipped ? angleDeg + 180 : angleDeg;

        const text = new fabric.Text(`${Math.round(length)} мм`, {
            left: midX,
            top: midY,
            angle: textAngle,
            fontSize: 14,
            fill: '#333',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
        });

        this.canvas.add(text);
        this.dimensionTexts.push(text);
    }

    drawForAll() {
        const walls = this.store.state.walls.walls || [];
        this.clearDimensions();

        if (walls.length > 0) {
            walls.forEach(wall => this.drawForWall(wall));
            this.canvas.renderAll();
        } else {
            console.log('No walls to draw dimensions for');
        }
    }
}