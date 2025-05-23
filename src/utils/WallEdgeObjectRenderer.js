// WallEdgeObjectRenderer.js - Renderer for wall edge objects (sockets, switches, etc.)
export default class WallEdgeObjectRenderer {
    constructor(store) {
        this.store = store;
    }

    // Update canvas transform state
    updateTransform(panOffset, zoom) {
        this.panOffset = panOffset;
        this.zoom = zoom;
    }

    // Draw all wall edge objects
    drawObjects(ctx) {
        // Get all objects from store
        const sockets = this.store.getters['sockets/getAllSockets'] || [];
        const panels = this.store.getters['panels/getAllPanels'] || [];
        const wallLights = this.store.getters['lights/getAllWallLights'] || [];
        const switches = this.store.getters['switches/getAllSwitches'] || [];
        const walls = this.store.state.walls.walls || [];
        const hoveredLightIds = this.store.getters['lights/getHoveredLightIds'] || [];
        const hoveredSwitchIds = this.store.getters['switches/getHoveredSwitchIds'] || [];
        const currentMode = this.store.state.project.currentMode;
        const labelVisibility = this.store.state.project.labelVisibility;

        // Draw each socket
        sockets.forEach(socket => {
            const wall = walls.find(w => w.id === socket.wall);
            if (wall) {
                this.drawSocket(ctx, socket, wall);
            }
        });

        // Draw each panel (always visible in power-sockets/switches mode, or when enabled in auto-routing)
        const shouldShowPanels = currentMode === 'power-sockets' || 
                               currentMode === 'switches' ||
                               currentMode === 'auto-routing';
        if (shouldShowPanels) {
            panels.forEach(panel => {
                const wall = walls.find(w => w.id === panel.wall);
                if (wall) {
                    this.drawPanel(ctx, panel, wall);
                }
            });
        }

        // Draw each switch
        switches.forEach(switchObj => {
            const wall = walls.find(w => w.id === switchObj.wall);
            if (wall) {
                this.drawSwitch(ctx, switchObj, wall, hoveredSwitchIds.includes(switchObj.id));
            }
        });

        // Draw each wall light
        wallLights.forEach(light => {
            const wall = walls.find(w => w.id === light.wall);
            if (wall) {
                this.drawWallLight(ctx, light, wall, hoveredLightIds.includes(light.id));
            }
        });

        // Group objects by position and height
        const objectsToGroup = [];

        // Add sockets if they should be shown
        if (currentMode === 'power-sockets' || 
            currentMode === 'switches' || 
            (currentMode === 'auto-routing' && labelVisibility.sockets)) {
            objectsToGroup.push(...sockets.map(obj => ({ ...obj, type: 'socket' })));
        }

        // Add switches if they should be shown
        if (currentMode === 'switches' || 
            (currentMode === 'auto-routing' && labelVisibility.sockets)) {
            objectsToGroup.push(...switches.map(obj => ({ ...obj, type: 'switch' })));
        }

        // Add wall lights if they should be shown
        if (currentMode === 'light' || 
            (currentMode === 'auto-routing' && labelVisibility.wallLights)) {
            objectsToGroup.push(...wallLights.map(obj => ({ ...obj, type: 'wall-light' })));
        }

        // Add panels if they should be shown
        if (shouldShowPanels) {
            objectsToGroup.push(...panels.map(obj => ({ ...obj, type: 'panel' })));
        }

        const objectGroups = this.groupObjectsByPositionAndHeight(objectsToGroup);

        // Draw height labels for groups
        objectGroups.forEach(group => {
            const objectType = group.objects[0].type;
            
            // Check if labels should be shown based on mode and visibility settings
            const shouldShowLabel = (
                // Always show labels in non-auto-routing modes based on mode type
                (currentMode === 'power-sockets' && (objectType === 'socket' || objectType === 'panel')) ||
                (currentMode === 'light' && objectType === 'wall-light') ||
                (currentMode === 'switches' && (objectType === 'switch' || objectType === 'socket' || objectType === 'panel')) ||
                // In auto-routing mode, respect visibility settings
                (currentMode === 'auto-routing' && (
                    ((objectType === 'socket' || objectType === 'switch') && labelVisibility.sockets) ||
                    (objectType === 'wall-light' && labelVisibility.wallLights) ||
                    objectType === 'panel'
                ))
            );

            if (shouldShowLabel) {
                this.drawHeightLabel(ctx, group);
            }
        });
    }

