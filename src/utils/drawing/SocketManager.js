// SocketManager.js - Handles socket drawing and manipulation
import { formatMeasurement } from '../unitConversion';
import WallMountedObjectManager from './WallMountedObjectManager';

export default class SocketManager extends WallMountedObjectManager {
    constructor(ctx, store) {
        super(ctx, store);
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1;
        this.lastMousePoint = null;
        
        // Initialize with empty socket preview
        this.socketPreview = null;
        this.magnetWall = null;
        this.magnetPoint = null;

        // Initialize sockets array
        this.sockets = [];

        // Bind methods
        this.updateSocketPreview = this.updateSocketPreview.bind(this);
        this.drawSocketPreview = this.drawSocketPreview.bind(this);
        this.screenToWorld = this.screenToWorld.bind(this);
        this.worldToScreen = this.worldToScreen.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.draw = this.draw.bind(this);

        // Subscribe to store changes
        this.unsubscribe = this.store.subscribe((mutation) => {
            if (mutation.type === 'sockets/updateObjects') {
                this.syncWithStore();
                this.draw();
            }
        });

        // Initial sync with store
        this.syncWithStore();
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
        if (!this.socketPreview || !this.socketPreview.isMagnetized) return;

        // Add the socket to the plan
        const newSocket = {
            ...this.socketPreview,
            type: this.store.state.sockets.currentConfig.type,
            heightFromFloor: this.store.state.sockets.currentConfig.heightFromFloor
        };

        // Add to local array
        this.sockets.push(newSocket);

        // Notify store about the new socket
        if (this.store.state.sockets) {
            this.store.dispatch('sockets/createSocket', {
                x: newSocket.x,
                y: newSocket.y,
                size: newSocket.size,
                angle: newSocket.angle,
                wallId: newSocket.wall.id,
                leftSegment: newSocket.leftSegment,
                rightSegment: newSocket.rightSegment,
                wallSide: newSocket.wallSide
            });
        }
    }

