// WallMountedObjectManager.js - Base class for wall-mounted objects
import { formatMeasurement } from '../unitConversion';

export default class WallMountedObjectManager {
    constructor(ctx, store) {
        this.ctx = ctx;
        this.store = store;
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1;
        this.lastMousePoint = null;
        
        // Initialize with empty object preview
        this.objectPreview = null;
        this.magnetWall = null;
        this.magnetPoint = null;

        // Initialize objects array
        this.objects = [];

        // Bind methods
        this.updateObjectPreview = this.updateObjectPreview.bind(this);
        this.drawObjectPreview = this.drawObjectPreview.bind(this);
        this.screenToWorld = this.screenToWorld.bind(this);
        this.worldToScreen = this.worldToScreen.bind(this);
        this.handleClick = this.handleClick.bind(this);
    }

    // Common methods from ObjectManager.js
    updateTransform(panOffset, zoom) {
        this.panOffset = panOffset || { x: 0, y: 0 };
        this.zoom = zoom || 1;
    }

    screenToWorld(point) {
        if (!point) return null;
        const rect = this.ctx.canvas.getBoundingClientRect();
        return {
            x: (point.x - rect.left - this.panOffset.x) / this.zoom,
            y: (point.y - rect.top - this.panOffset.y) / this.zoom
        };
    }

    worldToScreen(point) {
        if (!point) return null;
        return {
            x: point.x * this.zoom + this.panOffset.x,
            y: point.y * this.zoom + this.panOffset.y
        };
    }

    handleClick(mouseEvent) {
        if (!this.objectPreview || !this.objectPreview.isMagnetized) return;

        // Get current object config based on type
        const objectConfig = this.getCurrentObjectConfig();
        if (!objectConfig) return;

        // Add the object to the plan
        const newObject = {
            ...this.objectPreview,
            type: objectConfig.type,
            size: objectConfig.size,
            heightFromFloor: objectConfig.heightFromFloor,
            wallSide: this.objectPreview.wallSide
        };

        // Add to local array
        this.objects.push(newObject);

        // Create object in store
        this.store.dispatch('sockets/createObject', {
            x: newObject.x,
            y: newObject.y,
            size: newObject.size,
            angle: newObject.angle,
            wallId: newObject.wall.id,
            leftSegment: newObject.leftSegment,
            rightSegment: newObject.rightSegment,
            wallSide: newObject.wallSide,
            heightFromFloor: newObject.heightFromFloor,
            type: newObject.type
        });
    }

