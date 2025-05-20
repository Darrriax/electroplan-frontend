// WallCenteredObject.js - Manager for objects centered on walls (doors, windows, electrical panel)
export default class WallCenteredObject {
    constructor(store) {
        this.store = store;
        this.preview = null;
        // Define default dimensions for each object type (in mm)
        this.objectDefaults = {
            door: {
                length: this.store.state.doors.defaultWidth || 800,
                height: this.store.state.doors.defaultHeight || 2000,
                openingDirection: this.store.state.doors.defaultOpeningDirection || 'left',
                openingSide: this.store.state.doors.defaultOpeningSide || 'inside'
            },
            window: {
                length: this.store.state.windows.defaultWidth || 1350,
                height: this.store.state.windows.defaultHeight || 1350,
                floorHeight: this.store.state.windows.defaultFloorHeight || 900
            }
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

    // Update dimensions of the preview object
    updateDimensions(dimensions) {
        if (this.preview) {
            if (dimensions.length !== undefined) {
                this.preview.dimensions.length = dimensions.length / 10; // Convert mm to cm
                // Update store default width if it's a door, window, or panel
                if (this.preview.type === 'door') {
                    this.store.dispatch('doors/updateDefaultWidth', dimensions.length);
                } else if (this.preview.type === 'window') {
                    this.store.dispatch('windows/setDefaultWidth', dimensions.length);
                }
            }
            if (dimensions.height !== undefined) {
                this.preview.dimensions.height = dimensions.height / 10; // Convert mm to cm
                // Update store default height if it's a door, window, or panel
                if (this.preview.type === 'door') {
                    this.store.dispatch('doors/updateDefaultHeight', dimensions.height);
                } else if (this.preview.type === 'window') {
                    this.store.dispatch('windows/setDefaultHeight', dimensions.height);
                }
            }
            if (dimensions.floorHeight !== undefined) {
                if (this.preview.type === 'window') {
                    this.preview.dimensions.floorHeight = dimensions.floorHeight / 10; // Convert mm to cm
                    this.store.dispatch('windows/setDefaultFloorHeight', dimensions.floorHeight);
                }
            }
            if (dimensions.thickness !== undefined) {
                this.preview.dimensions.thickness = dimensions.thickness / 10; // Convert mm to cm
            }


        }
    }

    // Initialize object preview when tool is selected
    initializePreview(type) {
        let defaultLength;
        let additionalProps = {};

        if (type === 'door') {
            // Always get fresh values from the store
            defaultLength = this.store.state.doors.defaultWidth;
            additionalProps = {
                openingDirection: this.store.state.doors.defaultOpeningDirection,
                openingSide: this.store.state.doors.defaultOpeningSide,
                height: this.store.state.doors.defaultHeight
            };
        } else if (type === 'window') {
            // Always get fresh values from the store
            defaultLength = this.store.state.windows.defaultWidth;
            additionalProps = {
                height: this.store.state.windows.defaultHeight,
                floorHeight: this.store.state.windows.defaultFloorHeight
            };
        } else {
            defaultLength = this.objectDefaults[type]?.length || 1000;
        }

        this.preview = {
            type,
            dimensions: {
                length: defaultLength / 10, // Convert mm to cm
                height: additionalProps.height ? additionalProps.height / 10 : null, // Convert mm to cm
                thickness: null, // Will be set to match wall thickness
                floorHeight: additionalProps.floorHeight ? additionalProps.floorHeight / 10 : null // Convert mm to cm
            },
            position: null,
            wall: null,
            centerOffset: 0,
            ...additionalProps
        };

        return this.preview;
    }

    // Update preview based on current mouse position
    updatePreview(mousePoint) {
        if (!this.preview) return;

        // Get all walls from store
        const walls = this.store.state.walls.walls || [];

        // Find nearest wall and calculate position
        const { wall, position, distance } = this.findNearestWall(mousePoint, walls);

        // Update preview with current store values
        if (this.preview.type === 'door') {
            const currentWidth = this.store.state.doors.defaultWidth;
            const currentHeight = this.store.state.doors.defaultHeight;
            
            this.preview.dimensions.length = currentWidth / 10; // Convert mm to cm
            this.preview.dimensions.height = currentHeight / 10; // Convert mm to cm
            this.preview.openingDirection = this.store.state.doors.defaultOpeningDirection;
            this.preview.openingSide = this.store.state.doors.defaultOpeningSide;
        } else if (this.preview.type === 'window') {
            const currentWidth = this.store.state.windows.defaultWidth;
            const currentHeight = this.store.state.windows.defaultHeight;
            const currentFloorHeight = this.store.state.windows.defaultFloorHeight;
            
            this.preview.dimensions.length = currentWidth / 10; // Convert mm to cm
            this.preview.dimensions.height = currentHeight / 10; // Convert mm to cm
            this.preview.dimensions.floorHeight = currentFloorHeight / 10; // Convert mm to cm
        }

        // Update preview position and wall reference
        this.preview.position = position;
        this.preview.wall = wall;

        return distance;
    }

    // Calculate object position relative to wall
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

        // Calculate internal wall length considering connected walls
        const availableLength = this.calculateInternalWallLength(wall, connectedWalls);
        
        // Check if door fits in the wall
        if (this.preview?.type === 'door') {
            const doorLength = this.preview.dimensions.length; // Already in cm
            if (doorLength > availableLength) {
                return null; // Door doesn't fit
            }
        }

        // Calculate wall unit vector
        const wallUnitVector = {
            x: wallVector.x / wallLength,
            y: wallVector.y / wallLength
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

        // Calculate relative position along wall (0 to 1)
        const mouseVector = {
            x: mousePoint.x - internalStart.x,
            y: mousePoint.y - internalStart.y
        };
        const relativePos = (
            mouseVector.x * wallUnitVector.x +
            mouseVector.y * wallUnitVector.y
        ) / internalLength;

        // Get object length (in cm)
        const objectLength = this.preview?.dimensions?.length || 100;

        // Calculate minimum and maximum allowed positions
        const halfObjectLength = objectLength / 2;
        const minPos = halfObjectLength / internalLength;
        const maxPos = 1 - halfObjectLength / internalLength;

        // Constrain position to internal wall length considering object length
        const constrainedPos = Math.max(minPos, Math.min(maxPos, relativePos));

        // Calculate actual position on internal wall
        const centerPoint = {
            x: internalStart.x + wallUnitVector.x * (constrainedPos * internalLength),
            y: internalStart.y + wallUnitVector.y * (constrainedPos * internalLength)
        };

        // Store the centerOffset for dimension calculations
        if (this.preview) {
            this.preview.centerOffset = constrainedPos * internalLength;
        }

        return {
            x: centerPoint.x,
            y: centerPoint.y,
            rotation: Math.atan2(wallVector.y, wallVector.x)
        };
    }

    // Calculate internal wall length considering connected walls
    calculateInternalWallLength(wall, connectedWalls) {
        // Calculate wall vector and length
        const wallVector = {
            x: wall.end.x - wall.start.x,
            y: wall.end.y - wall.start.y
        };
        const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);

        // Calculate wall unit vector
        const wallUnitVector = {
            x: wallVector.x / wallLength,
            y: wallVector.y / wallLength
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

        // Calculate and return internal length
        return Math.sqrt(
            Math.pow(internalEnd.x - internalStart.x, 2) +
            Math.pow(internalEnd.y - internalStart.y, 2)
        );
    }

    // Helper method to check if two points are equal (within a small threshold)
    pointsAreEqual(p1, p2, threshold = 1) {
        return Math.abs(p1.x - p2.x) < threshold && Math.abs(p1.y - p2.y) < threshold;
    }

    // Check if mouse is near a wall
    findNearestWall(mousePoint, walls) {
        if (!mousePoint || !walls || !walls.length) return { wall: null, position: null, distance: Infinity };

        let nearestWall = null;
        let minDistance = Infinity;
        let position = null;

        walls.forEach(wall => {
            const distance = this.pointToLineDistance(mousePoint, wall.start, wall.end);
            
            // Check if point is within wall bounds and closer than previous nearest
            if (distance < minDistance && this.isPointNearWallSegment(mousePoint, wall)) {
                minDistance = distance;
                nearestWall = wall;
                position = this.calculatePosition(wall, mousePoint);

                // Update preview thickness to match wall (convert from mm to cm)
                if (this.preview) {
                    this.preview.dimensions.thickness = wall.thickness / 10;
                }
            }
        });

        return { wall: nearestWall, position, distance: minDistance };
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
    drawDivisionMark(ctx, point, offset, length, angle) {
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -length);
        ctx.stroke();
        
        ctx.restore();
    }

    // Draw preview of the object with dimensions
    drawPreview(ctx, preview = this.preview, wall = preview?.wall) {
        if (!ctx || !preview || !preview.position || !wall) return;

        // For doors, windows, and panels, ensure we have the latest dimensions from the store
        if (preview.type === 'door') {
            preview.dimensions.length = this.store.state.doors.defaultWidth / 10;
            preview.dimensions.height = this.store.state.doors.defaultHeight / 10;
            preview.openingDirection = this.store.state.doors.defaultOpeningDirection;
            preview.openingSide = this.store.state.doors.defaultOpeningSide;
        } else if (preview.type === 'window') {
            preview.dimensions.length = this.store.state.windows.defaultWidth / 10;
            preview.dimensions.height = this.store.state.windows.defaultHeight / 10;
            preview.dimensions.floorHeight = this.store.state.windows.defaultFloorHeight / 10;
        }

        const { x, y, rotation } = preview.position;
        
        // Draw the main object preview
        ctx.save();
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Draw rectangle representing the object
        ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
        ctx.strokeStyle = '#0096FF';
        ctx.lineWidth = 1 / this.zoom;

        const length = preview.dimensions.length;
        const thickness = wall.thickness / 10; // Convert wall thickness from mm to cm

        // Draw the main rectangle
        ctx.beginPath();
        ctx.rect(-length/2, -thickness/2, length, thickness);
        ctx.fill();
        ctx.stroke();

        // Add visual indicators based on object type
        switch(preview.type) {
            case 'door':
                this.drawDoorIndicator(ctx, length, thickness);
                break;
            case 'window':
                this.drawWindowIndicator(ctx, length, thickness);
                break;
        }

        ctx.restore();

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

        // Calculate internal wall points (accounting for thickness)
        const halfThickness = thickness / 2;
        const internalStart = {
            x: wall.start.x + wallUnitVector.x * halfThickness,
            y: wall.start.y + wallUnitVector.y * halfThickness
        };
        const internalEnd = {
            x: wall.end.x - wallUnitVector.x * halfThickness,
            y: wall.end.y - wallUnitVector.y * halfThickness
        };

        // Calculate object start and end points
        const objectStartPoint = {
            x: x - Math.cos(rotation) * length/2,
            y: y - Math.sin(rotation) * length/2
        };
        const objectEndPoint = {
            x: x + Math.cos(rotation) * length/2,
            y: y + Math.sin(rotation) * length/2
        };

        // Calculate distances from internal corners
        const leftDistance = Math.sqrt(
            Math.pow(objectStartPoint.x - internalStart.x, 2) +
            Math.pow(objectStartPoint.y - internalStart.y, 2)
        );

        const rightDistance = Math.sqrt(
            Math.pow(internalEnd.x - objectEndPoint.x, 2) +
            Math.pow(internalEnd.y - objectEndPoint.y, 2)
        );

        // Draw dimensions
        const dimensionOffset = thickness * 1.5; // Reduced offset to bring dimension line closer to wall
        const divisionMarkLength = thickness * 0.5; // Shorter division marks to match the closer positioning

        // Save context for dimension drawing
        ctx.save();
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1 / this.zoom;

        // Calculate normal vector for offset direction
        const nx = -wallVector.y / wallLength;
        const ny = wallVector.x / wallLength;

        // Calculate offset points for the main dimension line
        const offsetStart = {
            x: internalStart.x + nx * dimensionOffset,
            y: internalStart.y + ny * dimensionOffset
        };
        const offsetEnd = {
            x: internalEnd.x + nx * dimensionOffset,
            y: internalEnd.y + ny * dimensionOffset
        };

        // Draw main dotted line
        ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);
        ctx.beginPath();
        ctx.moveTo(offsetStart.x, offsetStart.y);
        ctx.lineTo(offsetEnd.x, offsetEnd.y);
        ctx.stroke();

        // Draw division marks and dimensions
        ctx.setLineDash([]); // Division marks are solid
        const angle = Math.atan2(wallVector.y, wallVector.x);

        // Draw start division mark
        this.drawDivisionMark(ctx, objectStartPoint, dimensionOffset, divisionMarkLength, angle);

        // Draw end division mark
        this.drawDivisionMark(ctx, objectEndPoint, dimensionOffset, divisionMarkLength, angle);

        // Draw extension lines from object to dimension line
        ctx.beginPath();
        ctx.moveTo(objectStartPoint.x, objectStartPoint.y);
        ctx.lineTo(objectStartPoint.x + nx * dimensionOffset, objectStartPoint.y + ny * dimensionOffset);
        ctx.moveTo(objectEndPoint.x, objectEndPoint.y);
        ctx.lineTo(objectEndPoint.x + nx * dimensionOffset, objectEndPoint.y + ny * dimensionOffset);
        ctx.stroke();

        ctx.restore();

        // Draw dimensions text
        const leftDistanceDisplay = this.convertToDisplayUnits(leftDistance);
        const rightDistanceDisplay = this.convertToDisplayUnits(rightDistance);
        const objectLengthDisplay = this.convertToDisplayUnits(length);

        // Draw left distance
        this.drawDimensionLine(
            ctx,
            internalStart,
            objectStartPoint,
            dimensionOffset,
            `${leftDistanceDisplay.value} ${leftDistanceDisplay.unit}`
        );

        // Draw object length
        this.drawDimensionLine(
            ctx,
            objectStartPoint,
            objectEndPoint,
            dimensionOffset,
            `${objectLengthDisplay.value} ${objectLengthDisplay.unit}`,
            true
        );

        // Draw right distance
        this.drawDimensionLine(
            ctx,
            objectEndPoint,
            internalEnd,
            dimensionOffset,
            `${rightDistanceDisplay.value} ${rightDistanceDisplay.unit}`
        );
    }

    // Draw door-specific indicators
    drawDoorIndicator(ctx, length, thickness) {
        const openingDirection = this.preview.openingDirection || this.store.state.doors.defaultOpeningDirection;
        const openingSide = this.preview.openingSide || this.store.state.doors.defaultOpeningSide;
        
        // Draw door swing arc
        ctx.beginPath();
        ctx.strokeStyle = '#0096FF';
        ctx.setLineDash([2 / this.zoom, 2 / this.zoom]); // Adjust dash size for zoom

        // Determine arc parameters based on opening direction and side
        const radius = length;
        let startX, startY, startAngle, endAngle, counterClockwise;

        // Calculate door leaf Y position
        const doorY = openingSide === 'inside' ? -thickness/2 : thickness/2;

        if (openingDirection === 'right') {
            // For outside configuration, shift the arc center to the left
            startX = openingSide === 'inside' ? length/2 : -length/2;
            startY = doorY;
            if (openingSide === 'inside') {
                // Right Inside
                startAngle = Math.PI * 0.5; // Start at 90 degrees
                endAngle = Math.PI; // End at 180 degrees
                counterClockwise = false;
            } else {
                // Right Outside
                startAngle = Math.PI * 1.5; // Start at 270 degrees
                endAngle = Math.PI * 2; // End at 360 degrees (0 degrees)
                counterClockwise = false;
            }
        } else { // left
            // For outside configuration, shift the arc center to the right
            startX = openingSide === 'inside' ? -length/2 : length/2;
            startY = doorY;
            if (openingSide === 'inside') {
                // Left Inside
                startAngle = 0;
                endAngle = Math.PI * 0.5; // End at 90 degrees
                counterClockwise = false;
            } else {
                // Left Outside
                startAngle = Math.PI;
                endAngle = Math.PI * 1.5; // End at 270 degrees
                counterClockwise = false;
            }
        }

        // Draw the arc
        ctx.arc(startX, startY, radius, startAngle, endAngle, counterClockwise);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw the door leaf line
        ctx.beginPath();
        ctx.strokeStyle = '#0096FF';
        ctx.lineWidth = 2 / this.zoom;

        // Draw door leaf line
        ctx.moveTo(-length/2, doorY);
        ctx.lineTo(length/2, doorY);
        ctx.stroke();
    }

    // Draw window-specific indicators
    drawWindowIndicator(ctx, length, thickness) {
        // Use the current preview dimensions instead of passed parameters
        const currentLength = this.preview.dimensions.length;
        
        // Draw window panes
        ctx.strokeStyle = '#0096FF';
        ctx.lineWidth = 1 / this.zoom; // Adjust line width for zoom
        ctx.beginPath();
        ctx.moveTo(-currentLength/4, -thickness/2);
        ctx.lineTo(-currentLength/4, thickness/2);
        ctx.moveTo(currentLength/4, -thickness/2);
        ctx.lineTo(currentLength/4, thickness/2);
        ctx.stroke();

        // Draw window outline
        ctx.strokeRect(-currentLength/2, -thickness/2, currentLength, thickness);
    }

    // Create final object
    createObject() {
        if (!this.preview || !this.preview.wall) return null;

        // Create base object with common properties
        const baseObject = {
            id: Date.now().toString(),
            type: this.preview.type,
            wallId: this.preview.wall.id,
            position: {
                x: this.preview.position.x,
                y: this.preview.position.y,
                rotation: this.preview.position.rotation
            },
            dimensions: {
                length: this.preview.dimensions.length * 10, // cm to mm
                height: this.preview.dimensions.height * 10, // cm to mm
                thickness: this.preview.dimensions.thickness * 10, // cm to mm
                floorHeight: this.preview.dimensions.floorHeight ? this.preview.dimensions.floorHeight * 10 : null // cm to mm
            },
            centerOffset: this.preview.centerOffset
        };

        // Add tool-specific properties
        switch (this.preview.type) {
            case 'door':
                return {
                    ...baseObject,
                    openingDirection: this.preview.openingDirection || 
                                    this.store.state.doors?.defaultOpeningDirection || 
                                    'left',
                    openingSide: this.preview.openingSide || 
                                this.store.state.doors?.defaultOpeningSide || 
                                'inside'
                };
            case 'window':
                return {
                    ...baseObject,
                    floorHeight: this.preview.dimensions.floorHeight || 1000
                };
            default:
                return baseObject;
        }
    }

    // Helper method to calculate distance from point to line
    pointToLineDistance(point, lineStart, lineEnd) {
        if (!point || !lineStart || !lineEnd) return Infinity;

        const numerator = Math.abs(
            (lineEnd.y - lineStart.y) * point.x -
            (lineEnd.x - lineStart.x) * point.y +
            lineEnd.x * lineStart.y -
            lineEnd.y * lineStart.x
        );
        const denominator = Math.sqrt(
            Math.pow(lineEnd.y - lineStart.y, 2) +
            Math.pow(lineEnd.x - lineStart.x, 2)
        );
        return denominator === 0 ? Infinity : numerator / denominator;
    }

    // Helper method to check if point is near wall segment
    isPointNearWallSegment(point, wall) {
        if (!point || !wall) return false;

        const wallVector = {
            x: wall.end.x - wall.start.x,
            y: wall.end.y - wall.start.y
        };
        const pointVector = {
            x: point.x - wall.start.x,
            y: point.y - wall.start.y
        };
        const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);
        
        if (wallLength === 0) return false;

        // Calculate dot product
        const dot = (pointVector.x * wallVector.x + pointVector.y * wallVector.y) / wallLength;
        
        // Check if point projection lies on wall segment
        return dot >= 0 && dot <= wallLength;
    }

