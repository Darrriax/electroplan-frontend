// WindowManager.js - Handles window drawing and manipulation
import { formatMeasurement } from '../unitConversion';

export default class WindowManager {
    constructor(ctx, store) {
        this.ctx = ctx;
        this.store = store;
        this.windowPreview = null;
        this.windowMagnetWall = null;
        this.windowMagnetPoint = null;
    }

    updateWindowPreview(point, walls) {
        const windowConfig = this.store.state.windows.currentConfig;
        
        // Reset window preview state
        if (this.windowMagnetWall) {
            this.windowMagnetWall.hideDimension = false;
        }
        this.windowPreview = null;
        this.windowMagnetWall = null;
        this.windowMagnetPoint = null;

        // Find suitable walls for window placement
        let bestWall = null;
        let bestMagnetPoint = null;
        let minDistance = Infinity;
        let bestInternalPoints = null;
        let bestSegments = null;

        for (const wall of walls) {
            const startConnections = this.findWallsConnectedToPoint(wall.start, walls);
            const endConnections = this.findWallsConnectedToPoint(wall.end, walls);
            const internalPoints = this.calculateInternalPoints(wall, startConnections, endConnections);
            
            if (!internalPoints) continue;

            const { internalStart, internalEnd } = internalPoints;
            const internalDx = internalEnd.x - internalStart.x;
            const internalDy = internalEnd.y - internalStart.y;
            const internalLength = Math.sqrt(
                Math.pow(internalDx, 2) + 
                Math.pow(internalDy, 2)
            );

            // Skip if wall is too short for the window
            if (internalLength < windowConfig.width) continue;

            const magnetDistance = this.distanceToLine(point, wall.start, wall.end);
            if (magnetDistance < 20) { // Magnetization threshold
                const projection = this.projectPointOnLine(point, wall.start, wall.end);
                
                // Only proceed if the projected point is actually on the wall segment
                if (!this.isPointOnWallSegment(projection, wall)) continue;

                const wallDx = wall.end.x - wall.start.x;
                const wallDy = wall.end.y - wall.start.y;
                const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);
                const wallUnitX = wallDx / wallLength;
                const wallUnitY = wallDy / wallLength;

                // Calculate window center point
                const windowCenter = {
                    x: projection.x - (windowConfig.width / 2) * wallUnitX,
                    y: projection.y - (windowConfig.width / 2) * wallUnitY
                };

                // Verify that the entire window would be on the wall
                const windowStart = {
                    x: windowCenter.x,
                    y: windowCenter.y
                };
                const windowEnd = {
                    x: windowCenter.x + windowConfig.width * wallUnitX,
                    y: windowCenter.y + windowConfig.width * wallUnitY
                };

                // Skip if either end of the window would be off the wall
                if (!this.isPointOnWallSegment(windowStart, wall) || 
                    !this.isPointOnWallSegment(windowEnd, wall)) {
                    continue;
                }

                // Calculate distances from internal points
                const centerToStartX = windowCenter.x - internalStart.x;
                const centerToStartY = windowCenter.y - internalStart.y;
                const leftSegment = (centerToStartX * internalDx + centerToStartY * internalDy) / internalLength;
                
                const centerToEndX = internalEnd.x - (windowCenter.x + windowConfig.width * wallUnitX);
                const centerToEndY = internalEnd.y - (windowCenter.y + windowConfig.width * wallUnitY);
                const rightSegment = Math.sqrt(centerToEndX * centerToEndX + centerToEndY * centerToEndY);

                // Only update if this is the closest valid wall
                if (magnetDistance < minDistance) {
                    bestWall = wall;
                    bestMagnetPoint = windowCenter;
                    minDistance = magnetDistance;
                    bestInternalPoints = internalPoints;
                    bestSegments = {
                        leftSegment,
                        rightSegment
                    };
                }
            }
        }

