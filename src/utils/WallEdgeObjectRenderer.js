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

        // Draw each socket
        sockets.forEach(socket => {
            const wall = walls.find(w => w.id === socket.wall);
            if (wall) {
                this.drawSocket(ctx, socket, wall);
            }
        });

        // Draw each switch
        switches.forEach(switchObj => {
            const wall = walls.find(w => w.id === switchObj.wall);
            if (wall) {
                this.drawSwitch(ctx, switchObj, wall);
            }
        });

        // Draw each panel
        panels.forEach(panel => {
            const wall = walls.find(w => w.id === panel.wall);
            if (wall) {
                this.drawPanel(ctx, panel, wall);
            }
        });

        // Draw each wall light
        wallLights.forEach(light => {
            const wall = walls.find(w => w.id === light.wall);
            if (wall) {
                this.drawWallLight(ctx, light, wall);
            }
        });
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
    drawWallLight(ctx, light, wall) {
        const { x, y, rotation, side } = light.position;

        // Save context state
        ctx.save();
        
        // Apply canvas transforms
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Set styles - change to green
        ctx.strokeStyle = '#008000'; // Green color
        ctx.lineWidth = 1;

        // Draw concentric semicircles
        const middleRadius = 8; // Middle circle radius in cm
        const innerRadius = 4; // Smallest circle radius in cm

        // Determine the arc direction based on which side of the wall the light is placed
        // If side is 'right', draw semicircles facing right (0 to PI)
        // If side is 'left', draw semicircles facing left (PI to 0)
        const startAngle = side === 'right' ? 0 : Math.PI;
        const endAngle = side === 'right' ? Math.PI : 0;
        const counterclockwise = side === 'left';

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
    drawSwitch(ctx, switchObj, wall) {
        const { x, y, rotation, side } = switchObj.position;
        const floorHeight = switchObj.dimensions.floorHeight || 900; // Default 90cm from floor

        // Save context state
        ctx.save();
        
        // Apply canvas transforms
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Set styles
        ctx.strokeStyle = '#FF0000'; // Red color
        ctx.lineWidth = 1; // Standard line width

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