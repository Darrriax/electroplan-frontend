// GridManager.js - Handles grid drawing and snapping
export default class GridManager {
    constructor(ctx) {
        this.ctx = ctx;
        this.GRID_SIZE = 10;
        this.LARGE_GRID_SIZE = this.GRID_SIZE * 10;
    }

    draw(width, height) {
        // Small grid lines
        this.ctx.strokeStyle = '#eee';
        this.ctx.lineWidth = 1.5;

        // Draw vertical small grid lines
        for (let x = 0; x < width; x += this.GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        // Draw horizontal small grid lines
        for (let y = 0; y < height; y += this.GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        // Draw larger grid lines with darker color
        this.ctx.strokeStyle = '#aaa';
        this.ctx.lineWidth = 1;

        // Draw vertical large grid lines
        for (let x = 0; x < width; x += this.LARGE_GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        // Draw horizontal large grid lines
        for (let y = 0; y < height; y += this.LARGE_GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }

    snapToGrid(point) {
        return {
            x: Math.round(point.x / this.GRID_SIZE) * this.GRID_SIZE,
            y: Math.round(point.y / this.GRID_SIZE) * this.GRID_SIZE
        };
    }
} 