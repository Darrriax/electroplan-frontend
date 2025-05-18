// ObjectManagerFactory.js - Factory for creating and managing object previews
import WallCenteredObject from './objectManagers/WallCenteredObject';
import WallEdgeObject from './objectManagers/WallEdgeObject';
import CeilingObject from './objectManagers/CeilingObject';

export default class ObjectManagerFactory {
    constructor(store) {
        this.store = store;
        this.currentManager = null;
        this.preview = null;
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1;
    }

    // Update canvas transform state
    updateTransform(panOffset, zoom) {
        this.panOffset = panOffset;
        this.zoom = zoom;
        if (this.currentManager && this.currentManager.updateTransform) {
            this.currentManager.updateTransform(panOffset, zoom);
        }
    }

    // Initialize manager based on selected tool
    setTool(toolType) {
        // Clear existing preview
        this.preview = null;

        // Create appropriate manager based on tool type
        switch(toolType) {
            case 'door':
            case 'window':
            case 'panel':
                this.currentManager = new WallCenteredObject(this.store);
                break;
            case 'socket':
            case 'wall-light':
            case 'single-switch':
            case 'double-switch':
                this.currentManager = new WallEdgeObject(this.store);
                break;
            case 'ceiling-light':
                this.currentManager = new CeilingObject(this.store);
                break;
            default:
                this.currentManager = null;
                return;
        }

        // Initialize preview for the selected tool
        if (this.currentManager) {
            // Set initial transform state
            if (this.currentManager.updateTransform) {
                this.currentManager.updateTransform(this.panOffset, this.zoom);
            }
            this.preview = this.currentManager.initializePreview(toolType);
        }
    }

    // Update preview position based on mouse movement
    updatePreview(mousePoint) {
        if (!this.currentManager || !this.preview) return;

        // Convert screen coordinates to world coordinates if manager supports it
        const worldPoint = this.currentManager.screenToWorld ? 
            this.currentManager.screenToWorld(mousePoint) : 
            mousePoint;

        // Get walls and rooms from store
        const walls = this.store.state.walls.walls || [];
        const rooms = this.store.state.rooms.rooms || [];

        if (this.currentManager instanceof CeilingObject) {
            const position = this.currentManager.calculatePosition(worldPoint, rooms);
            if (position) {
                this.preview.position = position;
                this.preview.room = position.room;
            }
        } else {
            // For wall-based objects
            const { wall, position, distance } = this.currentManager.findNearestWall(worldPoint, walls);
            
            // Only update preview if mouse is close enough to a wall (e.g., within 50 pixels)
            if (wall && distance < 50 / this.zoom) { // Adjust snap distance for zoom
                this.preview.wall = wall;
                this.preview.position = position;
            } else {
                this.preview.wall = null;
                this.preview.position = null;
            }
        }
    }

    // Draw preview on canvas
    drawPreview(ctx) {
        if (!this.currentManager || !this.preview || !this.preview.position) return;

        // Save canvas state
        ctx.save();

        if (this.currentManager instanceof WallCenteredObject) {
            this.currentManager.drawPreview(ctx, this.preview, this.preview.wall);
        } else {
            this.currentManager.drawPreview(ctx, this.preview);
        }

        // Restore canvas state
        ctx.restore();
    }

    // Create final object when user clicks
    createObject() {
        if (!this.currentManager || !this.preview) return null;
        return this.currentManager.createObject();
    }

    // Check if current preview is valid for placement
    isValidPlacement() {
        return this.preview && this.preview.position !== null;
    }
} 