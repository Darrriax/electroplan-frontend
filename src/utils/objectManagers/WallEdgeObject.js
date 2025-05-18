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

    // Calculate object position relative to wall edge
    calculatePosition(wall, mousePoint) {
        const wallVector = {
            x: wall.end.x - wall.start.x,
            y: wall.end.y - wall.start.y
        };
        const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);
        
        // Calculate wall normal vectors (perpendicular to wall)
        const normalVector = {
            x: -wallVector.y / wallLength,
            y: wallVector.x / wallLength
        };

        // Calculate wall unit vector
        const wallUnitVector = {
            x: wallVector.x / wallLength,
            y: wallVector.y / wallLength
        };

        // Calculate mouse position relative to wall
        const mouseRelative = {
            x: mousePoint.x - wall.start.x,
            y: mousePoint.y - wall.start.y
        };

        // Project mouse point onto wall line
        const projection = mouseRelative.x * wallUnitVector.x + mouseRelative.y * wallUnitVector.y;
        const projectionPoint = {
            x: wall.start.x + wallUnitVector.x * projection,
            y: wall.start.y + wallUnitVector.y * projection
        };

        // Calculate perpendicular distance and side
        const perpVector = {
            x: mousePoint.x - projectionPoint.x,
            y: mousePoint.y - projectionPoint.y
        };
        const perpDistance = Math.sqrt(perpVector.x * perpVector.x + perpVector.y * perpVector.y);

        // Calculate wall angle and determine orientation
        const wallAngle = Math.atan2(wallVector.y, wallVector.x);
        // Normalize angle to 0-180 degrees for vertical/horizontal detection
        const normalizedAngle = Math.abs(wallAngle % Math.PI);
        
        // Calculate the mouse position relative to the wall
        const mouseToWall = {
            x: mousePoint.x - projectionPoint.x,
            y: mousePoint.y - projectionPoint.y
        };

        // Project mouse position onto wall normal
        const normalProjection = mouseToWall.x * normalVector.x + mouseToWall.y * normalVector.y;

        // Convert wall thickness from mm to cm and calculate half thickness
        const halfThickness = (wall.thickness / 10) / 2;
        const halfObjectSize = this.defaultDimensions.width / 2;

        // Constrain position along wall length
        const relativePos = projection / wallLength;
        const constrainedPos = Math.max(
            halfObjectSize / wallLength,
            Math.min(1 - halfObjectSize / wallLength, relativePos)
        );

        // Calculate constrained base position
        const position = {
            x: wall.start.x + wallVector.x * constrainedPos,
            y: wall.start.y + wallVector.y * constrainedPos
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

    // Draw preview of the object
    drawPreview(ctx, preview) {
        if (!preview.position) return;

        const { x, y, rotation } = preview.position;
        
        ctx.save();
        // Apply canvas transformations
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);
        // Apply object position and rotation
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