// CeilingObject.js - Manager for ceiling-mounted objects (ceiling lights)
export default class CeilingObject {
    constructor(store) {
        this.store = store;
        this.defaultDimensions = {
            diameter: 15 // 15 cm diameter
        };
        // Canvas transform state
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1;
    }

    // Update canvas transform state
    updateTransform(panOffset, zoom) {
        this.panOffset = panOffset;
        this.zoom = zoom;
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

    // Initialize object preview when tool is selected
    initializePreview(type) {
        return {
            type,
            dimensions: { ...this.defaultDimensions },
            position: null,
            room: null // Reference to the room this object belongs to
        };
    }

    // Calculate object position within room
    calculatePosition(mousePoint, rooms) {
        const room = this.findContainingRoom(mousePoint, rooms);
        if (!room) return null;

        return {
            x: mousePoint.x,
            y: mousePoint.y,
            room: room.id
        };
    }

    // Find which room contains the given point
    findContainingRoom(point, rooms) {
        return rooms.find(room => this.isPointInRoom(point, room));
    }

    // Helper method to check if a point is inside a room
    isPointInRoom(point, room) {
        const path = room.path;
        let inside = false;

        // Ray casting algorithm to determine if point is inside polygon
        for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
            const xi = path[i].x, yi = path[i].y;
            const xj = path[j].x, yj = path[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            
            if (intersect) inside = !inside;
        }

        return inside;
    }

    // Draw preview of the object
    drawPreview(ctx, preview) {
        if (!preview.position) return;

        const { x, y } = preview.position;
        
        ctx.save();
        // Apply canvas transformations
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);

        // Draw circle representing the ceiling light
        ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
        ctx.strokeStyle = '#0096FF';
        ctx.lineWidth = 1 / this.zoom; // Adjust line width for zoom

        const radius = this.defaultDimensions.diameter / 2;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw cross in the center
        ctx.beginPath();
        ctx.moveTo(x - radius/2, y);
        ctx.lineTo(x + radius/2, y);
        ctx.moveTo(x, y - radius/2);
        ctx.lineTo(x, y + radius/2);
        ctx.stroke();

        ctx.restore();
    }

    // Create final object
    createObject(preview) {
        if (!preview.position) return null;

        return {
            id: Date.now().toString(),
            type: preview.type,
            position: preview.position,
            dimensions: preview.dimensions,
            room: preview.position.room
        };
    }
} 