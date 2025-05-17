// ObjectManager.js - Handles wall-mounted objects (sockets, switches, lamps)
import { formatMeasurement } from '../unitConversion';

export default class ObjectManager {
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
            heightFromFloor: objectConfig.heightFromFloor
        };

        // Add to local array
        this.objects.push(newObject);

        // Notify store about the new object
        const storeModule = this.getStoreModuleForType(objectConfig.type);
        if (storeModule) {
            this.store.dispatch(`${storeModule}/createObject`, {
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
    }

    getCurrentObjectConfig() {
        const currentTool = this.store.state.project.currentTool;
        
        // Return configuration based on tool type
        switch (currentTool) {
            case 'standard-socket':
                return {
                    type: 'socket',
                    size: 80, // 8cm = 80mm
                    heightFromFloor: this.store.state.sockets.currentConfig.heightFromFloor
                };
            case 'wall-light':
                return {
                    type: 'wall-light',
                    size: 150, // 15cm = 150mm
                    heightFromFloor: this.store.state.lights.currentConfig.heightFromFloor
                };
            case 'single-switch':
            case 'double-switch':
            case 'triple-switch':
                return {
                    type: currentTool,
                    size: 80, // 8cm = 80mm
                    heightFromFloor: this.store.state.switches.currentConfig.heightFromFloor
                };
            default:
                return null;
        }
    }

    getStoreModuleForType(type) {
        // Map object types to their store modules
        const moduleMap = {
            'socket': 'sockets',
            'wall-light': 'lights',
            'single-switch': 'switches',
            'double-switch': 'switches',
            'triple-switch': 'switches'
        };
        return moduleMap[type];
    }

    updateObjectPreview(mouseEvent, walls) {
        // Only update preview if in power-sockets mode
        if (this.store.state.project.activeMode !== 'power-sockets') {
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

        let foundWall = false;

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

            // Calculate distance from point to wall
            const magnetDistance = this.distanceToLine(point, wall.start, wall.end);
            if (magnetDistance < 20) { // Magnetization threshold
                foundWall = true;

                // Calculate wall direction vector
                const wallDx = wall.end.x - wall.start.x;
                const wallDy = wall.end.y - wall.start.y;
                const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);
                const wallUnitX = wallDx / wallLength;
                const wallUnitY = wallDy / wallLength;

                // Calculate wall normal vector (perpendicular to wall)
                const normalX = -wallUnitY;
                const normalY = wallUnitX;

                // Calculate projection point on wall
                const projection = this.projectPointOnLine(point, internalStart, internalEnd);

                // Determine which side of the wall the point is on
                const sideVector = {
                    x: point.x - projection.x,
                    y: point.y - projection.y
                };
                const dotProduct = sideVector.x * normalX + sideVector.y * normalY;
                const wallSide = Math.sign(dotProduct);

                // Calculate object position offset from wall face
                const wallOffset = (wall.thickness / 2) * wallSide;
                
                // Position object with edge touching wall face
                const edgeOffset = wallSide * (objectSize / 2);
                const objectCenter = {
                    x: projection.x + normalX * (wallOffset + edgeOffset),
                    y: projection.y + normalY * (wallOffset + edgeOffset)
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
                    objectCenter.x = adjustedProjection.x + normalX * (wallOffset + edgeOffset);
                    objectCenter.y = adjustedProjection.y + normalY * (wallOffset + edgeOffset);
                    leftSegment = 0;
                    rightSegment = internalLength - objectSize;
                }
                // Adjust if too close to end
                else if (distanceFromStart > internalLength - objectSize/2) {
                    const adjustedProjection = {
                        x: internalEnd.x - (objectSize / 2) * wallUnitX,
                        y: internalEnd.y - (objectSize / 2) * wallUnitY
                    };
                    objectCenter.x = adjustedProjection.x + normalX * (wallOffset + edgeOffset);
                    objectCenter.y = adjustedProjection.y + normalY * (wallOffset + edgeOffset);
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
        if (!foundWall) {
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
        
        // Apply canvas transformations
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);
        
        // Move to object position and rotate
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        // Draw object with consistent size
        this.ctx.fillStyle = isMagnetized ? '#000000' : 'rgba(0, 0, 0, 0.5)';
        this.ctx.strokeStyle = isMagnetized ? '#000000' : 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 1 / this.zoom;

        // Convert size from mm to cm for display
        const sizeInCm = size / 10;

        // Draw object based on type
        this.drawObjectByType(type, sizeInCm);

        // Draw dimensions if magnetized to a wall
        if (isMagnetized && wall && this.store.state.project.activeMode === 'power-sockets') {
            const dimensionOffset = wallSide * 20;
            this.drawObjectDimensions(leftSegment, rightSegment, sizeInCm, dimensionOffset);
        }

        this.ctx.restore();
    }

    drawObjectByType(type, size) {
        switch (type) {
            case 'socket':
                // Draw socket as a square
                this.ctx.beginPath();
                this.ctx.rect(-size/2, -size/2, size, size);
                this.ctx.fill();
                this.ctx.stroke();
                break;
            case 'wall-light':
                // Draw wall light as a circle
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size/2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                break;
            case 'single-switch':
            case 'double-switch':
            case 'triple-switch':
                // Draw switch as a rectangle
                this.ctx.beginPath();
                this.ctx.rect(-size/2, -size/2, size, size * 1.5);
                this.ctx.fill();
                this.ctx.stroke();
                break;
        }
    }

    drawObjectDimensions(leftSegment, rightSegment, objectSize, offset) {
        this.ctx.save();
        this.ctx.strokeStyle = '#666';
        this.ctx.fillStyle = '#666';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);
        this.ctx.font = '12px Arial';
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
            const leftTextWidth = this.ctx.measureText(leftText).width;
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(-leftSegment/2 - objectSize/2 - leftTextWidth/2 - 2, offset - 8, leftTextWidth + 4, 16);
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
        const sizeTextWidth = this.ctx.measureText(sizeText).width;
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(-sizeTextWidth/2 - 2, offset - 8, sizeTextWidth + 4, 16);
        this.ctx.fillStyle = '#666';
        this.ctx.fillText(sizeText, 0, offset);

        if (rightSegment > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(objectSize/2, offset);
            this.ctx.lineTo(rightSegment + objectSize/2, offset);
            this.ctx.stroke();

            const rightText = formatMeasurement(rightSegment * 10, this.store.state.project.unit);
            // Add white background for text
            const rightTextWidth = this.ctx.measureText(rightText).width;
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(rightSegment/2 + objectSize/2 - rightTextWidth/2 - 2, offset - 8, rightTextWidth + 4, 16);
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(rightText, rightSegment/2 + objectSize/2, offset);
        }

        this.ctx.restore();
    }

    drawObject(object) {
        const { x, y, size, angle, wall, leftSegment, rightSegment, wallSide, type, heightFromFloor } = object;

        // Save current context state
        this.ctx.save();
        
        // Move to object position and rotate
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        // Draw object
        this.ctx.fillStyle = '#000000';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;

        // Convert size from mm to cm for display
        const sizeInCm = size / 10;
        
        // Always draw the object based on its type
        this.drawObjectByType(type, sizeInCm);

        // Only draw dimensions if in power-sockets mode
        if (wall && this.store.state.project.activeMode === 'power-sockets') {
            const dimensionOffset = wallSide * 20;
            this.drawObjectDimensions(leftSegment, rightSegment, sizeInCm, dimensionOffset);
            
            // Draw height from floor with proper styling
            const heightValue = formatMeasurement(heightFromFloor, this.store.state.project.unit);
            const heightText = `H = ${heightValue}`;
            
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Measure text for background
            const textWidth = this.ctx.measureText(heightText).width;
            const padding = 4;
            const rectWidth = textWidth + (padding * 2);
            const rectHeight = 20;
            
            // Draw background
            this.ctx.fillStyle = 'white';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1;
            
            // Draw rounded rectangle
            const radius = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(-rectWidth/2 + radius, -35 - rectHeight);
            this.ctx.lineTo(rectWidth/2 - radius, -35 - rectHeight);
            this.ctx.arcTo(rectWidth/2, -35 - rectHeight, rectWidth/2, -35 - rectHeight + radius, radius);
            this.ctx.lineTo(rectWidth/2, -35);
            this.ctx.arcTo(rectWidth/2, -35, rectWidth/2 - radius, -35, radius);
            this.ctx.lineTo(-rectWidth/2 + radius, -35);
            this.ctx.arcTo(-rectWidth/2, -35, -rectWidth/2, -35 - radius, radius);
            this.ctx.lineTo(-rectWidth/2, -35 - rectHeight + radius);
            this.ctx.arcTo(-rectWidth/2, -35 - rectHeight, -rectWidth/2 + radius, -35 - rectHeight, radius);
            this.ctx.closePath();
            
            this.ctx.fill();
            this.ctx.stroke();
            
            // Draw text
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(heightText, 0, -35 - (rectHeight/2));
        }

        this.ctx.restore();
    }

    // Helper methods
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

    distanceToLine(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;

        if (dx === 0 && dy === 0) {
            return Math.sqrt(
                Math.pow(point.x - lineStart.x, 2) + 
                Math.pow(point.y - lineStart.y, 2)
            );
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

    distance(p1, p2) {
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) + 
            Math.pow(p2.y - p1.y, 2)
        );
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

    draw() {
        // Save current context state
        this.ctx.save();
        
        // Apply canvas transformations for pan and zoom
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);

        // Always draw all placed objects, regardless of mode or tool state
        this.objects.forEach(object => {
            // Save the current transform state
            this.ctx.save();
            this.drawObject(object);
            this.ctx.restore();
        });

        // Only draw preview in power-sockets mode and if preview exists
        if (this.store.state.project.activeMode === 'power-sockets' && this.objectPreview) {
            this.drawObjectPreview();
        }

        // Restore context state
        this.ctx.restore();
    }
} 