    // Group objects that are within 8cm of each other and have the same height
    groupObjectsByPositionAndHeight(objects) {
        const groups = [];
        const processed = new Set();

        // First, handle wall lights and panels - each gets its own group
        objects.forEach(obj => {
            if ((obj.type === 'wall-light' || obj.type === 'panel') && !processed.has(obj.id)) {
                processed.add(obj.id);
                groups.push({
                    objects: [obj],
                    position: obj.position,
                    height: Math.round(obj.dimensions.floorHeight),
                    center: {
                        x: obj.position.x,
                        y: obj.position.y
                    },
                    verticalOffset: 0
                });
            }
        });

        // Helper function to find all connected sockets and switches recursively
        const findConnectedObjects = (obj, height, connectedGroup) => {
            objects.forEach(other => {
                if (other.id === obj.id || processed.has(other.id)) return;
                
                // Only group sockets and switches
                if (other.type !== 'socket' && other.type !== 'switch') return;
                
                // Check if objects are within 8cm and have the same height
                const distance = Math.sqrt(
                    Math.pow(other.position.x - obj.position.x, 2) +
                    Math.pow(other.position.y - obj.position.y, 2)
                );

                if (distance <= 8 && Math.round(other.dimensions.floorHeight) === height) {
                    connectedGroup.push(other);
                    processed.add(other.id);
                    // Recursively find objects connected to this one
                    findConnectedObjects(other, height, connectedGroup);
                }
            });
        };

        // Process remaining objects (sockets and switches)
        objects.forEach(obj => {
            if (processed.has(obj.id)) return;
            
            // Skip non-socket/switch objects as they've been handled above
            if (obj.type !== 'socket' && obj.type !== 'switch') return;

            const height = Math.round(obj.dimensions.floorHeight);
            const connectedGroup = [obj];
            processed.add(obj.id);

            // Find all objects connected to this one (directly or indirectly)
            findConnectedObjects(obj, height, connectedGroup);

            if (connectedGroup.length > 0) {
                // Calculate center point for the entire group
                const center = {
                    x: connectedGroup.reduce((sum, obj) => sum + obj.position.x, 0) / connectedGroup.length,
                    y: connectedGroup.reduce((sum, obj) => sum + obj.position.y, 0) / connectedGroup.length
                };

                groups.push({
                    objects: connectedGroup,
                    position: connectedGroup[0].position,
                    height: height,
                    center: center,
                    verticalOffset: 0
                });
            }
        });

        // Sort groups by height to stack labels if needed
        groups.sort((a, b) => b.height - a.height);
        
        // Assign vertical offsets to overlapping groups
        groups.forEach((group, i) => {
            for (let j = 0; j < i; j++) {
                const prevGroup = groups[j];
                const distance = Math.sqrt(
                    Math.pow(group.center.x - prevGroup.center.x, 2) +
                    Math.pow(group.center.y - prevGroup.center.y, 2)
                );
                
                // If centers are close, stack the labels
                if (distance < 30) {
                    group.verticalOffset = prevGroup.verticalOffset + 30;
                    break;
                }
            }
        });

        return groups;
    }

    // Convert height to display units based on project settings
    convertToDisplayUnits(height, objectType) {
        const unit = this.store.state.project.unit;
        let displayValue;
        let unitLabel;

        // All heights should be in millimeters
        const heightInMM = height;

        // Convert height from mm to the target unit
        switch (unit) {
            case 'mm':
                displayValue = Math.round(heightInMM);
                unitLabel = 'mm';
                break;
            case 'm':
                displayValue = (heightInMM / 1000).toFixed(2);
                unitLabel = 'm';
                break;
            case 'cm':
            default:
                displayValue = Math.round(heightInMM / 10);
                unitLabel = 'cm';
                break;
        }

        return { value: displayValue, unit: unitLabel };
    }

