// WallLampManager.js - Handles wall-mounted lamps
import WallMountedObjectManager from './WallMountedObjectManager';

export default class WallLampManager extends WallMountedObjectManager {
    constructor(ctx, store) {
        super(ctx, store);
    }

    // Implement abstract methods
    drawObject(type, size) {
        switch (type) {
            case 'wall-light':
                this.drawWallLight(size);
                break;
            case 'sconce':
                this.drawSconce(size);
                break;
            case 'spotlight':
                this.drawSpotlight(size);
                break;
            default:
                this.drawWallLight(size);
        }
    }

    getCurrentObjectConfig() {
        return this.store.state.lamps.currentConfig;
    }

    getActiveMode() {
        return 'wall-lamps';
    }

    // Lamp type drawing methods
    drawWallLight(size) {
        const width = size;
        const height = size * 0.5;
        
        // Draw mounting plate
        this.ctx.beginPath();
        this.ctx.rect(-width/2, -height/2, width, height);
        this.ctx.stroke();

        // Draw light diffuser
        const diffuserMargin = size * 0.1;
        const diffuserRadius = (height - 2 * diffuserMargin) / 2;
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, diffuserRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Draw light rays
        const rayCount = 8;
        const rayLength = size * 0.2;
        
        for (let i = 0; i < rayCount; i++) {
            const angle = (i * 2 * Math.PI) / rayCount;
            const startX = diffuserRadius * Math.cos(angle);
            const startY = diffuserRadius * Math.sin(angle);
            const endX = (diffuserRadius + rayLength) * Math.cos(angle);
            const endY = (diffuserRadius + rayLength) * Math.sin(angle);

            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
        }
    }

    drawSconce(size) {
        const width = size * 0.6;
        const height = size;
        
        // Draw mounting plate
        this.ctx.beginPath();
        this.ctx.rect(-width/2, -height/2, width, height);
        this.ctx.stroke();

        // Draw decorative curves
        const curveMargin = size * 0.1;
        const curveHeight = height - 2 * curveMargin;
        
        this.ctx.beginPath();
        this.ctx.moveTo(-width/2 + curveMargin, -height/2 + curveMargin);
        this.ctx.quadraticCurveTo(
            0, -height/2 + curveHeight/2,
            width/2 - curveMargin, -height/2 + curveMargin
        );
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(-width/2 + curveMargin, height/2 - curveMargin);
        this.ctx.quadraticCurveTo(
            0, height/2 - curveHeight/2,
            width/2 - curveMargin, height/2 - curveMargin
        );
        this.ctx.stroke();

        // Draw light source
        const lightRadius = size * 0.15;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, lightRadius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawSpotlight(size) {
        const baseWidth = size * 0.4;
        const baseHeight = size * 0.4;
        const spotRadius = size * 0.3;
        
        // Draw mounting base
        this.ctx.beginPath();
        this.ctx.rect(-baseWidth/2, -baseHeight/2, baseWidth, baseHeight);
        this.ctx.stroke();

        // Draw spotlight housing
        this.ctx.beginPath();
        this.ctx.arc(0, 0, spotRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Draw direction indicator
        const arrowLength = size * 0.4;
        const arrowWidth = size * 0.2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(-arrowLength/2, 0);
        this.ctx.lineTo(arrowLength/2, 0);
        this.ctx.moveTo(arrowLength/2 - arrowWidth, -arrowWidth);
        this.ctx.lineTo(arrowLength/2, 0);
        this.ctx.lineTo(arrowLength/2 - arrowWidth, arrowWidth);
        this.ctx.stroke();

        // Draw light beam lines
        const beamAngle = Math.PI / 4; // 45 degrees
        const beamLength = size * 0.6;
        
        this.ctx.beginPath();
        this.ctx.moveTo(spotRadius, 0);
        this.ctx.lineTo(spotRadius + beamLength, beamLength * Math.tan(beamAngle/2));
        this.ctx.moveTo(spotRadius, 0);
        this.ctx.lineTo(spotRadius + beamLength, -beamLength * Math.tan(beamAngle/2));
        this.ctx.stroke();
    }
} 