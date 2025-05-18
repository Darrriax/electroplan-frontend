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
            room: null, // Reference to the room this object belongs to
            distances: null // Distances to walls
        };
    }

    // Calculate room center
    calculateRoomCenter(room) {
        if (!room || !room.path || room.path.length < 3) return null;

        let sumX = 0;
        let sumY = 0;
        let area = 0;
        
        for (let i = 0; i < room.path.length; i++) {
            const j = (i + 1) % room.path.length;
            const crossProduct = (room.path[i].x * room.path[j].y) - (room.path[j].x * room.path[i].y);
            
            sumX += (room.path[i].x + room.path[j].x) * crossProduct;
            sumY += (room.path[i].y + room.path[j].y) * crossProduct;
            area += crossProduct;
        }
        
        area /= 2;
        const factor = 1 / (6 * area);
        
        return {
            x: factor * sumX,
            y: factor * sumY
        };
    }

    // Calculate distances to walls
    calculateWallDistances(point, room) {
        if (!room || !room.path || room.path.length < 3) return null;

        const distances = [];
        
        for (let i = 0; i < room.path.length; i++) {
            const j = (i + 1) % room.path.length;
            const wall = {
                start: room.path[i],
                end: room.path[j]
            };
            
            // Calculate wall vector
            const wallVector = {
                x: wall.end.x - wall.start.x,
                y: wall.end.y - wall.start.y
            };
            
            // Calculate wall length
            const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);
            
            // Normalize wall vector
            const wallUnitVector = {
                x: wallVector.x / wallLength,
                y: wallVector.y / wallLength
            };
            
            // Calculate perpendicular vector (normal)
            const normal = {
                x: wallUnitVector.y,
                y: -wallUnitVector.x
            };

            // Get wall thickness from store (assuming it's stored in mm)
            const wallThickness = (this.store.state.walls?.defaultThickness || 100) / 10; // Convert to cm

            // Calculate inner wall points by offsetting the centerline by half thickness
            const innerWall = {
                start: {
                    x: wall.start.x + normal.x * (wallThickness / 2),
                    y: wall.start.y + normal.y * (wallThickness / 2)
                },
                end: {
                    x: wall.end.x + normal.x * (wallThickness / 2),
                    y: wall.end.y + normal.y * (wallThickness / 2)
                }
            };

            // Calculate vector from inner wall start to point
            const pointVector = {
                x: point.x - innerWall.start.x,
                y: point.y - innerWall.start.y
            };

            // Project point onto inner wall line
            const projection = {
                x: innerWall.start.x + wallUnitVector.x * (pointVector.x * wallUnitVector.x + pointVector.y * wallUnitVector.y),
                y: innerWall.start.y + wallUnitVector.y * (pointVector.x * wallUnitVector.x + pointVector.y * wallUnitVector.y)
            };

            // Check if projection falls within wall bounds
            const projectionToStart = {
                x: projection.x - innerWall.start.x,
                y: projection.y - innerWall.start.y
            };
            const projectionToEnd = {
                x: innerWall.end.x - projection.x,
                y: innerWall.end.y - projection.y
            };

            // Calculate dot products to check if projection is within wall segment
            const dotStart = projectionToStart.x * wallUnitVector.x + projectionToStart.y * wallUnitVector.y;
            const dotEnd = projectionToEnd.x * wallUnitVector.x + projectionToEnd.y * wallUnitVector.y;

            // Only proceed if projection falls within wall bounds
            if (dotStart >= 0 && dotEnd >= 0) {
                // Calculate perpendicular distance from point to inner wall line
                const distance = Math.abs(
                    pointVector.x * normal.x +
                    pointVector.y * normal.y
                );

                distances.push({
                    wall: innerWall,
                    distance,
                    normal,
                    isDebug: this.store.state.debug?.showInnerEdges
                });
            }
        }
        
        return distances;
    }

    // Calculate object position within room
    calculatePosition(mousePoint, rooms) {
        const room = this.findContainingRoom(mousePoint, rooms);
        if (!room) return null;

        // Calculate room center
        const center = this.calculateRoomCenter(room);
        if (!center) return null;

        // Calculate distance from mouse to room center
        const distanceToCenter = Math.sqrt(
            Math.pow(mousePoint.x - center.x, 2) +
            Math.pow(mousePoint.y - center.y, 2)
        );

        // Define snap threshold (15cm in world units) - reduced from 30cm
        const snapThreshold = 15;

        // Determine final position - snap to center if within threshold
        const position = {
            x: distanceToCenter <= snapThreshold ? center.x : mousePoint.x,
            y: distanceToCenter <= snapThreshold ? center.y : mousePoint.y,
            room: room.id
        };

        // Calculate distances to walls
        const distances = this.calculateWallDistances(position, room);

        // If we're near the center, add a visual indicator
        const isNearCenter = distanceToCenter <= snapThreshold;

        return {
            ...position,
            distances,
            isNearCenter
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

    // Format distance for display
    formatDistance(distance) {
        const unit = this.store.state.project.unit;
        let value, unitLabel;

        switch (unit) {
            case 'mm':
                value = (distance * 10).toFixed(0); // Convert from internal units (cm) to mm
                unitLabel = 'mm';
                break;
            case 'm':
                value = (distance / 100).toFixed(2); // Convert from internal units (cm) to m
                unitLabel = 'm';
                break;
            case 'cm':
            default:
                value = distance.toFixed(1); // Internal units are already in cm
                unitLabel = 'cm';
                break;
        }

        return `${value} ${unitLabel}`;
    }

    // Draw preview of the object
    drawPreview(ctx, preview) {
        if (!preview.position) return;

        const { x, y, distances, isNearCenter } = preview.position;
        
        ctx.save();
        // Apply canvas transformations
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);

        // Draw center snap indicator if near center
        if (isNearCenter) {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            ctx.lineWidth = 1 / this.zoom;
            
            // Draw crosshair
            const crosshairSize = 20 / this.zoom;
            ctx.beginPath();
            ctx.moveTo(x - crosshairSize, y);
            ctx.lineTo(x + crosshairSize, y);
            ctx.moveTo(x, y - crosshairSize);
            ctx.lineTo(x, y + crosshairSize);
            ctx.stroke();
            
            // Draw circle
            ctx.beginPath();
            ctx.arc(x, y, crosshairSize * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw circle representing the ceiling light
        ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
        ctx.strokeStyle = '#0096FF';
        ctx.lineWidth = 1 / this.zoom;

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

        // Draw dimensions if distances are available
        if (distances) {
            ctx.strokeStyle = '#666';
            // Update font styling to match other objects
            ctx.font = `${12 / this.zoom}px Arial`;
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            distances.forEach(({ wall, distance, normal, isDebug }) => {
                // Draw inner wall edges for debugging if enabled
                if (isDebug) {
                    ctx.save();
                    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                    ctx.lineWidth = 2 / this.zoom;
                    ctx.beginPath();
                    ctx.moveTo(wall.start.x, wall.start.y);
                    ctx.lineTo(wall.end.x, wall.end.y);
                    ctx.stroke();
                    ctx.restore();
                }

                // Draw dimension line
                const dimensionOffset = 20 / this.zoom;
                
                // Calculate extension line end point
                const extensionEnd = {
                    x: x - normal.x * distance,
                    y: y - normal.y * distance
                };
                
                // Draw extension line
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(extensionEnd.x, extensionEnd.y);
                ctx.stroke();
                
                // Draw dimension text
                const textPoint = {
                    x: x - normal.x * (distance / 2),
                    y: y - normal.y * (distance / 2)
                };
                
                // Draw text background
                const text = this.formatDistance(distance);
                const textWidth = ctx.measureText(text).width + 4;
                const textHeight = 16 / this.zoom; // Scale text background height with zoom
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillRect(
                    textPoint.x - textWidth/2,
                    textPoint.y - textHeight/2,
                    textWidth,
                    textHeight
                );
                
                // Draw text
                ctx.fillStyle = '#333';
                ctx.fillText(text, textPoint.x, textPoint.y);
            });
        }

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