    // Calculate label position based on wall orientation and nearby objects
    calculateLabelPosition(group, wall) {
        const { x, y } = group.center;
        const baseOffset = 20; // Base offset from the wall
        
        // Determine wall orientation by checking its angle
        const wallAngle = Math.atan2(
            wall.end.y - wall.start.y,
            wall.end.x - wall.start.x
        );

        // Get object's side relative to the wall
        const side = group.objects[0].position.side;
        
        // Calculate perpendicular direction to the wall
        const perpendicularAngle = wallAngle + (side === 'right' ? -Math.PI/2 : Math.PI/2);

        // Find nearby objects at different heights
        const allObjects = [
            ...(this.store.state.sockets.sockets || []),
            ...(this.store.state.switches.switches || [])
        ];

        // Filter objects that are near this position
        const nearbyObjects = allObjects.filter(obj => {
            if (obj.wall !== wall.id) return false;
            
            // Calculate distance between centers
            const dx = obj.position.x - x;
            const dy = obj.position.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Consider objects within 15cm as nearby
            return distance < 15;
        });

        // Sort nearby objects by height
        const sortedObjects = nearbyObjects.sort((a, b) => 
            a.dimensions.floorHeight - b.dimensions.floorHeight
        );

        // Find position of current group in the sorted array
        const currentIndex = sortedObjects.findIndex(obj => 
            obj.dimensions.floorHeight === group.objects[0].dimensions.floorHeight
        );

        // Calculate additional offset based on position in stack
        const additionalOffset = currentIndex * 10; // Add 20cm for each object below

        // Calculate final offset position using perpendicular angle
        const totalOffset = baseOffset + additionalOffset;
        const offsetX = totalOffset * Math.cos(perpendicularAngle);
        const offsetY = totalOffset * Math.sin(perpendicularAngle);

        return {
            x: x + offsetX,
            y: y + offsetY,
            angle: wallAngle // Pass the wall angle to rotate the label
        };
    }

    // Draw rounded rectangle labels parallel to the wall
    drawRoundedLabel(ctx, x, y, text, textColor, angle = 0, socketCount = null, switchCount = null) {
        // Text measurements with smaller font
        ctx.font = '10px Arial';
        const metrics = ctx.measureText(text);
        const countText = socketCount || switchCount ? 
            `+${socketCount}${switchCount ? '+' + switchCount : ''}` : '';
        const countMetrics = countText ? ctx.measureText(countText) : { width: 0 };
        const padding = 4;
        const width = metrics.width + (countText ? countMetrics.width + padding * 2 : 0) + padding * 2;
        const height = 16; // Fixed small height
        const radius = 4; // Smaller border radius

        // Save the current context state
        ctx.save();
        
        // Translate to the label position and rotate
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Draw rounded rectangle centered at origin (0,0)
        ctx.beginPath();
        ctx.moveTo(-width/2 + radius, -height/2);
        ctx.lineTo(width/2 - radius, -height/2);
        ctx.arcTo(width/2, -height/2, width/2, -height/2 + radius, radius);
        ctx.lineTo(width/2, height/2 - radius);
        ctx.arcTo(width/2, height/2, width/2 - radius, height/2, radius);
        ctx.lineTo(-width/2 + radius, height/2);
        ctx.arcTo(-width/2, height/2, -width/2, height/2 - radius, radius);
        ctx.lineTo(-width/2, -height/2 + radius);
        ctx.arcTo(-width/2, -height/2, -width/2 + radius, -height/2, radius);
        ctx.closePath();

        // Fill and stroke
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 0.5; // Thinner border
        ctx.stroke();

        // Draw height text (always left-aligned)
        ctx.fillStyle = textColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, -width/2 + padding, 0);

        // Draw count text if provided (right-aligned)
        if (countText) {
            // Draw socket count in green
            if (socketCount > 0) {
                ctx.fillStyle = '#008000'; // Green for sockets
                ctx.textAlign = 'right';
                const rightEdge = width/2 - padding;
                const switchSpace = switchCount > 0 ? ctx.measureText(`+${switchCount}`).width + 2 : 0;
                ctx.fillText(`+${socketCount}`, rightEdge - switchSpace, 0);
            }

            // Draw switch count in red if there are switches
            if (switchCount > 0) {
                ctx.fillStyle = '#FF0000'; // Red for switches
                ctx.textAlign = 'right';
                ctx.fillText(`+${switchCount}`, width/2 - padding, 0);
            }
        }

