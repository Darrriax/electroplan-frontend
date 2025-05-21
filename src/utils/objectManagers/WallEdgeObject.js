// WallEdgeObject.js - Manager for objects attached to wall edges (sockets, switches, wall lights)
export default class WallEdgeObject {
    constructor(store) {
        this.store = store;
        // Define default dimensions for each object type (in cm)
        this.objectDefaults = {
            panel: {
                width: (this.store.state.panels?.defaultWidth || 300) / 10, // cm
                height: (this.store.state.panels?.defaultHeight || 210) / 10, // cm
                floorHeight: (this.store.state.panels?.defaultFloorHeight || 1200) / 10 // cm
            },
            wallLight: {
                width: 8,
                height: 8,
                heightFromFloor: 2200 // mm (changed from cm to mm)
            },
            socket: {
                width: 8,
                height: 8
            },
            singleSwitch: {
                width: 8,
                height: 8
            },
            doubleSwitch: {
                width: 8,
                height: 8
            }
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
        let dimensions = { ...this.objectDefaults[type] };
        // For panel, always get fresh values from the store
        if (type === 'panel') {
            dimensions.width = (this.store.state.panels?.defaultWidth || 300) / 10;
            dimensions.height = (this.store.state.panels?.defaultHeight || 210) / 10;
            dimensions.floorHeight = (this.store.state.panels?.defaultFloorHeight || 1200) / 10;
        }
        return {
            type,
            dimensions,
            position: null,
            wall: null,
            side: null // 'left', 'right', 'top', or 'bottom' of the wall
        };
    }

    // Update dimensions of the preview object
    updateDimensions(dimensions) {
        if (this.preview) {
            if (dimensions.width !== undefined) {
                this.preview.dimensions.width = dimensions.width / 10; // mm to cm
                if (this.preview.type === 'panel') {
                    this.store.dispatch('panels/setDefaultWidth', dimensions.width);
                }
            }
            if (dimensions.height !== undefined) {
                this.preview.dimensions.height = dimensions.height / 10;
                if (this.preview.type === 'panel') {
                    this.store.dispatch('panels/setDefaultHeight', dimensions.height);
                }
            }
            if (dimensions.floorHeight !== undefined) {
                this.preview.dimensions.floorHeight = dimensions.floorHeight / 10;
                if (this.preview.type === 'panel') {
                    this.store.dispatch('panels/setDefaultFloorHeight', dimensions.floorHeight);
                }
            }
        }
    }

    // Check if a point is inside any room
    isPointInsideRoom(point) {
        const rooms = this.store.state.rooms.rooms || [];
        
        for (const room of rooms) {
            if (this.isPointInPolygon(point, room.path)) {
                return true;
            }
        }
        return false;
    }

    // Ray casting algorithm to check if a point is inside a polygon
    isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            
            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    // Find nearest wall and calculate position
    findNearestWall(mousePoint, walls) {
        // First check if mouse is inside any room
        if (!this.isPointInsideRoom(mousePoint)) {
            return { wall: null, position: null, distance: Infinity };
        }

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
                // Calculate potential position
                const potentialPosition = this.calculatePosition(wall, mousePoint);
                
                if (potentialPosition) {
                    // If this is the closest wall so far, update the best position
                    if (perpDistance < minDistance) {
                        minDistance = perpDistance;
                        nearestWall = wall;
                        bestPosition = potentialPosition;
                    }
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

    // Check if a position is valid (no overlapping objects at same height)
    isValidPosition(wall, position, height) {
        if (!wall || !position) return false;

        // Get all objects on this wall
        const existingObjects = [
            ...(this.store.state.sockets.sockets || []),
            ...(this.store.state.switches.switches || [])
        ].filter(obj => obj.wall === wall.id);

        // Calculate wall vector for distance calculations
        const wallVector = {
            x: wall.end.x - wall.start.x,
            y: wall.end.y - wall.start.y
        };
        const wallUnitVector = {
            x: wallVector.x / Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y),
            y: wallVector.y / Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y)
        };

        // Check each existing object
        for (const obj of existingObjects) {
            // Skip if at different height
            if (obj.dimensions.floorHeight !== height) continue;

            // Calculate distance along wall between objects
            const objVector = {
                x: obj.position.x - wall.start.x,
                y: obj.position.y - wall.start.y
            };
            const newObjVector = {
                x: position.x - wall.start.x,
                y: position.y - wall.start.y
            };

            const objProjection = objVector.x * wallUnitVector.x + objVector.y * wallUnitVector.y;
            const newObjProjection = newObjVector.x * wallUnitVector.x + newObjVector.y * wallUnitVector.y;
            
            const distance = Math.abs(newObjProjection - objProjection);

            // If the position is snapped (7cm spacing), it's valid
            if (Math.abs(distance - 7) < 0.1) {
                continue;
            }
            
            // Objects overlap if distance is less than their combined widths (8cm each)
            // and they're not properly snapped together
            if (distance < 8) {
                return false;
            }
        }

        return true;
    }

    // Calculate object position relative to wall edge
    calculatePosition(wall, mousePoint) {
        if (!wall || !mousePoint) return null;

        // If we have a snapped preview position, use that
        if (this.preview?.position?.snapped) {
            return {
                x: this.preview.position.x,
                y: this.preview.position.y,
                rotation: this.preview.position.rotation,
                side: this.preview.position.side,
                distanceToWall: 0,
                snapped: true
            };
        }

        // Get all walls from store
        const walls = this.store.state.walls.walls || [];
        const rooms = this.store.state.rooms.rooms || [];

        // Only get sockets and switches for magnetic snapping
        const existingObjects = [];
        if (this.preview && (this.preview.type === 'socket' || this.preview.type === 'single-switch' || this.preview.type === 'double-switch')) {
            existingObjects.push(
                ...(this.store.state.sockets.sockets || []),
                ...(this.store.state.switches.switches || [])
            );
        }

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

        // Calculate wall normal vector (pointing to the right of the wall direction)
        const normalVector = {
            x: -wallVector.y / wallLength,
            y: wallVector.x / wallLength
        };

        // Calculate mouse position relative to wall
        const mouseVector = {
            x: mousePoint.x - wall.start.x,
            y: mousePoint.y - wall.start.y
        };

        // Project mouse position onto wall
        const projection = mouseVector.x * wallUnitVector.x + mouseVector.y * wallUnitVector.y;

        // Clamp projection to wall length
        const clampedProjection = Math.max(0, Math.min(wallLength, projection));

        // Calculate position on wall
        let objectPosition = {
            x: wall.start.x + wallUnitVector.x * clampedProjection,
            y: wall.start.y + wallUnitVector.y * clampedProjection
        };

        // Only apply magnetic snapping for sockets and switches
        if (this.preview && (this.preview.type === 'socket' || this.preview.type === 'single-switch' || this.preview.type === 'double-switch')) {
            const SNAP_DISTANCE = 15; // Snap threshold in cm
            const OBJECT_SPACING = 7; // Required spacing between objects in cm

            // Find the nearest existing object for snapping
            let nearestObject = null;
            let minDistance = Infinity;

            for (const obj of existingObjects) {
                if (obj.wall !== wall.id) continue;

                // Skip objects at different heights
                if (obj.dimensions.floorHeight !== this.preview.dimensions.floorHeight) continue;

                // Calculate the position along the wall for both objects
                const objVector = {
                    x: obj.position.x - wall.start.x,
                    y: obj.position.y - wall.start.y
                };
                const objProjection = objVector.x * wallUnitVector.x + objVector.y * wallUnitVector.y;
                
                // Calculate distance along the wall
                const distanceAlongWall = Math.abs(projection - objProjection);

                if (distanceAlongWall < SNAP_DISTANCE && distanceAlongWall < minDistance) {
                    minDistance = distanceAlongWall;
                    nearestObject = {
                        object: obj,
                        projection: objProjection
                    };
                }
            }

            // If we found a nearby object, snap to it
            if (nearestObject) {
                // Determine which side to snap to based on mouse position
                const snapDirection = projection > nearestObject.projection ? 1 : -1;
                
                // Calculate new position along the wall
                const newProjection = nearestObject.projection + (OBJECT_SPACING * snapDirection);
                
                // Update position while maintaining the same distance from wall
                objectPosition = {
                    x: wall.start.x + wallUnitVector.x * newProjection,
                    y: wall.start.y + wallUnitVector.y * newProjection
                };
            }
        }

        // Calculate which side of the wall the mouse is on
        const mouseOnRightSide = mouseVector.x * normalVector.x + mouseVector.y * normalVector.y > 0;

        // Determine the correct side and position based on which edge we're attaching to
        const wallThickness = wall.thickness / 10; // Convert mm to cm
        let sideSign = mouseOnRightSide ? 1 : -1;
        
        // Offset position to be inside the room by half the wall thickness
        objectPosition.x += normalVector.x * (wallThickness / 2) * sideSign;
        objectPosition.y += normalVector.y * (wallThickness / 2) * sideSign;

        // Calculate base rotation from wall direction
        let rotation = Math.atan2(wallVector.y, wallVector.x);
        
        // Rotation depends only on which side we're attaching from
        if (mouseOnRightSide) {
            rotation += Math.PI; // When attaching from right edge, rotate to face left
        }

        // Return the final position and rotation
        return {
            x: objectPosition.x,
            y: objectPosition.y,
            rotation: rotation,
            side: mouseOnRightSide ? 'right' : 'left',
            distanceToWall: Math.abs(projection)
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

        // Always update panel preview dimensions from the store for instant reactivity
        if (preview.type === 'panel') {
            preview.dimensions.width = (this.store.state.panels?.defaultWidth || 300) / 10;
            preview.dimensions.height = (this.store.state.panels?.defaultHeight || 210) / 10;
            preview.dimensions.floorHeight = (this.store.state.panels?.defaultFloorHeight || 1200) / 10;
        }

        const { x, y, rotation, side } = preview.position;
        const wall = preview.wall;
        
        // Draw the main object preview
        ctx.save();
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Set preview colors
        ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
        ctx.strokeStyle = '#0096FF';
        ctx.lineWidth = 1;

        // Handle different object types
        if (preview.type === 'single-switch' || preview.type === 'double-switch') {
            this.drawSwitchPreview(ctx, preview);
        } else if (preview.type === 'wall-light') {
            this.drawWallLightPreview(ctx, preview);
        } else if (preview.type === 'socket') {
            this.drawSocketPreview(ctx, preview);
        } else if (preview.type === 'panel') {
            this.drawPanelPreview(ctx, preview);
        } else {
            // Draw square/rectangle representing other objects
            let width = preview.dimensions.width;
            let drawThickness = 8; // cm
            if (preview.type !== 'panel') {
                drawThickness = preview.dimensions.height || 8;
            }

            ctx.beginPath();
            ctx.rect(-width/2, -drawThickness/2, width, drawThickness);
            ctx.fill();
            ctx.stroke();

            // Draw connection point indicator
            ctx.beginPath();
            ctx.arc(0, 0, 1, 0, Math.PI * 2);
            ctx.fill();
        }

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

    // Draw preview for switches
    drawSwitchPreview(ctx, preview) {
        // Dimensions (same as in drawSwitch)
        const baseWidth = 10; // Width of the switch base on wall
        const radius = baseWidth / 2; // Radius of the semicircle
        const stickLength = 12; // Length of the angled line
        const endLength = 3; // Length of the bent end

        // Draw base line on wall
        ctx.beginPath();
        ctx.moveTo(-baseWidth/2, 0);
        ctx.lineTo(baseWidth/2, 0);
        ctx.stroke();

        // Draw semicircle attached to wall
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI, true);
        ctx.fill(); // Add fill for preview
        ctx.stroke();

        if (preview.type === 'single-switch') {
            // Calculate 70-degree angle points
            const angleInDegrees = 70;
            const angleInRadians = (angleInDegrees * Math.PI) / 180;
            
            // Calculate end point of angled line
            const stickEndX = stickLength * Math.cos(angleInRadians);
            const stickEndY = -stickLength * Math.sin(angleInRadians);

            // Draw angled line from semicircle
            ctx.beginPath();
            ctx.moveTo(0, -radius);
            ctx.lineTo(stickEndX, stickEndY);
            ctx.stroke();

            // Calculate perpendicular angle for end line
            const perpAngle = angleInRadians + Math.PI/2;
            const perpX = endLength * Math.cos(perpAngle);
            const perpY = -endLength * Math.sin(perpAngle);

            // Draw bent end line
            ctx.beginPath();
            ctx.moveTo(stickEndX, stickEndY);
            ctx.lineTo(stickEndX + perpX, stickEndY + perpY);
            ctx.stroke();
        } else if (preview.type === 'double-switch') {
            // First line
            const angle1Degrees = 70;
            const angle1Radians = (angle1Degrees * Math.PI) / 180;
            
            const stick1EndX = stickLength * Math.cos(angle1Radians);
            const stick1EndY = -stickLength * Math.sin(angle1Radians);

            ctx.beginPath();
            ctx.moveTo(0, -radius);
            ctx.lineTo(stick1EndX, stick1EndY);
            ctx.stroke();

            // First bent end
            const perp1Angle = angle1Radians + Math.PI/2;
            const perp1X = endLength * Math.cos(perp1Angle);
            const perp1Y = -endLength * Math.sin(perp1Angle);

            ctx.beginPath();
            ctx.moveTo(stick1EndX, stick1EndY);
            ctx.lineTo(stick1EndX + perp1X, stick1EndY + perp1Y);
            ctx.stroke();

            // Second line at a different angle
            const angle2Degrees = 100;
            const angle2Radians = (angle2Degrees * Math.PI) / 180;
            
            const stick2EndX = stickLength * Math.cos(angle2Radians);
            const stick2EndY = -stickLength * Math.sin(angle2Radians);

            ctx.beginPath();
            ctx.moveTo(0, -radius);
            ctx.lineTo(stick2EndX, stick2EndY);
            ctx.stroke();

            // Second bent end
            const perp2Angle = angle2Radians + Math.PI/2;
            const perp2X = endLength * Math.cos(perp2Angle);
            const perp2Y = -endLength * Math.sin(perp2Angle);

            ctx.beginPath();
            ctx.moveTo(stick2EndX, stick2EndY);
            ctx.lineTo(stick2EndX + perp2X, stick2EndY + perp2Y);
            ctx.stroke();
        }

        // Draw connection point indicator
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw preview for wall lights
    drawWallLightPreview(ctx, preview) {
        const { side } = preview.position;

        // Add 180-degree rotation
        ctx.rotate(Math.PI);

        // Draw concentric semicircles
        const middleRadius = 8; // Middle circle radius in cm
        const innerRadius = 4; // Smallest circle radius in cm

        // Determine the arc direction based on which side of the wall the light is placed
        const startAngle = side === 'right' ? 0 : Math.PI;
        const endAngle = side === 'right' ? Math.PI : 0;
        const counterclockwise = side === 'left';

        // Draw middle semicircle with fill for preview
        ctx.beginPath();
        ctx.arc(0, 0, middleRadius, startAngle, endAngle, counterclockwise);
        ctx.fill(); // Add fill for preview
        ctx.stroke();

        // Draw inner semicircle
        ctx.beginPath();
        ctx.arc(0, 0, innerRadius, startAngle, endAngle, counterclockwise);
        ctx.stroke();

        // Draw base line (connection to wall)
        const baseLength = 4; // Length of base line in cm
        ctx.beginPath();
        ctx.moveTo(-baseLength/2, 0);
        ctx.lineTo(baseLength/2, 0);
        ctx.stroke();

        // Draw connection point indicator
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw preview for sockets
    drawSocketPreview(ctx, preview) {
        // Dimensions (same as in drawSocket)
        const baseWidth = 10; // Width of the socket base on wall
        const radius = baseWidth / 2; // Radius of the semicircle
        const lineLength = 6; // Length of the straight line

        // Draw base line on wall
        ctx.beginPath();
        ctx.moveTo(-baseWidth/2, 0);
        ctx.lineTo(baseWidth/2, 0);
        ctx.stroke();

        // Draw semicircle attached to wall
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI, true);
        ctx.fill(); // Add fill for preview
        ctx.stroke();

        // Draw straight line from semicircle
        ctx.beginPath();
        ctx.moveTo(0, -radius);
        ctx.lineTo(0, -(radius + lineLength));
        ctx.stroke();

        // Draw connection point indicator
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw preview for electrical panel
    drawPanelPreview(ctx, preview) {
        // Get panel dimensions
        const width = preview.dimensions.width;
        const thickness = 8; // Fixed 8cm thickness
        const wallExtension = 14; // How far the panel extends from the wall
        
        // Calculate offset to position panel correctly relative to wall
        // Move the panel 6cm into the wall, leaving 2cm extending out
        const offset = -(thickness - wallExtension) / 2;
        ctx.translate(0, offset);
        
        // Draw main panel rectangle
        ctx.beginPath();
        ctx.rect(-width/2, -thickness/2, width, thickness);
        ctx.fill();
        ctx.stroke();

        // Draw vertical lines inside (representing the ventilation slots)
        const numLines = Math.floor(width / 2); // One line every 2cm
        const lineSpacing = width / numLines;
        const lineHeight = thickness * 0.7; // Lines are 70% of panel thickness
        const startY = -lineHeight/2;
        const endY = lineHeight/2;

        // Draw the vertical lines
        for (let i = 1; i < numLines; i++) {
            const x = -width/2 + i * lineSpacing;
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }

        // Draw the mounting bracket on top
        const bracketWidth = width * 0.2;
        const bracketHeight = thickness * 0.15;
        
        ctx.beginPath();
        ctx.rect(-bracketWidth/2, -thickness/2 - bracketHeight, bracketWidth, bracketHeight);
        ctx.fill();
        ctx.stroke();

        // Draw connection point indicator
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Create final object
    createObject(preview) {
        if (!preview || !preview.wall || !preview.position) return null;

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
            dimensions: {
                ...preview.dimensions
            }
        };
    }

    updatePreview(mousePoint) {
        if (!this.preview) return;

        // Get all walls from store
        const walls = this.store.state.walls.walls || [];

        // Find nearest wall and calculate initial position
        const { wall, position, distance } = this.findNearestWall(mousePoint, walls);

        // If we're not near a wall, clear preview and return
        if (!position || !wall) {
            this.preview.position = null;
            this.preview.wall = null;
            return Infinity;
        }

        // Calculate wall vector and unit vector
        const wallVector = {
            x: wall.end.x - wall.start.x,
            y: wall.end.y - wall.start.y
        };
        const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);
        const wallUnitVector = {
            x: wallVector.x / wallLength,
            y: wallVector.y / wallLength
        };

        // Calculate wall normal vector
        const normalVector = {
            x: -wallVector.y / wallLength,
            y: wallVector.x / wallLength
        };

        // For sockets and switches, check for magnetic snapping
        if (this.preview.type === 'socket' || this.preview.type === 'single-switch' || this.preview.type === 'double-switch') {
            const SNAP_DISTANCE = 15; // Snap threshold in cm
            const OBJECT_SPACING = 7; // Required spacing between objects in cm

            // Get existing sockets and switches
            const existingObjects = [
                ...(this.store.state.sockets.sockets || []),
                ...(this.store.state.switches.switches || [])
            ].filter(obj => obj.wall === wall.id);

            // Project mouse point onto wall
            const mouseVector = {
                x: mousePoint.x - wall.start.x,
                y: mousePoint.y - wall.start.y
            };
            const mouseProjection = mouseVector.x * wallUnitVector.x + mouseVector.y * wallUnitVector.y;

            // Find nearest object for snapping
            let nearestObject = null;
            let minDistance = Infinity;

            for (const obj of existingObjects) {
                // Skip objects at different heights
                if (obj.dimensions.floorHeight !== this.preview.dimensions.floorHeight) continue;

                // Calculate object's position along the wall
                const objVector = {
                    x: obj.position.x - wall.start.x,
                    y: obj.position.y - wall.start.y
                };
                const objProjection = objVector.x * wallUnitVector.x + objVector.y * wallUnitVector.y;
                
                // Calculate distance along the wall
                const distanceAlongWall = Math.abs(mouseProjection - objProjection);
                
                if (distanceAlongWall < SNAP_DISTANCE && distanceAlongWall < minDistance) {
                    minDistance = distanceAlongWall;
                    nearestObject = {
                        object: obj,
                        projection: objProjection
                    };
                }
            }

            // If we found a nearby object, snap to it
            if (nearestObject) {
                // Determine snap direction based on mouse position
                const snapDirection = mouseProjection > nearestObject.projection ? 1 : -1;
                
                // Calculate snapped position
                const newProjection = nearestObject.projection + (OBJECT_SPACING * snapDirection);
                
                // Calculate which side of the wall the mouse is on
                const mouseToWall = {
                    x: mousePoint.x - (wall.start.x + wallUnitVector.x * mouseProjection),
                    y: mousePoint.y - (wall.start.y + wallUnitVector.y * mouseProjection)
                };
                const normalProjection = mouseToWall.x * normalVector.x + mouseToWall.y * normalVector.y;
                const mouseOnRightSide = normalProjection > 0;

                // Update preview position while maintaining wall alignment
                const wallThickness = wall.thickness / 10; // Convert mm to cm
                const sideOffset = (wallThickness / 2) * (mouseOnRightSide ? 1 : -1);

                position.x = wall.start.x + wallUnitVector.x * newProjection + normalVector.x * sideOffset;
                position.y = wall.start.y + wallUnitVector.y * newProjection + normalVector.y * sideOffset;
                position.rotation = Math.atan2(wallVector.y, wallVector.x) + (mouseOnRightSide ? Math.PI : 0);
                position.side = mouseOnRightSide ? 'right' : 'left';
                position.snapped = true;
            }
        }

        // Update preview with final position
        this.preview.position = position;
        this.preview.wall = wall;

        return distance;
    }

    // Check if current preview is valid for placement
    isValidPlacement() {
        if (!this.preview || !this.preview.position || !this.preview.wall) {
            return {
                valid: false,
                error: 'Invalid placement position'
            };
        }

        // Get the wall - the preview.wall is already the wall object, not just an ID
        const wall = this.preview.wall;
        if (!wall) {
            return {
                valid: false,
                error: 'Wall not found'
            };
        }

        // Check for overlapping objects at same height
        const isValid = this.isValidPosition(
            wall, 
            this.preview.position, 
            this.preview.dimensions.floorHeight
        );

        if (!isValid) {
            return {
                valid: false,
                error: 'Cannot place object here - overlaps with existing object at same height'
            };
        }

        return {
            valid: true,
            error: null
        };
    }
} 