    // Update door properties
    updateDoorProperties(properties) {
        if (this.preview && this.preview.type === 'door') {
            this.preview = {
                ...this.preview,
                ...properties
            };
        }
    }

    setTool(type) {
        if (!type) {
            this.preview = null;
            return;
        }
        this.initializePreview(type);
    }

    // Draw final object (used by ObjectCanvasRenderer)
    drawFinalObject(ctx, object, wall) {
        if (!ctx || !object || !wall) return;

        // Set black color for all final objects
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#000000';
        ctx.lineWidth = 1;

        // Calculate position and rotation
        const length = object.dimensions.length / 10; // Convert mm to cm
        const thickness = wall.thickness / 10; // Convert wall thickness from mm to cm

        // Save context state
        ctx.save();
        
        // Move to object position
        ctx.translate(object.position.x, object.position.y);
        ctx.rotate(object.position.rotation);

        // Draw based on object type
        switch (object.type) {
            case 'door':
                this.drawFinalDoorIndicator(ctx, object, length, thickness);
                break;
            case 'window':
                this.drawFinalWindowIndicator(ctx, length, thickness);
                break;
        }

        // Restore context state
        ctx.restore();
    }

    // Draw final door indicators in black
    drawFinalDoorIndicator(ctx, door, length, thickness) {
        // Draw door frame with semi-transparent fill
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Semi-transparent black fill
        ctx.strokeStyle = '#000000';
        ctx.rect(-length/2, -thickness/2, length, thickness);
        ctx.fill();  // Fill first
        ctx.stroke(); // Then stroke

        // Calculate door leaf Y position based on opening side
        const doorY = door.openingSide === 'inside' ? -thickness/2 : thickness/2;

        // Draw door swing arc
        ctx.beginPath();
        ctx.strokeStyle = '#000000';

        // Determine arc parameters based on opening direction and side
        const radius = length;
        let startX, startY, startAngle, endAngle, counterClockwise;

        if (door.openingDirection === 'right') {
            // For outside configuration, shift the arc center to the left
            startX = door.openingSide === 'inside' ? length/2 : -length/2;
            startY = doorY;
            if (door.openingSide === 'inside') {
                // Right Inside
                startAngle = Math.PI * 0.5; // Start at 90 degrees
                endAngle = Math.PI; // End at 180 degrees
                counterClockwise = false;
            } else {
                // Right Outside
                startAngle = Math.PI * 1.5; // Start at 270 degrees
                endAngle = Math.PI * 2; // End at 360 degrees (0 degrees)
                counterClockwise = false;
            }
        } else { // left
            // For outside configuration, shift the arc center to the right
            startX = door.openingSide === 'inside' ? -length/2 : length/2;
            startY = doorY;
            if (door.openingSide === 'inside') {
                // Left Inside
                startAngle = 0;
                endAngle = Math.PI * 0.5; // End at 90 degrees
                counterClockwise = false;
            } else {
                // Left Outside
                startAngle = Math.PI;
                endAngle = Math.PI * 1.5; // End at 270 degrees
                counterClockwise = false;
            }
        }

        // Draw the arc
        ctx.arc(startX, startY, radius, startAngle, endAngle, counterClockwise);
        ctx.stroke();

        // Draw the door leaf line
        ctx.beginPath();
        ctx.lineWidth = 2;

        // Draw door leaf line
        ctx.moveTo(-length/2, doorY);
        ctx.lineTo(length/2, doorY);
        ctx.stroke();
    }

    // Draw final window indicators in black
    drawFinalWindowIndicator(ctx, length, thickness) {
        // Draw window frame with semi-transparent fill
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Semi-transparent black fill
        ctx.strokeStyle = '#000000';
        ctx.rect(-length/2, -thickness/2, length, thickness);
        ctx.fill();  // Fill first
        ctx.stroke(); // Then stroke

        // Draw window panes
        ctx.beginPath();
        ctx.moveTo(-length/4, -thickness/2);
        ctx.lineTo(-length/4, thickness/2);
        ctx.moveTo(length/4, -thickness/2);
        ctx.lineTo(length/4, thickness/2);
        ctx.stroke();
    }
} 