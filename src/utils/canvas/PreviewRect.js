export class PreviewRect {
    constructor(canvas, options) {
        this.canvas = canvas;
        this.size = options.initialSize;
        this.rect = new fabric.Rect({
            width: this.size,
            height: this.size,
            fill: options.pattern,
            stroke: '#404040',
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
            hasControls: false,
            hasBorders: false,
            hoverCursor: 'crosshair',
            opacity: 0.8,
            visible: false
        });
        this.canvas.add(this.rect);
        this.snapManager = options.snapManager;
    }

    /**
     * Updates the rectangle position on canvas with edge-to-edge snapping
     * @param {number} x - X coordinate (cursor position)
     * @param {number} y - Y coordinate (cursor position)
     * @returns {Object} - Actual position after snapping {x, y}
     */
    updatePosition(x, y) {
        let position = { x, y };
        this.rect.set({ left: x, top: y });

        // Check for snapping if snapManager is available
        if (this.snapManager) {
            const snapPoint = this.snapManager.findNearestSnapPoint(position);

            if (snapPoint) {
                if (snapPoint.type === 'edge' && snapPoint.normal) {
                    // Apply edge-to-edge magnetization for wall edges
                    position = this.applyEdgeToEdgeSnapping(snapPoint);
                } else if (snapPoint.type === 'edge-boundary') {
                    // Handling for edge boundary points
                    position = this.applyEdgeBoundarySnapping(snapPoint);
                } else if (snapPoint.type === 'endpoint') {
                    // For endpoints, we need to handle differently to avoid center snapping
                    position = this.applyEndpointSnapping(snapPoint, x, y);
                }

                this.snapManager.showSnapPointMarker(snapPoint);
            } else {
                this.snapManager.clearSnapPointMarker();
            }
        }

        this.canvas.requestRenderAll();
        return position;
    }

    /**
     * Apply snapping for wall endpoints by determining the appropriate edge
     * @param {Object} snapPoint - The endpoint snap point
     * @param {number} cursorX - Original cursor X position
     * @param {number} cursorY - Original cursor Y position
     * @returns {Object} - The new position after snapping
     */
    applyEndpointSnapping(snapPoint, cursorX, cursorY) {
        // Half size of our preview rect
        const halfSize = this.size / 2;
        const { x, y } = snapPoint;

        // Calculate direction vector from endpoint to cursor
        const dirX = cursorX - x;
        const dirY = cursorY - y;

        // Normalize the direction vector
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        const normX = length > 0 ? dirX / length : 0;
        const normY = length > 0 ? dirY / length : 0;

        // Position the preview rect so its appropriate edge aligns with the endpoint
        const newLeft = x + normX * halfSize;
        const newTop = y + normY * halfSize;

        this.rect.set({
            left: newLeft,
            top: newTop
        });

        return { x: newLeft, y: newTop };
    }

    /**
     * Apply edge-to-edge snapping based on the normal vector of the wall edge
     * @param {Object} snapPoint - The snap point with normal vector
     * @returns {Object} - The new position after snapping
     */
    applyEdgeToEdgeSnapping(snapPoint) {
        // Half size of our preview rect
        const halfSize = this.size / 2;

        // The normal vector points outward from the wall
        const { normal, x, y } = snapPoint;

        // Calculate the new position where the edge of our preview rect
        // aligns exactly with the wall edge
        const newLeft = x + normal.x * halfSize;
        const newTop = y + normal.y * halfSize;

        // Set the position so the edge aligns perfectly with the wall edge
        this.rect.set({
            left: newLeft,
            top: newTop
        });

        return { x: newLeft, y: newTop };
    }

    /**
     * Apply snapping for wall edge boundaries to prevent protruding
     * @param {Object} snapPoint - The edge boundary snap point
     * @returns {Object} - The new position after snapping
     */
    applyEdgeBoundarySnapping(snapPoint) {
        const halfSize = this.size / 2;
        const { x, y, alignment } = snapPoint;

        let offsetX = 0;
        let offsetY = 0;

        // Determine the offset based on which edge should align
        // Position our rectangle so its edge exactly aligns with the wall boundary
        if (alignment.edge === 'left') {
            // Position the preview rect's left edge at the wall's left edge
            offsetX = halfSize;
        } else if (alignment.edge === 'right') {
            // Position the preview rect's right edge at the wall's right edge
            offsetX = -halfSize;
        } else if (alignment.edge === 'top') {
            // Position the preview rect's top edge at the wall's top edge
            offsetY = halfSize;
        } else if (alignment.edge === 'bottom') {
            // Position the preview rect's bottom edge at the wall's bottom edge
            offsetY = -halfSize;
        }

        // Set the position so the appropriate edge aligns with the wall edge boundary
        const newLeft = x + offsetX;
        const newTop = y + offsetY;

        this.rect.set({
            left: newLeft,
            top: newTop
        });

        return { x: newLeft, y: newTop };
    }

    /**
     * Sets rectangle visibility
     * @param {boolean} visible - Whether the rectangle should be visible
     */
    setVisible(visible) {
        this.rect.visible = visible;
        this.canvas.requestRenderAll();
    }

    /**
     * Updates rectangle size
     * @param {number} size - New width and height
     */
    updateSize(size) {
        this.size = size;
        this.rect.set({ width: size, height: size });
        this.canvas.requestRenderAll();
    }
}