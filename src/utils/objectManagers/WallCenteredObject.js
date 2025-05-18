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
            },
            panel: {
                length: this.store.state.panels.defaultWidth || 300,
                height: this.store.state.panels.defaultHeight || 210,
                floorHeight: this.store.state.panels.defaultFloorHeight || 1200
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
                } else if (this.preview.type === 'panel') {
                    this.store.dispatch('panels/setDefaultWidth', dimensions.length);
                }
            }
            if (dimensions.height !== undefined) {
                this.preview.dimensions.height = dimensions.height / 10; // Convert mm to cm
                // Update store default height if it's a door, window, or panel
                if (this.preview.type === 'door') {
                    this.store.dispatch('doors/updateDefaultHeight', dimensions.height);
                } else if (this.preview.type === 'window') {
                    this.store.dispatch('windows/setDefaultHeight', dimensions.height);
                } else if (this.preview.type === 'panel') {
                    this.store.dispatch('panels/setDefaultHeight', dimensions.height);
                }
            }
            if (dimensions.floorHeight !== undefined) {
                if (this.preview.type === 'window') {
                    this.preview.dimensions.floorHeight = dimensions.floorHeight / 10; // Convert mm to cm
                    this.store.dispatch('windows/setDefaultFloorHeight', dimensions.floorHeight);
                } else if (this.preview.type === 'panel') {
                    this.preview.dimensions.floorHeight = dimensions.floorHeight / 10; // Convert mm to cm
                    this.store.dispatch('panels/setDefaultFloorHeight', dimensions.floorHeight);
                }
            }
            if (dimensions.thickness !== undefined) {
                this.preview.dimensions.thickness = dimensions.thickness / 10; // Convert mm to cm
            }

            // Immediately update preview dimensions from store for real-time updates
            if (this.preview.type === 'window') {
                this.preview.dimensions = {
                    ...this.preview.dimensions,
                    length: this.store.state.windows.defaultWidth / 10,
                    height: this.store.state.windows.defaultHeight / 10,
                    floorHeight: this.store.state.windows.defaultFloorHeight / 10
                };
            } else if (this.preview.type === 'panel') {
                this.preview.dimensions = {
                    ...this.preview.dimensions,
                    length: this.store.state.panels.defaultWidth / 10,
                    height: this.store.state.panels.defaultHeight / 10,
                    floorHeight: this.store.state.panels.defaultFloorHeight / 10
                };
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
        } else if (type === 'panel') {
            // Always get fresh values from the store
            defaultLength = this.store.state.panels.defaultWidth;
            additionalProps = {
                height: this.store.state.panels.defaultHeight,
                floorHeight: this.store.state.panels.defaultFloorHeight
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
        } else if (this.preview.type === 'panel') {
            const currentWidth = this.store.state.panels.defaultWidth;
            const currentHeight = this.store.state.panels.defaultHeight;
            const currentFloorHeight = this.store.state.panels.defaultFloorHeight;
            
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
        } else if (preview.type === 'panel') {
            preview.dimensions.length = this.store.state.panels.defaultWidth / 10;
            preview.dimensions.height = this.store.state.panels.defaultHeight / 10;
            preview.dimensions.floorHeight = this.store.state.panels.defaultFloorHeight / 10;
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
            case 'panel':
                this.drawPanelIndicator(ctx, length, thickness);
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

    // Draw panel-specific indicators
    drawPanelIndicator(ctx, length, thickness) {
        // Draw panel symbol
        ctx.strokeStyle = '#0096FF';
        ctx.lineWidth = 1 / this.zoom; // Adjust line width for zoom
        const size = Math.min(length, thickness) * 0.5;
        ctx.strokeRect(-size/2, -size/2, size, size);
        
        // Draw "electricity" symbol
        ctx.beginPath();
        ctx.moveTo(0, -size/4);
        ctx.lineTo(0, size/4);
        ctx.moveTo(-size/4, 0);
        ctx.lineTo(size/4, 0);
        ctx.stroke();
    }

    // Create final object
    createObject() {
        if (!this.preview || !this.preview.wall || !this.preview.position) return null;

        // Convert dimensions to mm for storage
        const dimensions = {
            length: this.preview.dimensions.length * 10, // cm to mm
            thickness: this.preview.dimensions.thickness * 10 // cm to mm
        };

        const baseObject = {
            id: Date.now().toString(),
            type: this.preview.type,
            wall: this.preview.wall.id,
            position: this.preview.position,
            dimensions: dimensions,
            centerOffset: this.preview.centerOffset
        };

        // Add type-specific properties
        if (this.preview.type === 'door') {
            return {
                ...baseObject,
                openingDirection: this.preview.openingDirection || this.store.state.doors.defaultOpeningDirection,
                openingSide: this.preview.openingSide || this.store.state.doors.defaultOpeningSide
            };
        } else if (this.preview.type === 'window') {
            return {
                ...baseObject,
                dimensions: {
                    ...dimensions,
                    height: this.store.state.windows.defaultHeight,
                    floorHeight: this.store.state.windows.defaultFloorHeight
                }
            };
        } else if (this.preview.type === 'panel') {
            return {
                ...baseObject,
                dimensions: {
                    ...dimensions,
                    height: this.store.state.panels.defaultHeight,
                    floorHeight: this.store.state.panels.defaultFloorHeight
                }
            };
        }

        return baseObject;
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
} 