    updateObjectPreview(mouseEvent, walls) {
        // Only update preview if in power-sockets mode
        if (this.store.state.project.activeMode !== this.getActiveMode()) {
            this.clearPreview();
            return;
        }

        if (!mouseEvent || !walls) return;

        // Convert screen coordinates to world coordinates
        const point = this.screenToWorld({
            x: mouseEvent.clientX,
            y: mouseEvent.clientY
        });

        if (!point) return;

        // Skip update if mouse hasn't moved significantly
        if (!this.shouldUpdatePreview(point)) {
            return;
        }
        this.lastMousePoint = { ...point };

        // Reset preview state
        this.objectPreview = null;
        this.magnetWall = null;
        this.magnetPoint = null;

        // Get current object config
        const objectConfig = this.getCurrentObjectConfig();
        if (!objectConfig) return;

        // Find suitable walls for object placement
        for (const wall of walls) {
            if (!wall) continue;

            // Find connected walls at both ends to calculate internal dimensions
            const startConnections = this.findWallsConnectedToPoint(wall.start, walls);
            const endConnections = this.findWallsConnectedToPoint(wall.end, walls);

            // Calculate internal points accounting for wall thickness
            const internalPoints = this.calculateInternalPoints(wall, startConnections, endConnections);
            if (!internalPoints) continue;

            const { internalStart, internalEnd } = internalPoints;

            // Calculate internal wall length
            const internalDx = internalEnd.x - internalStart.x;
            const internalDy = internalEnd.y - internalStart.y;
            const internalLength = Math.sqrt(internalDx * internalDx + internalDy * internalDy);

            // Object size in cm
            const objectSize = objectConfig.size / 10; // Convert mm to cm
            if (internalLength < objectSize) continue;

            // Calculate wall direction vector
            const wallDx = wall.end.x - wall.start.x;
            const wallDy = wall.end.y - wall.start.y;
            const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);
            const wallUnitX = wallDx / wallLength;
            const wallUnitY = wallDy / wallLength;

            // Calculate wall normal vector (perpendicular to wall)
            const normalX = -wallUnitY;
            const normalY = wallUnitX;

            // Calculate both wall faces (top and bottom)
            const halfThickness = wall.thickness / 2;
            const topFace = {
                start: { x: wall.start.x + normalX * halfThickness, y: wall.start.y + normalY * halfThickness },
                end: { x: wall.end.x + normalX * halfThickness, y: wall.end.y + normalY * halfThickness }
            };
            const bottomFace = {
                start: { x: wall.start.x - normalX * halfThickness, y: wall.start.y - normalY * halfThickness },
                end: { x: wall.end.x - normalX * halfThickness, y: wall.end.y - normalY * halfThickness }
            };

            // Calculate distances to both faces
            const distanceToTopFace = this.distanceToLine(point, topFace.start, topFace.end) * this.zoom;
            const distanceToBottomFace = this.distanceToLine(point, bottomFace.start, bottomFace.end) * this.zoom;
            const magnetThreshold = 20; // Threshold in screen pixels

            // Check if point is close enough to either face
            if (Math.min(distanceToTopFace, distanceToBottomFace) < magnetThreshold) {
                // Determine which face is closer
                const isTopFaceCloser = distanceToTopFace < distanceToBottomFace;
                const wallSide = isTopFaceCloser ? 1 : -1;

                // Calculate projection point on the chosen face
                const chosenFace = isTopFaceCloser ? topFace : bottomFace;
                const projection = this.projectPointOnLine(point, chosenFace.start, chosenFace.end);

                // Calculate object position offset from wall face
                const edgeOffset = objectSize / 2;
                const objectCenter = {
                    x: projection.x + normalX * edgeOffset * wallSide,
                    y: projection.y + normalY * edgeOffset * wallSide
                };

                // Calculate distance from internal start to projection
                const projToStartX = projection.x - internalStart.x;
                const projToStartY = projection.y - internalStart.y;
                const distanceFromStart = Math.sqrt(projToStartX * projToStartX + projToStartY * projToStartY);

                // Ensure object stays within internal wall bounds
                let leftSegment = distanceFromStart;
                let rightSegment = internalLength - distanceFromStart;

                // Adjust if too close to start
                if (distanceFromStart < objectSize/2) {
                    const adjustedProjection = {
                        x: internalStart.x + (objectSize / 2) * wallUnitX,
                        y: internalStart.y + (objectSize / 2) * wallUnitY
                    };
                    objectCenter.x = adjustedProjection.x + normalX * edgeOffset * wallSide;
                    objectCenter.y = adjustedProjection.y + normalY * edgeOffset * wallSide;
                    leftSegment = 0;
                    rightSegment = internalLength - objectSize;
                }
                // Adjust if too close to end
                else if (distanceFromStart > internalLength - objectSize/2) {
                    const adjustedProjection = {
                        x: internalEnd.x - (objectSize / 2) * wallUnitX,
                        y: internalEnd.y - (objectSize / 2) * wallUnitY
                    };
                    objectCenter.x = adjustedProjection.x + normalX * edgeOffset * wallSide;
                    objectCenter.y = adjustedProjection.y + normalY * edgeOffset * wallSide;
                    leftSegment = internalLength - objectSize;
                    rightSegment = 0;
                } else {
                    // Adjust segments to account for object size
                    leftSegment = distanceFromStart - objectSize/2;
                    rightSegment = internalLength - distanceFromStart - objectSize/2;
                }

                // Calculate wall angle
                const wallAngle = Math.atan2(wallDy, wallDx);

                // Create object preview
                this.objectPreview = {
                    x: objectCenter.x,
                    y: objectCenter.y,
                    size: objectConfig.size,
                    angle: wallAngle,
                    wall: wall,
                    leftSegment,
                    rightSegment,
                    isMagnetized: true,
                    internalStart,
                    internalEnd,
                    wallSide,
                    type: objectConfig.type
                };

                this.magnetWall = wall;
                this.magnetPoint = objectCenter;
                break;
            }
        }

