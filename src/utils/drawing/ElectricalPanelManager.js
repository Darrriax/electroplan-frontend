// ElectricalPanelManager.js - Handles electrical panels
import WallMountedObjectManager from './WallMountedObjectManager';

export default class ElectricalPanelManager extends WallMountedObjectManager {
    constructor(ctx, store) {
        super(ctx, store);
    }

    // Implement abstract methods
    drawObject(type, size) {
        switch (type) {
            case 'main-panel':
                this.drawMainPanel(size);
                break;
            case 'sub-panel':
                this.drawSubPanel(size);
                break;
            case 'distribution-box':
                this.drawDistributionBox(size);
                break;
            default:
                this.drawMainPanel(size);
        }
    }

    getCurrentObjectConfig() {
        return this.store.state.panels.currentConfig;
    }

    getActiveMode() {
        return 'electrical-panels';
    }

    // Panel type drawing methods
    drawMainPanel(size) {
        const halfSize = size / 2;
        const width = size;
        const height = size * 1.5;
        
        // Draw panel outline
        this.ctx.beginPath();
        this.ctx.rect(-width/2, -height/2, width, height);
        this.ctx.stroke();

        // Draw panel door
        const doorMargin = size * 0.1;
        this.ctx.beginPath();
        this.ctx.rect(
            -width/2 + doorMargin,
            -height/2 + doorMargin,
            width - 2 * doorMargin,
            height - 2 * doorMargin
        );
        this.ctx.stroke();

        // Draw handle
        const handleWidth = size * 0.15;
        const handleHeight = size * 0.3;
        this.ctx.beginPath();
        this.ctx.rect(width/2 - doorMargin - handleWidth, -handleHeight/2, handleWidth, handleHeight);
        this.ctx.fill();

        // Draw circuit breaker rows
        const rowCount = 4;
        const rowSpacing = (height - 2 * doorMargin) / (rowCount + 1);
        const breakerWidth = (width - 2 * doorMargin) * 0.8;

        for (let i = 1; i <= rowCount; i++) {
            const y = -height/2 + doorMargin + i * rowSpacing;
            this.ctx.beginPath();
            this.ctx.rect(-breakerWidth/2, y - size * 0.05, breakerWidth, size * 0.1);
            this.ctx.stroke();
        }
    }

    drawSubPanel(size) {
        const halfSize = size / 2;
        const width = size;
        const height = size * 1.2;
        
        // Draw panel outline
        this.ctx.beginPath();
        this.ctx.rect(-width/2, -height/2, width, height);
        this.ctx.stroke();

        // Draw panel door
        const doorMargin = size * 0.1;
        this.ctx.beginPath();
        this.ctx.rect(
            -width/2 + doorMargin,
            -height/2 + doorMargin,
            width - 2 * doorMargin,
            height - 2 * doorMargin
        );
        this.ctx.stroke();

        // Draw handle
        const handleWidth = size * 0.15;
        const handleHeight = size * 0.3;
        this.ctx.beginPath();
        this.ctx.rect(width/2 - doorMargin - handleWidth, -handleHeight/2, handleWidth, handleHeight);
        this.ctx.fill();

        // Draw circuit breaker rows
        const rowCount = 3;
        const rowSpacing = (height - 2 * doorMargin) / (rowCount + 1);
        const breakerWidth = (width - 2 * doorMargin) * 0.8;

        for (let i = 1; i <= rowCount; i++) {
            const y = -height/2 + doorMargin + i * rowSpacing;
            this.ctx.beginPath();
            this.ctx.rect(-breakerWidth/2, y - size * 0.05, breakerWidth, size * 0.1);
            this.ctx.stroke();
        }
    }

    drawDistributionBox(size) {
        const width = size;
        const height = size;
        
        // Draw box outline
        this.ctx.beginPath();
        this.ctx.rect(-width/2, -height/2, width, height);
        this.ctx.stroke();

        // Draw box door
        const doorMargin = size * 0.1;
        this.ctx.beginPath();
        this.ctx.rect(
            -width/2 + doorMargin,
            -height/2 + doorMargin,
            width - 2 * doorMargin,
            height - 2 * doorMargin
        );
        this.ctx.stroke();

        // Draw handle
        const handleWidth = size * 0.15;
        const handleHeight = size * 0.3;
        this.ctx.beginPath();
        this.ctx.rect(width/2 - doorMargin - handleWidth, -handleHeight/2, handleWidth, handleHeight);
        this.ctx.fill();

        // Draw distribution terminals
        const terminalRows = 2;
        const terminalCols = 3;
        const terminalSize = size * 0.1;
        const terminalSpacing = size * 0.2;

        for (let row = 0; row < terminalRows; row++) {
            for (let col = 0; col < terminalCols; col++) {
                const x = (col - 1) * terminalSpacing;
                const y = (row - 0.5) * terminalSpacing;
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, terminalSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
} 