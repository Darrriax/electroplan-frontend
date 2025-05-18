// WallEdgeObject.js - Manager for objects attached to wall edges (sockets, switches, wall lights)
export default class WallEdgeObject {
    constructor(store) {
        this.store = store;
        this.defaultDimensions = {
            width: 8,  // 8 cm width
            height: 8  // 8 cm height
        };
        // Canvas transform state
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1;
        // Magnetization threshold in canvas units
        this.magnetThreshold = 20;
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
            wall: null,
            side: null // 'left', 'right', 'top', or 'bottom' of the wall
        };
    }

    // Find nearest wall and calculate position
    findNearestWall(mousePoint, walls) {
        let nearestWall = null;
        let minDistance = Infinity;
        let bestPosition = null;

        walls.forEach(wall => {
            // Calculate perpendicular distance to wall line
            const wallVector = {
                x: wall.end.x - wall.start.x,
                y: wall.end.y - wall.start.y
            };
            const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);
            
            // Calculate normalized wall vector and normal
            const wallUnitVector = {
                x: wallVector.x / wallLength,
                y: wallVector.y / wallLength
            };
            const normalVector = {
                x: -wallVector.y / wallLength,
                y: wallVector.x / wallLength
            };

            // Calculate mouse position relative to wall start
            const mouseRelative = {
                x: mousePoint.x - wall.start.x,
                y: mousePoint.y - wall.start.y
            };

            // Calculate projection onto wall line
            const projection = mouseRelative.x * wallUnitVector.x + mouseRelative.y * wallUnitVector.y;

            // Check if point is beyond wall ends
            if (projection < 0 || projection > wallLength) {
                return; // Skip this wall if mouse is beyond its ends
            }

            // Calculate perpendicular distance to wall
            const perpDistance = Math.abs(mouseRelative.x * normalVector.x + mouseRelative.y * normalVector.y);

            // Only consider walls that are close enough
            if (perpDistance <= this.magnetThreshold / this.zoom) {
                // Calculate position if this is the closest wall so far
                if (perpDistance < minDistance) {
                    minDistance = perpDistance;
                    nearestWall = wall;
                    bestPosition = this.calculatePosition(wall, mousePoint);
                }
            }
        });

        return {
            wall: nearestWall,
            position: bestPosition,
            distance: minDistance
        };
    }

    // Helper method to check if two points are equal (within a small threshold)
    pointsAreEqual(p1, p2, threshold = 1) {
        return Math.abs(p1.x - p2.x) < threshold && Math.abs(p1.y - p2.y) < threshold;
    }

    // Calculate object position relative to wall edge
    calculatePosition(wall, mousePoint) {
        if (!wall || !mousePoint) return null;

        // Get all walls from store
        const walls = this.store.state.walls.walls || [];

        // Find connected walls
        const connectedWalls = walls.filter(w => 
            w.id !== wall.id && (
                this.pointsAreEqual(w.start, wall.start) ||
                this.pointsAreEqual(w.start, wall.end) ||
                this.pointsAreEqual(w.end, wall.start) ||
                this.pointsAreEqual(w.end, wall.end)
            )
        );

        // Calculate wall vector and length
        const wallVector = {
            x: wall.end.x - wall.start.x,
            y: wall.end.y - wall.start.y
        };
        const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);
        
        if (wallLength === 0) return null;

        // Calculate wall unit vector
        const wallUnitVector = {
            x: wallVector.x / wallLength,
            y: wallVector.y / wallLength
        };

        // Calculate wall normal vector
        const normalVector = {
            x: -wallVector.y / wallLength,
            y: wallVector.x / wallLength
        };

        // Find connected walls at start and end
        const startWalls = connectedWalls.filter(w => 
            this.pointsAreEqual(w.start, wall.start) ||
            this.pointsAreEqual(w.end, wall.start)
        );
        const endWalls = connectedWalls.filter(w => 
            this.pointsAreEqual(w.start, wall.end) ||
            this.pointsAreEqual(w.end, wall.end)
        );

        // Calculate internal wall points considering HALF of adjacent wall thicknesses
        const maxStartThickness = Math.max(...startWalls.map(w => w.thickness / 2), 0) / 10; // Convert mm to cm and take half
        const maxEndThickness = Math.max(...endWalls.map(w => w.thickness / 2), 0) / 10;

        // Calculate internal start and end points
        const internalStart = {
            x: wall.start.x + wallUnitVector.x * maxStartThickness,
            y: wall.start.y + wallUnitVector.y * maxStartThickness
        };
        const internalEnd = {
            x: wall.end.x - wallUnitVector.x * maxEndThickness,
            y: wall.end.y - wallUnitVector.y * maxEndThickness
        };

        // Calculate internal wall length
        const internalLength = Math.sqrt(
            Math.pow(internalEnd.x - internalStart.x, 2) +
            Math.pow(internalEnd.y - internalStart.y, 2)
        );

        // Calculate mouse position relative to internal wall
        const mouseVector = {
            x: mousePoint.x - internalStart.x,
            y: mousePoint.y - internalStart.y
        };

        // Project mouse point onto internal wall line
        const projection = mouseVector.x * wallUnitVector.x + mouseVector.y * wallUnitVector.y;
        const projectionPoint = {
            x: internalStart.x + wallUnitVector.x * projection,
            y: internalStart.y + wallUnitVector.y * projection
        };

        // Calculate perpendicular distance and side
        const mouseToWall = {
            x: mousePoint.x - projectionPoint.x,
            y: mousePoint.y - projectionPoint.y
        };
        const perpDistance = Math.sqrt(mouseToWall.x * mouseToWall.x + mouseToWall.y * mouseToWall.y);

        // Calculate wall angle and determine orientation
        const wallAngle = Math.atan2(wallVector.y, wallVector.x);
        // Normalize angle to 0-180 degrees for vertical/horizontal detection
        const normalizedAngle = Math.abs(wallAngle % Math.PI);

        // Project mouse position onto wall normal
        const normalProjection = mouseToWall.x * normalVector.x + mouseToWall.y * normalVector.y;

        // Convert wall thickness from mm to cm and calculate half thickness
        const halfThickness = (wall.thickness / 10) / 2;
        const halfObjectSize = this.defaultDimensions.width / 2;

        // Constrain position along wall length
        const relativePos = projection / internalLength;
        const constrainedPos = Math.max(
            halfObjectSize / internalLength,
            Math.min(1 - halfObjectSize / internalLength, relativePos)
        );

        // Calculate constrained base position on internal wall
        const position = {
            x: internalStart.x + wallUnitVector.x * (constrainedPos * internalLength),
            y: internalStart.y + wallUnitVector.y * (constrainedPos * internalLength)
        };

        // Determine side and calculate final position
        let side, rotation;

        // For diagonal walls (close to 45 degrees), use normal projection
        const isDiagonal = Math.abs(Math.abs(normalizedAngle - Math.PI / 4) % (Math.PI / 2)) < Math.PI / 8;

        if (isDiagonal) {
            // For diagonal walls, use normal projection for side determination
            if (normalProjection > 0) {
                side = 'right';
                rotation = wallAngle + Math.PI / 2;
                // Move object perpendicular to wall direction
                position.x += normalVector.x * (halfThickness + halfObjectSize);
                position.y += normalVector.y * (halfThickness + halfObjectSize);
            } else {
                side = 'left';
                rotation = wallAngle - Math.PI / 2;
                // Move object perpendicular to wall direction
                position.x -= normalVector.x * (halfThickness + halfObjectSize);
                position.y -= normalVector.y * (halfThickness + halfObjectSize);
            }
        } else {
            // For more vertical walls
            const isMoreVertical = Math.abs(normalizedAngle - Math.PI / 2) < Math.PI / 4;
            
            if (isMoreVertical) {
                // For vertical-ish walls, use x-coordinate for side determination
                if (mouseToWall.x > 0) {
                    side = 'right';
                    rotation = wallAngle + Math.PI / 2;
                    position.x += halfThickness + halfObjectSize;
                } else {
                    side = 'left';
                    rotation = wallAngle - Math.PI / 2;
                    position.x -= halfThickness + halfObjectSize;
                }
            } else {
                // For horizontal-ish walls, use y-coordinate for side determination
                if (mouseToWall.y > 0) {
                    side = 'bottom';
                    rotation = wallAngle;
                    position.y += halfThickness + halfObjectSize;
                } else {
                    side = 'top';
                    rotation = wallAngle + Math.PI;
                    position.y -= halfThickness + halfObjectSize;
                }
            }
        }

        return {
            x: position.x,
            y: position.y,
            rotation,
            side,
            distanceToWall: perpDistance
        };
    }

    // Convert length to display units based on project settings
    convertToDisplayUnits(length) {
        const unit = this.store.state.project.unit;
        let displayLength;
        let unitLabel;

        switch (unit) {
            case 'mm':
                displayLength = (length * 10).toFixed(0); // Convert from internal units (cm) to mm
                unitLabel = 'mm';
                break;
            case 'm':
                displayLength = (length / 100).toFixed(2); // Convert from internal units (cm) to m
                unitLabel = 'm';
                break;
            case 'cm':
            default:
                displayLength = length.toFixed(1); // Internal units are already in cm
                unitLabel = 'cm';
                break;
        }

        return { value: displayLength, unit: unitLabel };
    }

    // Draw dimension line with arrows and text
    drawDimensionLine(ctx, startPoint, endPoint, offset, dimensionText, isObjectLength = false) {
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return;

        // Calculate normal vector for offset direction
        const nx = -dy / length;
        const ny = dx / length;

        // Calculate offset points
        const offsetStart = {
            x: startPoint.x + nx * offset,
            y: startPoint.y + ny * offset
        };
        const offsetEnd = {
            x: endPoint.x + nx * offset,
            y: endPoint.y + ny * offset
        };

        // Apply canvas transformations
        ctx.save();
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);

        // Draw dimension line
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1 / this.zoom;
        
        if (!isObjectLength) {
            ctx.setLineDash([4 / this.zoom, 4 / this.zoom]); // Scale dash pattern with zoom
        }

        // Draw main line
        ctx.beginPath();
        ctx.moveTo(offsetStart.x, offsetStart.y);
        ctx.lineTo(offsetEnd.x, offsetEnd.y);
        ctx.stroke();

        // Draw extension lines
        ctx.beginPath();
        ctx.setLineDash([]); // Extension lines are solid
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(offsetStart.x, offsetStart.y);
        ctx.moveTo(endPoint.x, endPoint.y);
        ctx.lineTo(offsetEnd.x, offsetEnd.y);
        ctx.stroke();

        // Draw dimension text
        const midPoint = {
            x: (offsetStart.x + offsetEnd.x) / 2,
            y: (offsetStart.y + offsetEnd.y) / 2
        };

        ctx.font = `${12 / this.zoom}px Arial`;
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Calculate text angle to ensure it's always readable
        let textAngle = Math.atan2(dy, dx);
        if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
            textAngle += Math.PI;
        }

        // Draw text background
        const padding = 2 / this.zoom;
        const textWidth = ctx.measureText(dimensionText).width + padding * 2;
        const textHeight = 16 / this.zoom;
        
        ctx.save();
        ctx.translate(midPoint.x, midPoint.y);
        ctx.rotate(textAngle);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(-textWidth / 2, 0, textWidth, -textHeight);
        
        // Draw text
        ctx.fillStyle = '#333';
        ctx.fillText(dimensionText, 0, -padding);
        
        ctx.restore();
        ctx.restore();
    }

    // Draw division mark for dimensions
    drawDivisionMark(ctx, point, length, angle) {
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -length);
        ctx.stroke();
        
        ctx.restore();
    }

    // Calculate distance along wall direction between two points
    calculateDistanceAlongWall(point1, point2, wallUnitVector) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.abs(dx * wallUnitVector.x + dy * wallUnitVector.y);
    }

    // Draw preview of the object with dimensions
    drawPreview(ctx, preview) {
        if (!preview.position || !preview.wall) return;

        const { x, y, rotation, side } = preview.position;
        const wall = preview.wall;
        
        // Draw the main object preview
        ctx.save();
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Draw square representing the object
        ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
        ctx.strokeStyle = '#0096FF';
        ctx.lineWidth = 1 / this.zoom;

        const width = this.defaultDimensions.width;
        const height = this.defaultDimensions.height;

        ctx.beginPath();
        ctx.rect(-width/2, -height/2, width, height);
        ctx.fill();
        ctx.stroke();

        // Draw connection point indicator
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fillStyle = '#0096FF';
        ctx.fill();

        ctx.restore();

        // Get all walls from store
        const walls = this.store.state.walls.walls || [];

        // Find connected walls
        const connectedWalls = walls.filter(w => 
            w.id !== wall.id && (
                this.pointsAreEqual(w.start, wall.start) ||
                this.pointsAreEqual(w.start, wall.end) ||
                this.pointsAreEqual(w.end, wall.start) ||
                this.pointsAreEqual(w.end, wall.end)
            )
        );

        // Find connected walls at start and end
        const startWalls = connectedWalls.filter(w => 
            this.pointsAreEqual(w.start, wall.start) ||
            this.pointsAreEqual(w.end, wall.start)
        );
        const endWalls = connectedWalls.filter(w => 
            this.pointsAreEqual(w.start, wall.end) ||
            this.pointsAreEqual(w.end, wall.end)
        );

        // Calculate wall vector and length
        const wallVector = {
            x: wall.end.x - wall.start.x,
            y: wall.end.y - wall.start.y
        };
        const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);
        
        // Calculate wall unit vector for internal point calculations
        const wallUnitVector = {
            x: wallVector.x / wallLength,
            y: wallVector.y / wallLength
        };

        // Calculate wall normal vector
        const normalVector = {
            x: -wallVector.y / wallLength,
            y: wallVector.x / wallLength
        };

        // Calculate internal wall points considering HALF of adjacent wall thicknesses
        const maxStartThickness = Math.max(...startWalls.map(w => w.thickness / 2), 0) / 10; // Convert mm to cm and take half
        const maxEndThickness = Math.max(...endWalls.map(w => w.thickness / 2), 0) / 10;

        // Calculate internal start and end points
        const internalStart = {
            x: wall.start.x + wallUnitVector.x * maxStartThickness,
            y: wall.start.y + wallUnitVector.y * maxStartThickness
        };
        const internalEnd = {
            x: wall.end.x - wallUnitVector.x * maxEndThickness,
            y: wall.end.y - wallUnitVector.y * maxEndThickness
        };

        // Calculate object projection point onto wall line
        const objectCenter = { x, y };
        const toObject = {
            x: objectCenter.x - internalStart.x,
            y: objectCenter.y - internalStart.y
        };
        const projectionDistance = toObject.x * wallUnitVector.x + toObject.y * wallUnitVector.y;
        
        const objectProjection = {
            x: internalStart.x + wallUnitVector.x * projectionDistance,
            y: internalStart.y + wallUnitVector.y * projectionDistance
        };

        // Calculate distances along wall direction
        const leftDistance = this.calculateDistanceAlongWall(internalStart, objectProjection, wallUnitVector);
        const rightDistance = this.calculateDistanceAlongWall(objectProjection, internalEnd, wallUnitVector);

        // Draw dimensions
        const thickness = wall.thickness / 10; // Convert wall thickness from mm to cm
        const dimensionOffset = thickness * 1.5; // Reduced offset to bring dimension line closer to wall

        // Determine which side of the wall to draw dimensions on based on object position
        const objectToWall = {
            x: objectCenter.x - objectProjection.x,
            y: objectCenter.y - objectProjection.y
        };

        // Calculate dot product to determine which side the object is on
        const dotProduct = objectToWall.x * normalVector.x + objectToWall.y * normalVector.y;
        const sideMultiplier = Math.sign(dotProduct);

        // Use the normal vector with correct direction
        const nx = normalVector.x * sideMultiplier;
        const ny = normalVector.y * sideMultiplier;

        // Save context for dimension drawing
        ctx.save();
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1 / this.zoom;

        // Project points for dimension lines
        const dimensionStart = {
            x: internalStart.x + nx * dimensionOffset,
            y: internalStart.y + ny * dimensionOffset
        };
        const dimensionEnd = {
            x: internalEnd.x + nx * dimensionOffset,
            y: internalEnd.y + ny * dimensionOffset
        };
        const objectDimensionPoint = {
            x: objectProjection.x + nx * dimensionOffset,
            y: objectProjection.y + ny * dimensionOffset
        };

        // Draw main dotted line
        ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);
        ctx.beginPath();
        ctx.moveTo(dimensionStart.x, dimensionStart.y);
        ctx.lineTo(dimensionEnd.x, dimensionEnd.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw extension lines
        ctx.beginPath();
        ctx.moveTo(internalStart.x, internalStart.y);
        ctx.lineTo(dimensionStart.x, dimensionStart.y);
        ctx.moveTo(internalEnd.x, internalEnd.y);
        ctx.lineTo(dimensionEnd.x, dimensionEnd.y);
        ctx.moveTo(objectCenter.x, objectCenter.y);
        ctx.lineTo(objectDimensionPoint.x, objectDimensionPoint.y);
        ctx.stroke();

        ctx.restore();

        // Draw dimensions text
        const leftDistanceDisplay = this.convertToDisplayUnits(leftDistance);
        const rightDistanceDisplay = this.convertToDisplayUnits(rightDistance);

        // Draw left distance
        this.drawDimensionLine(
            ctx,
            dimensionStart,
            objectDimensionPoint,
            0, // No additional offset needed since points are already offset
            `${leftDistanceDisplay.value} ${leftDistanceDisplay.unit}`
        );

        // Draw right distance
        this.drawDimensionLine(
            ctx,
            objectDimensionPoint,
            dimensionEnd,
            0,
            `${rightDistanceDisplay.value} ${rightDistanceDisplay.unit}`
        );
    }

    // Create final object
    createObject(preview) {
        if (!preview.wall || !preview.position) return null;

        return {
            id: Date.now().toString(),
            type: preview.type,
            wall: preview.wall.id,
            position: {
                x: preview.position.x,
                y: preview.position.y,
                rotation: preview.position.rotation,
                side: preview.position.side
            },
            dimensions: preview.dimensions
        };
    }
} 