        // If not near any wall, show object at mouse position
        if (!this.magnetWall) {
            const objectConfig = this.getCurrentObjectConfig();
            this.objectPreview = {
                x: point.x,
                y: point.y,
                size: objectConfig.size,
                angle: 0,
                isMagnetized: false,
                type: objectConfig.type
            };
        }
    }

    drawObjectPreview() {
        if (!this.objectPreview) return;

        const { x, y, size, angle, wall, leftSegment, rightSegment, isMagnetized, wallSide, type } = this.objectPreview;

        this.ctx.save();
        
        // Apply global canvas transformations first
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);

        // Convert size from mm to cm for display
        const sizeInCm = size / 10;
        
        // Set styles with zoom-adjusted line width
        this.ctx.fillStyle = isMagnetized ? '#000000' : 'rgba(0, 0, 0, 0.5)';
        this.ctx.strokeStyle = isMagnetized ? '#000000' : 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 1 / this.zoom;

        // Move to object position and rotate
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        // Draw object based on type
        this.drawObject(type, sizeInCm);

        // Draw dimensions if magnetized to a wall
        if (isMagnetized && wall) {
            const dimensionOffset = (wallSide * 20) / this.zoom;
            this.drawObjectDimensions(leftSegment, rightSegment, sizeInCm, dimensionOffset);
        }

        this.ctx.restore();
    }

    // Methods that should be implemented by child classes
    drawObject(type, size) {
        throw new Error('drawObject method must be implemented by child class');
    }

    getCurrentObjectConfig() {
        throw new Error('getCurrentObjectConfig method must be implemented by child class');
    }

    getActiveMode() {
        throw new Error('getActiveMode method must be implemented by child class');
    }

    // Helper methods
    distance(p1, p2) {
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) + 
            Math.pow(p2.y - p1.y, 2)
        );
    }

    distanceToLine(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;

        if (dx === 0 && dy === 0) {
            return this.distance(point, lineStart);
        }

        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);

        if (t < 0) return this.distance(point, lineStart);
        if (t > 1) return this.distance(point, lineEnd);

        const projection = {
            x: lineStart.x + t * dx,
            y: lineStart.y + t * dy
        };

        return this.distance(point, projection);
    }

    projectPointOnLine(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;

        if (dx === 0 && dy === 0) return { ...lineStart };

        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);

        return {
            x: lineStart.x + t * dx,
            y: lineStart.y + t * dy
        };
    }

    findWallsConnectedToPoint(point, walls) {
        return walls.filter(wall => 
            (Math.abs(wall.start.x - point.x) < 1 && Math.abs(wall.start.y - point.y) < 1) ||
            (Math.abs(wall.end.x - point.x) < 1 && Math.abs(wall.end.y - point.y) < 1)
        );
    }

    calculateInternalPoints(wall, startConnections, endConnections) {
        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < 0.001) return null;

        // Calculate unit vectors
        const ux = dx / length;
        const uy = dy / length;

        // Find perpendicular walls
        const startPerpendicularWalls = startConnections.filter(connectedWall => {
            const angle = this.calculateWallAngle(wall, connectedWall, wall.start);
            return angle !== null && Math.abs(angle - 90) < 15;
        });

        const endPerpendicularWalls = endConnections.filter(connectedWall => {
            const angle = this.calculateWallAngle(wall, connectedWall, wall.end);
            return angle !== null && Math.abs(angle - 90) < 15;
        });

        // Get thicknesses
        const startThickness = startPerpendicularWalls.length > 0 
            ? Math.max(...startPerpendicularWalls.map(w => w.thickness)) / 2
            : 0;
        const endThickness = endPerpendicularWalls.length > 0 
            ? Math.max(...endPerpendicularWalls.map(w => w.thickness)) / 2
            : 0;

        // Calculate internal points
        return {
            internalStart: {
                x: wall.start.x + startThickness * ux,
                y: wall.start.y + startThickness * uy
            },
            internalEnd: {
                x: wall.end.x - endThickness * ux,
                y: wall.end.y - endThickness * uy
            }
        };
    }

    calculateWallAngle(wall1, wall2, sharedPoint) {
        try {
            // Get vectors for both walls
            let vec1, vec2;
            
            if (this.distance(sharedPoint, wall1.start) < 1) {
                vec1 = {
                    x: wall1.end.x - wall1.start.x,
                    y: wall1.end.y - wall1.start.y
                };
            } else {
                vec1 = {
                    x: wall1.start.x - wall1.end.x,
                    y: wall1.start.y - wall1.end.y
                };
            }
            
            if (this.distance(sharedPoint, wall2.start) < 1) {
                vec2 = {
                    x: wall2.end.x - wall2.start.x,
                    y: wall2.end.y - wall2.start.y
                };
            } else {
                vec2 = {
                    x: wall2.start.x - wall2.end.x,
                    y: wall2.start.y - wall2.end.y
                };
            }

            // Calculate angle
            const dot = vec1.x * vec2.x + vec1.y * vec2.y;
            const mag1 = Math.sqrt(vec1.x * vec1.x + vec1.y * vec1.y);
            const mag2 = Math.sqrt(vec2.x * vec2.x + vec2.y * vec2.y);
            
            if (mag1 === 0 || mag2 === 0) return null;

            const cosAngle = dot / (mag1 * mag2);
            const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
            return Math.round(Math.acos(clampedCosAngle) * 180 / Math.PI);
        } catch (error) {
            console.error('Error calculating wall angle:', error);
            return null;
        }
    }

    shouldUpdatePreview(point) {
        if (!this.lastMousePoint) return true;
        
        const dx = point.x - this.lastMousePoint.x;
        const dy = point.y - this.lastMousePoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance > 1;
    }

    clearPreview() {
        this.objectPreview = null;
        this.magnetWall = null;
        this.magnetPoint = null;
    }

    drawObjectDimensions(leftSegment, rightSegment, objectSize, offset) {
        this.ctx.save();
        
        // Set styles with zoom-adjusted properties
        this.ctx.strokeStyle = '#666';
        this.ctx.fillStyle = '#666';
        this.ctx.lineWidth = 1 / this.zoom;
        this.ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);
        this.ctx.font = `${12 / this.zoom}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Draw extension lines
        this.ctx.beginPath();
        this.ctx.moveTo(-leftSegment - objectSize/2, 0);
        this.ctx.lineTo(-leftSegment - objectSize/2, offset);
        this.ctx.moveTo(rightSegment + objectSize/2, 0);
        this.ctx.lineTo(rightSegment + objectSize/2, offset);
        this.ctx.stroke();

        // Draw dimension lines and text
        if (leftSegment > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(-leftSegment - objectSize/2, offset);
            this.ctx.lineTo(-objectSize/2, offset);
            this.ctx.stroke();

            const leftText = formatMeasurement(leftSegment * 10, this.store.state.project.unit);
            // Add white background for text
            const leftTextWidth = (this.ctx.measureText(leftText).width);
            const textPadding = 2 / this.zoom;
            const textHeight = 16 / this.zoom;
            
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(
                -leftSegment/2 - objectSize/2 - leftTextWidth/2 - textPadding,
                offset - textHeight/2,
                leftTextWidth + textPadding * 2,
                textHeight
            );
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(leftText, -leftSegment/2 - objectSize/2, offset);
        }

        // Object width
        this.ctx.beginPath();
        this.ctx.moveTo(-objectSize/2, offset);
        this.ctx.lineTo(objectSize/2, offset);
        this.ctx.stroke();

        const sizeText = formatMeasurement(objectSize * 10, this.store.state.project.unit);
        // Add white background for text
        const sizeTextWidth = (this.ctx.measureText(sizeText).width);
        const textPadding = 2 / this.zoom;
        const textHeight = 16 / this.zoom;
        
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(
            -sizeTextWidth/2 - textPadding,
            offset - textHeight/2,
            sizeTextWidth + textPadding * 2,
            textHeight
        );
        this.ctx.fillStyle = '#666';
        this.ctx.fillText(sizeText, 0, offset);

        if (rightSegment > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(objectSize/2, offset);
            this.ctx.lineTo(rightSegment + objectSize/2, offset);
            this.ctx.stroke();

            const rightText = formatMeasurement(rightSegment * 10, this.store.state.project.unit);
            // Add white background for text
            const rightTextWidth = (this.ctx.measureText(rightText).width);
            
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(
                rightSegment/2 + objectSize/2 - rightTextWidth/2 - textPadding,
                offset - textHeight/2,
                rightTextWidth + textPadding * 2,
                textHeight
            );
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(rightText, rightSegment/2 + objectSize/2, offset);
        }

        this.ctx.restore();
    }
} 