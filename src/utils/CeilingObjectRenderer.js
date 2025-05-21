export default class CeilingObjectRenderer {
    constructor(store) {
        this.store = store;
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1;
    }

    updateTransform(panOffset, zoom) {
        this.panOffset = panOffset;
        this.zoom = zoom;
    }

    drawObjects(ctx) {
        // Get all ceiling lights from store
        const ceilingLights = this.store.getters['lights/getAllCeilingLights'] || [];

        // Draw each ceiling light
        ceilingLights.forEach(light => {
            this.drawCeilingLight(ctx, light);
        });
    }

    drawCeilingLight(ctx, light) {
        const { x, y } = light.position;

        // Save context state
        ctx.save();
        
        // Apply canvas transforms
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(x, y);

        // Set styles
        ctx.strokeStyle = '#008000'; // Green color
        ctx.lineWidth = 1;

        // Draw concentric circles
        const outerRadius = 12; // Largest circle radius in cm
        const middleRadius = 8; // Middle circle radius in cm
        const innerRadius = 4; // Smallest circle radius in cm

        // Draw outer circle
        ctx.beginPath();
        ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw middle circle
        ctx.beginPath();
        ctx.arc(0, 0, middleRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw inner circle
        ctx.beginPath();
        ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Restore context state
        ctx.restore();
    }
} 