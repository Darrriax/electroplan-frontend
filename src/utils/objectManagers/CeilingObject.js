// CeilingObject.js - Manager for ceiling-mounted objects (ceiling lights)
import { v4 as uuidv4 } from 'uuid';

export default class CeilingObject {
    constructor(store) {
        this.store = store;
        this.preview = null;
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
            id: uuidv4(),
            type,
            position: null,
            dimensions: { ...this.defaultDimensions },
            room: null,
            distances: null
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
        
        // First, determine if the room path is clockwise
        let area = 0;
        for (let i = 0; i < room.path.length; i++) {
            const j = (i + 1) % room.path.length;
            area += (room.path[j].x - room.path[i].x) * (room.path[j].y + room.path[i].y);
        }
        const isClockwise = area < 0;
        
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
            
            // Calculate perpendicular vector (normal), always pointing inward
            const normal = {
                x: isClockwise ? -wallUnitVector.y : wallUnitVector.y,
                y: isClockwise ? wallUnitVector.x : -wallUnitVector.x
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

        // Calculate distances to walls first
        const distances = this.calculateWallDistances(mousePoint, room);
        if (!distances || distances.length === 0) return null;

        // Get minimum distance to any wall
        const minDistance = Math.min(...distances.map(d => d.distance));

        // Get the object radius (half of diameter)
        const objectRadius = this.defaultDimensions.diameter / 2;

        // If too close to any wall, return null to prevent placement
        if (minDistance < objectRadius) {
            return null;
        }

        // Calculate room center
        const center = this.calculateRoomCenter(room);
        if (!center) return null;

        // Calculate distance from mouse to room center
        const distanceToCenter = Math.sqrt(
            Math.pow(mousePoint.x - center.x, 2) +
            Math.pow(mousePoint.y - center.y, 2)
        );

        // Define snap threshold (15cm in world units)
        const snapThreshold = 15;

        // Determine final position - snap to center if within threshold
        const position = {
            x: distanceToCenter <= snapThreshold ? center.x : mousePoint.x,
            y: distanceToCenter <= snapThreshold ? center.y : mousePoint.y
        };

        // Recalculate distances for the final position if it was snapped to center
        const finalDistances = distanceToCenter <= snapThreshold ? 
            this.calculateWallDistances(position, room) : 
            distances;

        return {
            ...position,
            room: room.id,
            distances: finalDistances,
            isNearCenter: distanceToCenter <= snapThreshold
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
        if (!preview?.position) return;

        ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
        ctx.strokeStyle = '#0096FF';
        ctx.lineWidth = 1 / this.zoom;
        const { x, y, distances, isNearCenter } = preview.position;
        
        ctx.save();
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);

        // Draw center snap indicator if near center
        if (isNearCenter) {
            ctx.lineWidth = 1 / this.zoom;
            
            const crosshairSize = 20 / this.zoom;
            ctx.beginPath();
            ctx.moveTo(x - crosshairSize, y);
            ctx.lineTo(x + crosshairSize, y);
            ctx.moveTo(x, y - crosshairSize);
            ctx.lineTo(x, y + crosshairSize);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(x, y, crosshairSize * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        }


        // Draw concentric circles
        const outerRadius = 12;
        const middleRadius = 8;
        const innerRadius = 4;

        // Draw outer circle with fill
        ctx.beginPath();
        ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
        ctx.fill(); // Add fill
        ctx.stroke();

        // Draw middle circle
        ctx.beginPath();
        ctx.arc(x, y, middleRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw inner circle
        ctx.beginPath();
        ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw dimensions if distances are available
        if (distances) {
            ctx.strokeStyle = '#666';
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
                const extensionEnd = {
                    x: x - normal.x * distance,
                    y: y - normal.y * distance
                };
                
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(extensionEnd.x, extensionEnd.y);
                ctx.stroke();
                
                // Draw dimension text
                const textPoint = {
                    x: x - normal.x * (distance / 2),
                    y: y - normal.y * (distance / 2)
                };
                
                const text = this.formatDistance(distance);
                const textWidth = ctx.measureText(text).width + 4;
                const textHeight = 16 / this.zoom;
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillRect(
                    textPoint.x - textWidth/2,
                    textPoint.y - textHeight/2,
                    textWidth,
                    textHeight
                );
                
                ctx.fillStyle = '#333';
                ctx.fillText(text, textPoint.x, textPoint.y);
            });
        }

        ctx.restore();
    }

    // Create final object
    createObject(preview) {
        if (!preview?.position) return null;

        return {
            id: uuidv4(),
            type: preview.type,
            position: {
                x: preview.position.x,
                y: preview.position.y,
                room: preview.position.room
            }
        };
    }

    updatePreview(mousePoint) {
        if (!this.preview) return Infinity;

        // Get all rooms from store
        const rooms = this.store.state.rooms.rooms || [];

        // Calculate position with room center snapping and wall distances
        const position = this.calculatePosition(mousePoint, rooms);
        if (!position) {
            return Infinity;
        }

        // Update preview with all calculated information
        this.preview.position = position;

        return 0;
    }
} 