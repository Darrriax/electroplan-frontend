// DoorManager.js - Handles door drawing and manipulation
import { formatMeasurement } from '../unitConversion';

export default class DoorManager {
    constructor(ctx, store) {
        this.ctx = ctx;
        this.store = store;
        this.doorPreview = null;
        this.doorMagnetWall = null;
        this.doorMagnetPoint = null;
    }

    updateDoorPreview(point, walls) {
        const doorConfig = this.store.state.doors.currentConfig;
        
        // Reset door preview state
        this.doorPreview = null;
        this.doorMagnetWall = null;
        this.doorMagnetPoint = null;

        // Find suitable walls for door placement
        for (const wall of walls) {
            const startConnections = this.findWallsConnectedToPoint(wall.start, walls);
            const endConnections = this.findWallsConnectedToPoint(wall.end, walls);
            const internalPoints = this.calculateInternalPoints(wall, startConnections, endConnections);
            
            if (!internalPoints) continue;

            const { internalStart, internalEnd } = internalPoints;
            const internalLength = Math.sqrt(
                Math.pow(internalEnd.x - internalStart.x, 2) + 
                Math.pow(internalEnd.y - internalStart.y, 2)
            );

            if (internalLength < doorConfig.width) continue;

            const magnetDistance = this.distanceToLine(point, wall.start, wall.end);
            if (magnetDistance < 20) {
                const projection = this.projectPointOnLine(point, wall.start, wall.end);
                
                const wallDx = wall.end.x - wall.start.x;
                const wallDy = wall.end.y - wall.start.y;
                const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);
                const wallUnitX = wallDx / wallLength;
                const wallUnitY = wallDy / wallLength;

                const doorCenter = {
                    x: projection.x - (doorConfig.width / 2) * wallUnitX,
                    y: projection.y - (doorConfig.width / 2) * wallUnitY
                };

                const centeredDistanceFromStart = Math.sqrt(
                    Math.pow(doorCenter.x - internalStart.x, 2) + 
                    Math.pow(doorCenter.y - internalStart.y, 2)
                );
                
                const distanceFromEnd = internalLength - (centeredDistanceFromStart + doorConfig.width);

                const minMargin = 10;
                if (centeredDistanceFromStart >= minMargin && distanceFromEnd >= minMargin) {
                    this.doorMagnetWall = wall;
                    this.doorMagnetPoint = doorCenter;
                    
                    const wallAngle = Math.atan2(wallDy, wallDx);

                    this.doorPreview = {
                        x: doorCenter.x,
                        y: doorCenter.y,
                        width: doorConfig.width,
                        thickness: wall.thickness,
                        angle: wallAngle,
                        wall: wall,
                        leftSegment: centeredDistanceFromStart,
                        rightSegment: distanceFromEnd,
                        internalStart,
                        internalEnd
                    };
                    break;
                }
            }
        }
    }

    drawDoorPreview() {
        if (!this.doorPreview) return;

        const { x, y, width, thickness, angle, wall, leftSegment, rightSegment } = this.doorPreview;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        // Draw door rectangle
        this.ctx.fillStyle = '#000000';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.rect(0, -thickness/2, width, thickness);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw opening arc
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#000000';
        
        const openAngle = this.store.state.doors.currentConfig.openAngle * (Math.PI / 180);
        if (this.store.state.doors.currentConfig.openDirection === 'left') {
            this.ctx.arc(0, 0, width, -Math.PI/2, -Math.PI/2 - openAngle, true);
        } else {
            this.ctx.arc(width, 0, width, -Math.PI/2, -Math.PI/2 + openAngle);
        }
        
        this.ctx.stroke();

        // Draw dimensions
        if (this.doorMagnetWall) {
            wall.hideDimension = true;
            this.drawDoorSegmentDimensions(leftSegment, rightSegment, width, thickness);
        }

        this.ctx.restore();
    }

    drawPlacedDoors(doors) {
        doors.forEach(door => {
            this.ctx.save();
            this.ctx.translate(door.x, door.y);
            this.ctx.rotate(door.angle);

            // Draw door rectangle
            this.ctx.fillStyle = '#000000';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;

            this.ctx.beginPath();
            this.ctx.rect(0, -door.thickness/2, door.width, door.thickness);
            this.ctx.fill();
            this.ctx.stroke();

            // Draw opening arc
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#000000';
            
            const openAngle = door.openAngle * (Math.PI / 180);
            if (door.openDirection === 'left') {
                this.ctx.arc(0, 0, door.width, -Math.PI/2, -Math.PI/2 - openAngle, true);
            } else {
                this.ctx.arc(door.width, 0, door.width, -Math.PI/2, -Math.PI/2 + openAngle);
            }
            
            this.ctx.stroke();

            this.ctx.restore();
        });
    }

    drawDoorSegmentDimensions(leftSegment, rightSegment, doorWidth, thickness) {
        const offset = thickness + 20;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#666';
        this.ctx.fillStyle = '#666';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Draw left segment
        if (leftSegment > 0) {
            const leftText = formatMeasurement(leftSegment * 10, this.store.state.project.unit);
            this.drawSegmentDimension(-leftSegment, 0, offset, leftText);
        }

        // Draw door width
        const doorText = formatMeasurement(doorWidth * 10, this.store.state.project.unit);
        this.drawSegmentDimension(0, doorWidth, offset, doorText);

        // Draw right segment
        if (rightSegment > 0) {
            const rightText = formatMeasurement(rightSegment * 10, this.store.state.project.unit);
            this.drawSegmentDimension(doorWidth, doorWidth + rightSegment, offset, rightText);
        }

        this.ctx.restore();
    }

    drawSegmentDimension(start, end, offset, text) {
        // Draw extension lines
        this.ctx.beginPath();
        this.ctx.moveTo(start, -offset);
        this.ctx.lineTo(end, -offset);
        this.ctx.stroke();

        // Draw text with background
        const textWidth = this.ctx.measureText(text).width;
        const midPoint = (start + end) / 2;
        
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(midPoint - textWidth/2 - 2, -offset - 8, textWidth + 4, 16);
        
        this.ctx.fillStyle = '#666';
        this.ctx.fillText(text, midPoint, -offset);
    }

    // Geometry helper methods
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
} 