    updateSocketPreview(mouseEvent, walls) {
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
        this.socketPreview = null;
        this.magnetWall = null;
        this.magnetPoint = null;

        let foundWall = false;

        // Find suitable walls for socket placement
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

            // Socket size is 8cm
            const socketSize = 8;
            if (internalLength < socketSize) continue;

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

                // Calculate socket position offset from wall face
                const wallOffset = (wall.thickness / 2) * wallSide;
                
                // Position socket with edge touching wall face
                const edgeOffset = wallSide * (socketSize / 2);
                const socketCenter = {
                    x: projection.x + normalX * (wallOffset + edgeOffset),
                    y: projection.y + normalY * (wallOffset + edgeOffset)
                };

                // Calculate distance from internal start to projection
                const projToStartX = projection.x - internalStart.x;
                const projToStartY = projection.y - internalStart.y;
                const distanceFromStart = Math.sqrt(projToStartX * projToStartX + projToStartY * projToStartY);

                // Ensure socket stays within internal wall bounds
                let leftSegment = distanceFromStart;
                let rightSegment = internalLength - distanceFromStart;

                // Adjust if too close to start
                if (distanceFromStart < socketSize/2) {
                    const adjustedProjection = {
                        x: internalStart.x + (socketSize / 2) * wallUnitX,
                        y: internalStart.y + (socketSize / 2) * wallUnitY
                    };
                    socketCenter.x = adjustedProjection.x + normalX * (wallOffset + edgeOffset);
                    socketCenter.y = adjustedProjection.y + normalY * (wallOffset + edgeOffset);
                    leftSegment = 0;
                    rightSegment = internalLength - socketSize;
                }
                // Adjust if too close to end
                else if (distanceFromStart > internalLength - socketSize/2) {
                    const adjustedProjection = {
                        x: internalEnd.x - (socketSize / 2) * wallUnitX,
                        y: internalEnd.y - (socketSize / 2) * wallUnitY
                    };
                    socketCenter.x = adjustedProjection.x + normalX * (wallOffset + edgeOffset);
                    socketCenter.y = adjustedProjection.y + normalY * (wallOffset + edgeOffset);
                    leftSegment = internalLength - socketSize;
                    rightSegment = 0;
                } else {
                    // Adjust segments to account for socket size
                    leftSegment = distanceFromStart - socketSize/2;
                    rightSegment = internalLength - distanceFromStart - socketSize/2;
                }

                // Calculate wall angle
                const wallAngle = Math.atan2(wallDy, wallDx);

                // Create socket preview
                this.socketPreview = {
                    x: socketCenter.x,
                    y: socketCenter.y,
                    size: socketSize,
                    angle: wallAngle,
                    wall: wall,
                    leftSegment,
                    rightSegment,
                    isMagnetized: true,
                    internalStart,
                    internalEnd,
                    wallSide
                };

                this.magnetWall = wall;
                this.magnetPoint = socketCenter;
                break;
            }
        }

        // If not near any wall, show socket at mouse position
        if (!foundWall) {
            const socketSize = 8; // Socket size is 8cm
            this.socketPreview = {
                x: point.x,
                y: point.y,
                size: socketSize,
                angle: 0,
                isMagnetized: false
            };
        }
    }

    drawSocketPreview() {
        if (!this.socketPreview) return;

        const { x, y, size, angle, wall, leftSegment, rightSegment, isMagnetized, wallSide } = this.socketPreview;

        this.ctx.save();
        
        // Apply canvas transformations
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);
        
        // Move to socket position and rotate
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        // Draw socket square with consistent size
        this.ctx.fillStyle = isMagnetized ? '#000000' : 'rgba(0, 0, 0, 0.5)';
        this.ctx.strokeStyle = isMagnetized ? '#000000' : 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 1 / this.zoom; // Scale line width with zoom

        // Draw socket square
        this.ctx.beginPath();
        this.ctx.rect(-size/2, -size/2, size, size);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw dimensions if magnetized to a wall
        if (isMagnetized && wall && this.store.state.project.activeMode === 'power-sockets') {
            // Adjust dimension line offset based on which side of the wall the socket is on
            const dimensionOffset = wallSide * 20; // Use wallSide to determine direction
            this.drawSocketSegmentDimensions(leftSegment, rightSegment, size, dimensionOffset);
        }

        this.ctx.restore();
    }

    drawSocketSegmentDimensions(leftSegment, rightSegment, socketSize, offset) {
        this.ctx.save();
        this.ctx.strokeStyle = '#666';
        this.ctx.fillStyle = '#666';
        this.ctx.lineWidth = 1 / this.zoom;
        this.ctx.setLineDash([4, 4]);
        this.ctx.font = `${12 / this.zoom}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Draw extension lines from internal wall points
        this.ctx.beginPath();
        this.ctx.moveTo(-leftSegment - socketSize/2, 0);
        this.ctx.lineTo(-leftSegment - socketSize/2, offset);
        this.ctx.moveTo(rightSegment + socketSize/2, 0);
        this.ctx.lineTo(rightSegment + socketSize/2, offset);
        this.ctx.stroke();

        // Draw dimension lines and text
        if (leftSegment > 0) {
            // Left segment
            this.ctx.beginPath();
            this.ctx.moveTo(-leftSegment - socketSize/2, offset);
            this.ctx.lineTo(-socketSize/2, offset);
            this.ctx.stroke();

            // Left segment text
            const leftText = formatMeasurement(leftSegment * 10, this.store.state.project.unit);
            const leftMidpoint = -socketSize/2 - leftSegment/2;
            this.drawDimensionText(leftText, leftMidpoint, offset);
        }

        // Socket width
        this.ctx.beginPath();
        this.ctx.moveTo(-socketSize/2, offset);
        this.ctx.lineTo(socketSize/2, offset);
        this.ctx.stroke();

        // Socket width text
        const socketText = formatMeasurement(socketSize * 10, this.store.state.project.unit);
        this.drawDimensionText(socketText, 0, offset);

        if (rightSegment > 0) {
            // Right segment
            this.ctx.beginPath();
            this.ctx.moveTo(socketSize/2, offset);
            this.ctx.lineTo(socketSize/2 + rightSegment, offset);
            this.ctx.stroke();

            // Right segment text
            const rightText = formatMeasurement(rightSegment * 10, this.store.state.project.unit);
            const rightMidpoint = socketSize/2 + rightSegment/2;
            this.drawDimensionText(rightText, rightMidpoint, offset);
        }

        this.ctx.restore();
    }

    drawDimensionText(text, x, y) {
        const textWidth = this.ctx.measureText(text).width;
        const padding = 2;

        // Draw white background
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(
            x - textWidth/2 - padding,
            y - 8,
            textWidth + padding * 2,
            16
        );

        // Draw text
        this.ctx.fillStyle = '#666';
        this.ctx.fillText(text, x, y);
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

        // Calculate unit vectors for wall direction and normal
        const ux = dx / length;  // Unit vector in wall direction
        const uy = dy / length;
        const nx = -dy / length; // Normal vector (perpendicular to wall)
        const ny = dx / length;

        // Find perpendicular walls at each end
        const startPerpendicularWalls = startConnections.filter(connectedWall => {
            const angle = this.calculateWallAngle(wall, connectedWall, wall.start);
            return angle !== null && Math.abs(angle - 90) < 15;
        });

        const endPerpendicularWalls = endConnections.filter(connectedWall => {
            const angle = this.calculateWallAngle(wall, connectedWall, wall.end);
            return angle !== null && Math.abs(angle - 90) < 15;
        });

        // Get the thicknesses of perpendicular walls
        const startThickness = startPerpendicularWalls.length > 0 
            ? Math.max(...startPerpendicularWalls.map(w => w.thickness)) / 2  // Use half thickness
            : 0;
        const endThickness = endPerpendicularWalls.length > 0 
            ? Math.max(...endPerpendicularWalls.map(w => w.thickness)) / 2  // Use half thickness
            : 0;

        // Calculate internal points using half of perpendicular wall thicknesses
        const internalStart = {
            x: wall.start.x + startThickness * ux,
            y: wall.start.y + startThickness * uy
        };

        const internalEnd = {
            x: wall.end.x - endThickness * ux,
            y: wall.end.y - endThickness * uy
        };

        return { internalStart, internalEnd };
    }

    calculateWallAngle(wall1, wall2, sharedPoint) {
        try {
            // Get vectors for both walls from the shared point
            let vec1, vec2;
            
            // For wall1
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
            
            // For wall2
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

            // Calculate angle between vectors
            const dot = vec1.x * vec2.x + vec1.y * vec2.y;
            const mag1 = Math.sqrt(vec1.x * vec1.x + vec1.y * vec1.y);
            const mag2 = Math.sqrt(vec2.x * vec2.x + vec2.y * vec2.y);
            
            if (mag1 === 0 || mag2 === 0) return null;

            const cosAngle = dot / (mag1 * mag2);
            const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
            let angle = Math.acos(clampedCosAngle) * 180 / Math.PI;

            return Math.round(angle);
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

    // Add method to check if preview needs update
    shouldUpdatePreview(point) {
        if (!this.lastMousePoint) return true;
        
        const dx = point.x - this.lastMousePoint.x;
        const dy = point.y - this.lastMousePoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Update if mouse has moved more than 1 pixel
        return distance > 1;
    }

    draw() {
        // Draw all placed sockets
        this.sockets.forEach(socket => {
            this.drawSocket(socket);
        });

        // Draw preview if available
        if (this.socketPreview) {
            this.drawSocketPreview();
        }
    }

    drawSocket(socket) {
        const { x, y, size, angle, wall, leftSegment, rightSegment, wallSide, type } = socket;

        this.ctx.save();
        
        // Apply canvas transformations
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);
        
        // Move to socket position and rotate
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        // Draw socket square
        this.ctx.fillStyle = '#000000';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1 / this.zoom;

        // Convert size from mm to canvas units
        const sizeInCm = size / 10; // Convert mm to cm for display
        
        this.ctx.beginPath();
        this.ctx.rect(-sizeInCm/2, -sizeInCm/2, sizeInCm, sizeInCm);
        this.ctx.fill();
        this.ctx.stroke();

        // Add waterproof indicator if needed
        if (type === 'waterproof') {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, sizeInCm/4, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fill();
        }

        // Draw dimensions if in power-sockets mode
        if (wall && this.store.state.project.activeMode === 'power-sockets') {
            // Calculate dimension line offset based on which side of the wall the socket is on
            const dimensionOffset = wallSide * 20; // Use wallSide to determine direction

            // Draw dimension lines and measurements
            this.ctx.strokeStyle = '#666';
            this.ctx.fillStyle = '#666';
            this.ctx.lineWidth = 1 / this.zoom;
            this.ctx.setLineDash([4, 4]);
            this.ctx.font = `${12 / this.zoom}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            // Draw extension lines
            this.ctx.beginPath();
            this.ctx.moveTo(-leftSegment/10 - sizeInCm/2, 0);
            this.ctx.lineTo(-leftSegment/10 - sizeInCm/2, dimensionOffset);
            this.ctx.moveTo(rightSegment/10 + sizeInCm/2, 0);
            this.ctx.lineTo(rightSegment/10 + sizeInCm/2, dimensionOffset);
            this.ctx.stroke();

            // Draw dimension lines and text
            // Left segment
            if (leftSegment > 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(-leftSegment/10 - sizeInCm/2, dimensionOffset);
                this.ctx.lineTo(-sizeInCm/2, dimensionOffset);
                this.ctx.stroke();

                // Draw left measurement
                const leftText = `${(leftSegment/10).toFixed(1)} cm`;
                this.ctx.fillText(leftText, -leftSegment/20 - sizeInCm/2, dimensionOffset - 10);
            }

            // Socket width
            this.ctx.beginPath();
            this.ctx.moveTo(-sizeInCm/2, dimensionOffset);
            this.ctx.lineTo(sizeInCm/2, dimensionOffset);
            this.ctx.stroke();

            // Draw socket size
            this.ctx.fillText('8 cm', 0, dimensionOffset - 10);

            // Right segment
            if (rightSegment > 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(sizeInCm/2, dimensionOffset);
                this.ctx.lineTo(rightSegment/10 + sizeInCm/2, dimensionOffset);
                this.ctx.stroke();

                // Draw right measurement
                const rightText = `${(rightSegment/10).toFixed(1)} cm`;
                this.ctx.fillText(rightText, rightSegment/20 + sizeInCm/2, dimensionOffset - 10);
            }

            // Draw height from floor
            const heightText = `${(socket.heightFromFloor/10).toFixed(1)} cm`;
            this.ctx.fillText(heightText, 0, -20);
        }

        this.ctx.restore();
    }

    // Implement abstract methods
    drawObject(type, size) {
        switch (type) {
            case 'standard':
                this.drawStandardSocket(size);
                break;
            case 'waterproof':
                this.drawWaterproofSocket(size);
                break;
            case 'single-switch':
                this.drawSingleSwitch(size);
                break;
            case 'double-switch':
                this.drawDoubleSwitch(size);
                break;
            case 'triple-switch':
                this.drawTripleSwitch(size);
                break;
            case 'wall-light':
                this.drawWallLight(size);
                break;
            default:
                this.drawStandardSocket(size);
        }
    }

    getCurrentObjectConfig() {
        return this.store.state.sockets.currentConfig;
    }

    getActiveMode() {
        return 'power-sockets';
    }

    // Socket type drawing methods
    drawStandardSocket(size) {
        const halfSize = size / 2;
        
        // Draw socket outline
        this.ctx.beginPath();
        this.ctx.rect(-halfSize, -halfSize, size, size);
        this.ctx.stroke();

        // Draw socket holes
        const holeSize = size / 6;
        const holeSpacing = size / 4;
        
        // Left hole
        this.ctx.beginPath();
        this.ctx.arc(-holeSpacing, 0, holeSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Right hole
        this.ctx.beginPath();
        this.ctx.arc(holeSpacing, 0, holeSize, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawWaterproofSocket(size) {
        const halfSize = size / 2;
        
        // Draw outer waterproof cover
        this.ctx.beginPath();
        this.ctx.rect(-halfSize, -halfSize, size, size);
        this.ctx.stroke();

        // Draw inner socket outline
        const innerMargin = size / 8;
        this.ctx.beginPath();
        this.ctx.rect(
            -halfSize + innerMargin,
            -halfSize + innerMargin,
            size - 2 * innerMargin,
            size - 2 * innerMargin
        );
        this.ctx.stroke();

        // Draw socket holes
        const holeSize = size / 8;
        const holeSpacing = size / 5;
        
        // Left hole
        this.ctx.beginPath();
        this.ctx.arc(-holeSpacing, 0, holeSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Right hole
        this.ctx.beginPath();
        this.ctx.arc(holeSpacing, 0, holeSize, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawSingleSwitch(size) {
        const halfSize = size / 2;
        
        // Draw switch outline
        this.ctx.beginPath();
        this.ctx.rect(-halfSize, -halfSize, size, size);
        this.ctx.stroke();

        // Draw switch lever
        const leverSize = size * 0.6;
        const leverWidth = size * 0.2;
        
        this.ctx.beginPath();
        this.ctx.rect(-leverWidth/2, -leverSize/2, leverWidth, leverSize);
        this.ctx.fill();
    }

    drawDoubleSwitch(size) {
        const halfSize = size / 2;
        
        // Draw switch outline
        this.ctx.beginPath();
        this.ctx.rect(-halfSize, -halfSize, size, size);
        this.ctx.stroke();

        // Draw switch levers
        const leverSize = size * 0.6;
        const leverWidth = size * 0.15;
        const leverSpacing = size * 0.3;
        
        // Left lever
        this.ctx.beginPath();
        this.ctx.rect(-leverSpacing - leverWidth/2, -leverSize/2, leverWidth, leverSize);
        this.ctx.fill();
        
        // Right lever
        this.ctx.beginPath();
        this.ctx.rect(leverSpacing - leverWidth/2, -leverSize/2, leverWidth, leverSize);
        this.ctx.fill();
    }

    drawTripleSwitch(size) {
        const halfSize = size / 2;
        
        // Draw switch outline
        this.ctx.beginPath();
        this.ctx.rect(-halfSize, -halfSize, size, size);
        this.ctx.stroke();

        // Draw switch levers
        const leverSize = size * 0.6;
        const leverWidth = size * 0.12;
        const leverSpacing = size * 0.25;
        
        // Left lever
        this.ctx.beginPath();
        this.ctx.rect(-leverSpacing - leverWidth/2, -leverSize/2, leverWidth, leverSize);
        this.ctx.fill();
        
        // Center lever
        this.ctx.beginPath();
        this.ctx.rect(-leverWidth/2, -leverSize/2, leverWidth, leverSize);
        this.ctx.fill();
        
        // Right lever
        this.ctx.beginPath();
        this.ctx.rect(leverSpacing - leverWidth/2, -leverSize/2, leverWidth, leverSize);
        this.ctx.fill();
    }

    drawWallLight(size) {
        const halfSize = size / 2;
        
        // Draw light fixture base
        this.ctx.beginPath();
        this.ctx.rect(-halfSize, -halfSize/2, size, size/4);
        this.ctx.stroke();

        // Draw light bulb
        const bulbRadius = size * 0.3;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, bulbRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Draw light rays
        const rayLength = size * 0.2;
        const rayCount = 8;
        const angleStep = (Math.PI * 2) / rayCount;

        for (let i = 0; i < rayCount; i++) {
            const angle = i * angleStep;
            const innerX = Math.cos(angle) * bulbRadius;
            const innerY = Math.sin(angle) * bulbRadius;
            const outerX = Math.cos(angle) * (bulbRadius + rayLength);
            const outerY = Math.sin(angle) * (bulbRadius + rayLength);

            this.ctx.beginPath();
            this.ctx.moveTo(innerX, innerY);
            this.ctx.lineTo(outerX, outerY);
            this.ctx.stroke();
        }
    }

    // Add method to sync with store
    syncWithStore() {
        // Get sockets from store
        const storeSockets = this.store.state.sockets.objects;
        
        // Update local sockets array
        this.sockets = storeSockets.map(socket => ({
            ...socket,
            size: socket.size || 8 // Ensure size is set (default to 8cm)
        }));

        // Trigger redraw
        this.draw();
    }

    // Add cleanup method
    cleanup() {
        // Unsubscribe from store when component is destroyed
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
} 