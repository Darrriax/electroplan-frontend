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
        const hoveredLightIds = this.store.getters['lights/getHoveredLightIds'] || [];

        // Draw each ceiling light
        ceilingLights.forEach(light => {
            this.drawCeilingLight(ctx, light, hoveredLightIds.includes(light.id));
        });
    }

    drawCeilingLight(ctx, light, isHovered) {
        const { x, y } = light.position;

        // Save context state
        ctx.save();
        
        // Apply canvas transforms
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(x, y);

        // Set styles
        ctx.strokeStyle = '#008000'; // Green color
        ctx.lineWidth = isHovered ? 3 : 1.5; // Increased line width for better visibility

        // Draw concentric circles
        const outerRadius = 12; // Largest circle radius in cm
        const middleRadius = 8; // Middle circle radius in cm
        const innerRadius = 4; // Smallest circle radius in cm

        // Draw highlight background if hovered
        if (isHovered) {
            ctx.fillStyle = 'rgba(0, 128, 0, 0.15)'; // Slightly more opaque
            ctx.beginPath();
            ctx.arc(0, 0, outerRadius + 3, 0, Math.PI * 2);
            ctx.fill();

            // Add glow effect
            ctx.shadowColor = 'rgba(0, 128, 0, 0.5)';
            ctx.shadowBlur = 5;
        }

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