        // Restore the context state
        ctx.restore();
    }

    // Draw height label for a group of objects
    drawHeightLabel(ctx, group) {
        // Save context state
        ctx.save();
        
        // Apply canvas transforms
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);

        // Find the wall this object is attached to
        const wall = this.store.state.walls.walls.find(w => w.id === group.objects[0].wall);
        
        if (!wall) {
            ctx.restore();
            return;
        }

        // Calculate label position based on wall orientation and nearby objects
        const labelPos = this.calculateLabelPosition(group, wall);
        
        // Get the height from the floor
        const heightFromFloor = group.objects[0].dimensions.floorHeight;
        
        // Convert height to display units but only show the number
        const { value: displayHeight } = this.convertToDisplayUnits(heightFromFloor, group.objects[0].type);
        const text = `H=${displayHeight}`;

        // Count sockets and switches separately
        const socketCount = group.objects.filter(obj => obj.type === 'socket').length;
        const switchCount = group.objects.filter(obj => obj.type === 'switch').length;

        // Draw rounded rectangle label with rotation and counts
        this.drawRoundedLabel(
            ctx, 
            labelPos.x, 
            labelPos.y, 
            text, 
            '#2196F3', 
            labelPos.angle,
            socketCount > 0 ? socketCount : null,
            switchCount > 0 ? switchCount : null
        );

        // Restore context state
        ctx.restore();
    }

    // Draw a single socket
    drawSocket(ctx, socket, wall) {
        const { x, y, rotation } = socket.position;

        // Save context state
        ctx.save();
        
        // Apply canvas transforms
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Set styles
        ctx.strokeStyle = '#008000'; // Green color
        ctx.lineWidth = 1;

        // Dimensions
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
        ctx.stroke();

        // Draw straight line from semicircle
        ctx.beginPath();
        ctx.moveTo(0, -radius);
        ctx.lineTo(0, -(radius + lineLength));
        ctx.stroke();

        // Restore context state
        ctx.restore();
    }

    // Draw a single wall light
    drawWallLight(ctx, light, wall, isHovered) {
        const { x, y, rotation, side } = light.position;

        // Save context state
        ctx.save();
        
        // Apply canvas transforms
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(x, y);
        ctx.rotate(rotation + Math.PI);

        // Set styles
        ctx.strokeStyle = '#008000'; // Green color
        ctx.lineWidth = isHovered ? 3 : 1.5; // Increased line width for better visibility

        // Draw concentric semicircles
        const middleRadius = 8; // Middle circle radius in cm
        const innerRadius = 4; // Smallest circle radius in cm

        // Determine the arc direction based on which side of the wall the light is placed
        const startAngle = side === 'right' ? 0 : Math.PI;
        const endAngle = side === 'right' ? Math.PI : 0;
        const counterclockwise = side === 'left';

        // Draw highlight if hovered
        if (isHovered) {
            ctx.fillStyle = 'rgba(0, 128, 0, 0.15)'; // Slightly more opaque
            ctx.beginPath();
            ctx.arc(0, 0, middleRadius + 3, startAngle, endAngle, counterclockwise);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fill();

            // Add glow effect
            ctx.shadowColor = 'rgba(0, 128, 0, 0.5)';
            ctx.shadowBlur = 5;
        }

        // Draw middle semicircle
        ctx.beginPath();
        ctx.arc(0, 0, middleRadius, startAngle, endAngle, counterclockwise);
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

        // Restore context state
        ctx.restore();
    }

    // Draw a single panel
    drawPanel(ctx, panel, wall) {
        const { x, y, rotation } = panel.position;

        // Save context state
        ctx.save();
        
        // Apply canvas transforms
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Get panel dimensions
        const width = panel.dimensions.width;
        const thickness = 8; // Fixed 8cm thickness
        const wallExtension = 14; // How far the panel extends from the wall
        
        // Calculate offset to position panel correctly relative to wall
        const offset = -(thickness - wallExtension) / 2;
        ctx.translate(0, offset);

        // Set styles
        ctx.strokeStyle = '#008000'; // Green color
        ctx.fillStyle = 'rgba(0, 128, 0, 0.1)'; // Light green fill
        ctx.lineWidth = 1;

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

        // Restore context state
        ctx.restore();
    }

    // Draw a single switch
    drawSwitch(ctx, switchObj, wall, isHovered) {
        const { x, y, rotation } = switchObj.position;

        // Save context state
        ctx.save();
        
        // Apply canvas transforms
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Set styles
        ctx.strokeStyle = '#FF0000'; // Red color
        ctx.lineWidth = isHovered ? 3 : 1.5; // Thicker line when hovered

        // Add glow effect when hovered
        if (isHovered) {
            ctx.shadowColor = 'rgba(255, 0, 0, 0.4)';
            ctx.shadowBlur = 4;
        }

        // Dimensions
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
        ctx.stroke();

        if (switchObj.type === 'single-switch') {
            // Calculate 80-degree angle points
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

            // Draw bent end line (extending only to the left of the angled line)
            ctx.beginPath();
            ctx.moveTo(stickEndX, stickEndY);
            ctx.lineTo(stickEndX + perpX, stickEndY + perpY);
            ctx.stroke();
        } else if (switchObj.type === 'double-switch') {
            // First line (similar to single switch)
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
            const angle2Degrees = 100; // More angled than the first
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

        // Restore context state
        ctx.restore();
    }
} 