        if (bestWall) {
            // Hide wall dimension only for the wall we're adding window to
            bestWall.hideDimension = true;
            this.windowMagnetWall = bestWall;
            this.windowMagnetPoint = bestMagnetPoint;
            
            // Calculate wall angle
            const wallDx = bestWall.end.x - bestWall.start.x;
            const wallDy = bestWall.end.y - bestWall.start.y;
            const wallAngle = Math.atan2(wallDy, wallDx);

            this.windowPreview = {
                x: bestMagnetPoint.x,
                y: bestMagnetPoint.y,
                width: windowConfig.width,
                thickness: 2, // Fixed 2cm thickness for windows
                angle: wallAngle,
                wall: bestWall,
                leftSegment: bestSegments.leftSegment,
                rightSegment: bestSegments.rightSegment,
                internalStart: bestInternalPoints.internalStart,
                internalEnd: bestInternalPoints.internalEnd
            };
        }
    }

    drawWindowPreview() {
        if (!this.windowPreview) return;

        const { x, y, width, thickness, angle, wall, leftSegment, rightSegment } = this.windowPreview;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        // Draw window rectangle
        this.ctx.fillStyle = '#000000';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        this.ctx.rect(0, -thickness/2, width, thickness);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw dimensions only in original-plan mode
        if (wall && this.store.state.project.activeMode === 'original-plan') {
            wall.hideDimension = true;
            this.drawWindowSegmentDimensions(leftSegment, rightSegment, width, thickness);
        }

        this.ctx.restore();
    }

    drawPlacedWindows(windows) {
        windows.forEach(window => {
            this.ctx.save();
            this.ctx.translate(window.x, window.y);
            this.ctx.rotate(window.angle);

            // Draw window rectangle
            this.ctx.fillStyle = '#000000';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1;

            this.ctx.beginPath();
            this.ctx.rect(0, -window.thickness/2, window.width, window.thickness);
            this.ctx.fill();
            this.ctx.stroke();

            this.ctx.restore();
        });
    }

    drawWindowSegmentDimensions(leftSegment, rightSegment, windowWidth, thickness) {
        const offset = thickness + 20;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#666';
        this.ctx.fillStyle = '#666';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Draw extension lines for all segments
        this.ctx.beginPath();
        // Left extension line
        this.ctx.moveTo(-leftSegment, -thickness/2);
        this.ctx.lineTo(-leftSegment, -offset);
        // Window start extension line
        this.ctx.moveTo(0, -thickness/2);
        this.ctx.lineTo(0, -offset);
        // Window end extension line
        this.ctx.moveTo(windowWidth, -thickness/2);
        this.ctx.lineTo(windowWidth, -offset);
        // Right extension line
        this.ctx.moveTo(windowWidth + rightSegment, -thickness/2);
        this.ctx.lineTo(windowWidth + rightSegment, -offset);
        this.ctx.stroke();

        // Draw dimension lines and text
        // Left segment
        if (leftSegment > 0) {
            // Dimension line
            this.ctx.beginPath();
            this.ctx.moveTo(-leftSegment, -offset);
            this.ctx.lineTo(0, -offset);
            this.ctx.stroke();

            // Text with background
            const leftText = formatMeasurement(leftSegment * 10, this.store.state.project.unit);
            const leftTextWidth = this.ctx.measureText(leftText).width;
            const leftMidPoint = -leftSegment/2;
            
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(leftMidPoint - leftTextWidth/2 - 2, -offset - 8, leftTextWidth + 4, 16);
            
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(leftText, leftMidPoint, -offset);
        }

        // Window width
        this.ctx.beginPath();
        this.ctx.moveTo(0, -offset);
        this.ctx.lineTo(windowWidth, -offset);
        this.ctx.stroke();

        // Window width text
        const windowText = formatMeasurement(windowWidth * 10, this.store.state.project.unit);
        const windowTextWidth = this.ctx.measureText(windowText).width;
        const windowMidPoint = windowWidth/2;
        
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(windowMidPoint - windowTextWidth/2 - 2, -offset - 8, windowTextWidth + 4, 16);
        
        this.ctx.fillStyle = '#666';
        this.ctx.fillText(windowText, windowMidPoint, -offset);

        // Right segment
        if (rightSegment > 0) {
            // Dimension line
            this.ctx.beginPath();
            this.ctx.moveTo(windowWidth, -offset);
            this.ctx.lineTo(windowWidth + rightSegment, -offset);
            this.ctx.stroke();

            // Text with background
            const rightText = formatMeasurement(rightSegment * 10, this.store.state.project.unit);
            const rightTextWidth = this.ctx.measureText(rightText).width;
            const rightMidPoint = windowWidth + rightSegment/2;
            
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(rightMidPoint - rightTextWidth/2 - 2, -offset - 8, rightTextWidth + 4, 16);
            
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(rightText, rightMidPoint, -offset);
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
            ? Math.max(...startPerpendicularWalls.map(w => w.thickness))
            : 0;
        const endThickness = endPerpendicularWalls.length > 0 
            ? Math.max(...endPerpendicularWalls.map(w => w.thickness))
            : 0;

        // Calculate internal points using perpendicular wall thicknesses
        let internalStart = {
            x: wall.start.x + (startThickness / 2) * ux,
            y: wall.start.y + (startThickness / 2) * uy
        };

        let internalEnd = {
            x: wall.end.x - (endThickness / 2) * ux,
            y: wall.end.y - (endThickness / 2) * uy
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

    distance(p1, p2) {
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) + 
            Math.pow(p2.y - p1.y, 2)
        );
    }

    distanceToLine(point, start, end) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return 0;

        const cross = (end.x - start.x) * (point.y - start.y) - (end.y - start.y) * (point.x - start.x);
        return Math.abs(cross / length);
    }

    projectPointOnLine(point, start, end) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = dx * dx + dy * dy;
        if (length === 0) return { ...start };

        const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / length;
        return {
            x: start.x + t * dx,
            y: start.y + t * dy
        };
    }

    addWindow() {
        if (!this.windowPreview) return;

        const { x, y, width, angle, wall, leftSegment, rightSegment } = this.windowPreview;

        // Create new window object
        const newWindow = {
            id: Date.now().toString(),
            wallId: wall.id,
            position: { x, y },
            width,
            thickness: 2, // Fixed 2cm thickness for windows
            angle,
            leftSegment,
            rightSegment
        };

        // Add window to store
        this.store.commit('windows/addWindow', newWindow);

        // Reset preview
        this.windowPreview = null;
        this.windowMagnetWall = null;
        this.windowMagnetPoint = null;

        // Update wall dimensions
        wall.hideDimension = false;
    }

    updateWindowPosition(window, wall) {
        // Get connected walls for internal dimensions
        const startConnections = this.findWallsConnectedToPoint(wall.start);
        const endConnections = this.findWallsConnectedToPoint(wall.end);
        const internalPoints = this.calculateInternalPoints(wall, startConnections, endConnections);
        
        if (!internalPoints) return window;

        const { internalStart, internalEnd } = internalPoints;

        // Calculate internal wall length
        const internalDx = internalEnd.x - internalStart.x;
        const internalDy = internalEnd.y - internalStart.y;
        const internalLength = Math.sqrt(internalDx * internalDx + internalDy * internalDy);

        // Calculate wall direction vector
        const wallDx = wall.end.x - wall.start.x;
        const wallDy = wall.end.y - wall.start.y;
        const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);
        const wallUnitX = wallDx / wallLength;
        const wallUnitY = wallDy / wallLength;

        // Calculate the window's relative position along the internal wall
        const windowToStartX = window.position.x - internalStart.x;
        const windowToStartY = window.position.y - internalStart.y;
        const relativePosition = (windowToStartX * internalDx + windowToStartY * internalDy) / 
                              (internalLength * internalLength);

        // Ensure window stays within wall bounds
        let adjustedPosition = relativePosition;
        if (relativePosition < 0) {
            adjustedPosition = 0;
        } else if (relativePosition + window.width / internalLength > 1) {
            adjustedPosition = 1 - window.width / internalLength;
        }

        // Calculate new window position based on internal dimensions
        const newX = internalStart.x + wallUnitX * (adjustedPosition * internalLength);
        const newY = internalStart.y + wallUnitY * (adjustedPosition * internalLength);

        // Calculate new angle based on wall direction
        const newAngle = Math.atan2(wallDy, wallDx);

        // Calculate new segments
        const leftSegment = adjustedPosition * internalLength;
        const rightSegment = internalLength - (leftSegment + window.width);

        // Update window properties
        window.position = { x: newX, y: newY };
        window.angle = newAngle;
        window.leftSegment = leftSegment;
        window.rightSegment = rightSegment;

        return window;
    }

    updateWindowsOnWall(wall) {
        const windows = this.store.state.windows.windows;
        const updatedWindows = windows.map(window => {
            if (window.wallId === wall.id) {
                return this.updateWindowPosition(window, wall);
            }
            return window;
        });

        // Update windows in store
        this.store.commit('windows/updateWindows', updatedWindows);
    }

    isPointOnWallSegment(point, wall) {
        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const wallLength = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate distances from point to both wall endpoints
        const d1 = this.distance(point, wall.start);
        const d2 = this.distance(point, wall.end);
        
        // Point is on segment if sum of distances to endpoints equals wall length
        // Add small epsilon for floating point precision
        const epsilon = 0.1;
        return Math.abs(d1 + d2 - wallLength) < epsilon;
    }
} 