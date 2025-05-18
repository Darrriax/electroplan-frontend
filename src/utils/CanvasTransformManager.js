// CanvasTransformManager.js - Handles canvas transformations (pan, zoom, coordinate conversions)
export default class CanvasTransformManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Transform state
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1;
        this.isPanning = false;
        this.lastPanPosition = null;

        // Constants
        this.MIN_ZOOM = 0.1;
        this.MAX_ZOOM = 5;
        this.GRID_SIZE = 10;
    }

    // Convert screen coordinates to world coordinates
    screenToWorld(point) {
        return {
            x: (point.x - this.panOffset.x) / this.zoom,
            y: (point.y - this.panOffset.y) / this.zoom
        };
    }

    // Convert world coordinates to screen coordinates
    worldToScreen(point) {
        return {
            x: point.x * this.zoom + this.panOffset.x,
            y: point.y * this.zoom + this.panOffset.y
        };
    }

    // Get mouse position in canvas coordinates
    getMousePos(e, snapToGrid = true) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panOffset.x) / this.zoom;
        const y = (e.clientY - rect.top - this.panOffset.y) / this.zoom;

        if (snapToGrid) {
            return {
                x: Math.round(x / this.GRID_SIZE) * this.GRID_SIZE,
                y: Math.round(y / this.GRID_SIZE) * this.GRID_SIZE
            };
        }
        return { x, y };
    }

    // Start panning
    startPan(e) {
        this.isPanning = true;
        const rect = this.canvas.getBoundingClientRect();
        this.lastPanPosition = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        this.canvas.style.cursor = 'grabbing';
    }

    // Update pan position
    updatePan(e) {
        if (!this.isPanning || !this.lastPanPosition) return false;

        const rect = this.canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        this.panOffset.x += currentX - this.lastPanPosition.x;
        this.panOffset.y += currentY - this.lastPanPosition.y;
        
        this.lastPanPosition = { x: currentX, y: currentY };
        return true;
    }

    // End panning
    endPan() {
        this.isPanning = false;
        this.lastPanPosition = null;
        this.canvas.style.cursor = 'default';
    }

    // Handle zoom
    handleZoom(deltaY, zoomPoint) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = zoomPoint.x - rect.left;
        const mouseY = zoomPoint.y - rect.top;

        // Calculate world point before zoom
        const worldPoint = this.screenToWorld({
            x: mouseX,
            y: mouseY
        });

        // Update zoom
        const delta = deltaY > 0 ? 0.9 : 1.1;
        this.zoom = Math.min(Math.max(this.MIN_ZOOM, this.zoom * delta), this.MAX_ZOOM);

        // Calculate new screen point after zoom
        const newScreenPoint = this.worldToScreen(worldPoint);

        // Adjust pan offset to keep the point under mouse
        this.panOffset.x += mouseX - newScreenPoint.x;
        this.panOffset.y += mouseY - newScreenPoint.y;
    }

    // Apply transformations to context
    applyTransform() {
        this.ctx.save();
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);
    }

    // Restore context state
    restoreTransform() {
        this.ctx.restore();
    }

    // Reset transformations
    reset() {
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1;
        this.isPanning = false;
        this.lastPanPosition = null;
    }
} 