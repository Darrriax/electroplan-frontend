// CanvasManager.js - Handles canvas initialization and basic setup
export default class CanvasManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1;
        this.setupCanvas();
    }

    setupCanvas() {
        // Set canvas to fill its container
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));

        // Set initial canvas styles
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.offsetWidth;
        this.canvas.height = container.offsetHeight;
    }

    getMousePos(e, snapToGrid = true) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panOffset.x) / this.zoom;
        const y = (e.clientY - rect.top - this.panOffset.y) / this.zoom;

        if (snapToGrid) {
            return {
                x: Math.round(x / 10) * 10, // GRID_SIZE = 10
                y: Math.round(y / 10) * 10
            };
        }
        return { x, y };
    }

    applyTransform() {
        this.ctx.save();
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);
    }

    restoreTransform() {
        this.ctx.restore();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    cleanup() {
        window.removeEventListener('resize', this.resizeCanvas.bind(this));
    }
} 