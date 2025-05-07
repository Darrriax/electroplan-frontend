export class WallSnapManager {
    constructor(canvas, options) {
        this.canvas = canvas;
        this.store = options.store;
        this.snapDistance = 20; // Distance in pixels for snapping
        this.snapPoints = [];
        this.activeSnapPoint = null;
    }

    /**
     * Find wall endpoints to snap to
     * @returns {Array} - Array of snap points {x, y, type}
     */
    findSnapPoints() {
        const walls = this.store.state.walls.walls;
        const snapPoints = [];

        walls.forEach(wall => {
            // Add start and end points of each wall
            snapPoints.push({
                x: wall.start.x,
                y: wall.start.y,
                type: 'endpoint'
            });

            snapPoints.push({
                x: wall.end.x,
                y: wall.end.y,
                type: 'endpoint'
            });
        });

        this.snapPoints = snapPoints;
        return snapPoints;
    }

    /**
     * Find the nearest snap point to the given point
     * @param {Object} point - {x, y} coordinates to check against
     * @returns {Object|null} - The nearest snap point or null if none within distance
     */
    findNearestSnapPoint(point) {
        const walls = this.store.state.walls.walls;
        const candidates = [];

        // Add existing endpoints
        walls.forEach(wall => {
            candidates.push({ x: wall.start.x, y: wall.start.y, type: 'endpoint' });
            candidates.push({ x: wall.end.x, y: wall.end.y, type: 'endpoint' });
        });

        // Check edges and edge boundaries of each wall
        walls.forEach(wall => {
            const start = wall.start;
            const end = wall.end;
            const thickness = wall.thickness / 10; // Convert mm to canvas units
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length === 0) return;

            const unitDir = { x: dx / length, y: dy / length };
            const perp = { x: -dy / length, y: dx / length };
            const offset = thickness / 2;

            // Calculate edge line segments
            const edge1Start = {
                x: start.x + perp.x * offset,
                y: start.y + perp.y * offset
            };
            const edge1End = {
                x: end.x + perp.x * offset,
                y: end.y + perp.y * offset
            };
            const edge2Start = {
                x: start.x - perp.x * offset,
                y: start.y - perp.y * offset
            };
            const edge2End = {
                x: end.x - perp.x * offset,
                y: end.y - perp.y * offset
            };

            // Helper to find closest point on segment
            const closestOnSegment = (A, B, P) => {
                const t = ((P.x - A.x) * (B.x - A.x) + (P.y - A.y) * (B.y - A.y)) / ((B.x - A.x)**2 + (B.y - A.y)**2);
                const clampedT = Math.max(0, Math.min(1, t));
                return {
                    x: A.x + clampedT * (B.x - A.x),
                    y: A.y + clampedT * (B.y - A.y),
                    t: clampedT // Return the parameter value for boundary detection
                };
            };

            // Check edge1
            const closestEdge1 = closestOnSegment(edge1Start, edge1End, point);
            const dist1 = Math.hypot(point.x - closestEdge1.x, point.y - closestEdge1.y);

            if (dist1 <= this.snapDistance) {
                // Basic edge snapping
                candidates.push({
                    x: closestEdge1.x,
                    y: closestEdge1.y,
                    type: 'edge',
                    normal: perp,
                    wallThickness: thickness
                });

                // Edge boundary detection
                // If we're close to the start or end of the edge
                if (closestEdge1.t <= 0.1) {
                    // Near start of edge1
                    candidates.push({
                        x: edge1Start.x,
                        y: edge1Start.y,
                        type: 'edge-boundary',
                        alignment: {
                            edge: this.determineEdgeDirection(unitDir, perp, true)
                        },
                        wallThickness: thickness
                    });
                } else if (closestEdge1.t >= 0.9) {
                    // Near end of edge1
                    candidates.push({
                        x: edge1End.x,
                        y: edge1End.y,
                        type: 'edge-boundary',
                        alignment: {
                            edge: this.determineEdgeDirection(unitDir, perp, false)
                        },
                        wallThickness: thickness
                    });
                }
            }

            // Check edge2
            const closestEdge2 = closestOnSegment(edge2Start, edge2End, point);
            const dist2 = Math.hypot(point.x - closestEdge2.x, point.y - closestEdge2.y);

            if (dist2 <= this.snapDistance) {
                // Basic edge snapping
                candidates.push({
                    x: closestEdge2.x,
                    y: closestEdge2.y,
                    type: 'edge',
                    normal: { x: -perp.x, y: -perp.y },
                    wallThickness: thickness
                });

                // Edge boundary detection
                // If we're close to the start or end of the edge
                if (closestEdge2.t <= 0.1) {
                    // Near start of edge2
                    candidates.push({
                        x: edge2Start.x,
                        y: edge2Start.y,
                        type: 'edge-boundary',
                        alignment: {
                            edge: this.determineEdgeDirection(unitDir, { x: -perp.x, y: -perp.y }, true)
                        },
                        wallThickness: thickness
                    });
                } else if (closestEdge2.t >= 0.9) {
                    // Near end of edge2
                    candidates.push({
                        x: edge2End.x,
                        y: edge2End.y,
                        type: 'edge-boundary',
                        alignment: {
                            edge: this.determineEdgeDirection(unitDir, { x: -perp.x, y: -perp.y }, false)
                        },
                        wallThickness: thickness
                    });
                }
            }
        });

        // Find closest candidate
        let nearest = null;
        let minDist = Infinity;
        for (const candidate of candidates) {
            const dist = Math.hypot(point.x - candidate.x, point.y - candidate.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = candidate;
            }
        }

        return nearest && minDist <= this.snapDistance ? nearest : null;
    }

    /**
     * Determine which edge of the preview rectangle should align with the wall edge boundary
     * @param {Object} unitDir - Unit direction vector of the wall
     * @param {Object} normal - Normal vector of the wall edge
     * @param {boolean} isStart - Whether this is the start or end of the edge
     * @returns {string} - The edge of the preview rect that should align ('left', 'right', 'top', 'bottom')
     */
    determineEdgeDirection(unitDir, normal, isStart) {
        // The wall direction and normal help us determine which "side" of the preview rect
        // should align with the wall boundary

        // Determine the predominant direction of the wall
        const isHorizontal = Math.abs(unitDir.x) > Math.abs(unitDir.y);

        if (isHorizontal) {
            // Wall is more horizontal
            if (unitDir.x > 0) {
                // Wall goes right
                return isStart ? 'left' : 'right';
            } else {
                // Wall goes left
                return isStart ? 'right' : 'left';
            }
        } else {
            // Wall is more vertical
            if (unitDir.y > 0) {
                // Wall goes down
                return isStart ? 'top' : 'bottom';
            } else {
                // Wall goes up
                return isStart ? 'bottom' : 'top';
            }
        }
    }

    /**
     * Visualize the active snap point with a marker
     * @param {Object} snapPoint - The point to visualize
     */
    showSnapPointMarker(snapPoint) {
        this.clearSnapPointMarker();

        if (!snapPoint) return;

        // Create a circle to mark the snap point
        this.activeSnapPoint = new fabric.Circle({
            left: snapPoint.x,
            top: snapPoint.y,
            fill: snapPoint.type === 'edge-boundary' ? '#FF5722' : '#2196F3', // Different color for edge boundaries
            radius: snapPoint.type === 'edge-boundary' ? 6 : 5, // Slightly larger for edge boundaries
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
        });

        this.canvas.add(this.activeSnapPoint);
        this.canvas.requestRenderAll();
    }

    /**
     * Clear the snap point marker
     */
    clearSnapPointMarker() {
        if (this.activeSnapPoint) {
            this.canvas.remove(this.activeSnapPoint);
            this.activeSnapPoint = null;
            this.canvas.requestRenderAll();
        }
    }
}