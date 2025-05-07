// utils/canvas/WallManager.js
import { fabric } from 'fabric';
import { createWallPattern } from '../patternUtils';

export class WallManager {
    constructor(canvas, options) {
        this.canvas = canvas;
        this.getThickness = options.getThickness;
        this.store = options.store;
        this.snapManager = options.snapManager; // Add reference to snap manager
        this.previewRect = options.previewRect; // Add reference to preview rect
        this.roomManager = options.roomManager; // Add reference to room manager

        this.activeWall = null;
        this.dimensionLines = [];

        this.snapAngles = [0, 45, 90, 135, 180, 225, 270, 315];
        this.snapThreshold = 12;
    }

    startDrawing(startPoint) {
        // Check if we should snap the starting point
        let actualStartPoint = startPoint;

        if (this.snapManager) {
            const snapPoint = this.snapManager.findNearestSnapPoint(startPoint);
            if (snapPoint) {
                actualStartPoint = { x: snapPoint.x, y: snapPoint.y };
            }
        }

        const thickness = this.store.getters['walls/defaultThickness']
        this.activeWall = new fabric.Rect({
            left: actualStartPoint.x,
            top: actualStartPoint.y,
            width: 0,
            height: thickness / 10,
            fill: createWallPattern(),
            stroke: '#404040',
            strokeWidth: 2,
            originX: 'left',
            originY: 'center',
            angle: 0,
            selectable: false,
            hasControls: true,
            hasBorders: true
        });

        this.canvas.add(this.activeWall);
        return actualStartPoint; // Return the possibly snapped point
    }

    async finishDrawing() {
        if (this.activeWall?.width > 0) {
            const wallData = this.calculateWallData();
            await this.store.dispatch('walls/createWall', wallData);

            // Clear any snap indicators
            if (this.snapManager) {
                this.snapManager.clearSnapPointMarker();
            }

            // Update room detection after wall creation
            if (this.roomManager) {
                this.roomManager.updateRooms();
            }
        }
        this.activeWall = null;
    }

    /**
     * Оновлює координати, кут та вигляд активної стіни в процесі малювання.
     * Implements snapping to existing wall endpoints.
     */
    updateDrawing(currentPoint, startPoint) {
        if (!this.activeWall) return;

        const thickness = this.getThickness() / 10;
        let targetPoint = currentPoint;

        // Check for endpoint snapping for the current point
        if (this.snapManager) {
            const snapPoint = this.snapManager.findNearestSnapPoint(currentPoint);
            if (snapPoint) {
                targetPoint = { x: snapPoint.x, y: snapPoint.y };
                this.snapManager.showSnapPointMarker(snapPoint);
            } else {
                this.snapManager.clearSnapPointMarker();
            }
        }

        const dx = targetPoint.x - startPoint.x;
        const dy = targetPoint.y - startPoint.y;
        const length = Math.sqrt(dx*dx + dy*dy);

        // Calculate the adjusted angle with snapping
        const finalAngle = this.calculateAdjustedAngle(startPoint, targetPoint);

        this.activeWall.set({
            width: length,
            angle: finalAngle,
            left: startPoint.x,
            top: startPoint.y,
            height: thickness
        });

        // Recalculate the end point based on the adjusted angle
        const angleRad = finalAngle * Math.PI / 180;
        const realEnd = {
            x: startPoint.x + length * Math.cos(angleRad),
            y: startPoint.y + length * Math.sin(angleRad)
        };

        // Draw dimensions based on real coordinates
        this.drawDimension(startPoint, realEnd, length, thickness);
        this.canvas.requestRenderAll();

        return { startPoint, endPoint: realEnd }; // Return both points for reference
    }

    /**
     * Calculate wall data from the active wall object
     */
    calculateWallData() {
        const angleRad = this.activeWall.angle * Math.PI / 180;
        const startX = this.activeWall.left;
        const startY = this.activeWall.top;
        const width = this.activeWall.width;

        return {
            start: {
                x: startX,
                y: startY
            },
            end: {
                x: startX + width * Math.cos(angleRad),
                y: startY + width * Math.sin(angleRad)
            },
            thickness: this.activeWall.height * 10,
            height: this.store.state.walls.defaultHeight,
            length: width * 10 // Convert canvas units to real units (mm)
        };
    }

    /**
     * Calculate adjusted angle with snapping to common angles
     */
    calculateAdjustedAngle(startPoint, currentPoint) {
        const dx = currentPoint.x - startPoint.x;
        const dy = currentPoint.y - startPoint.y;
        let rawAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        rawAngle = ((rawAngle % 360) + 360) % 360;

        // If we have a side alignment from the start, prioritize that angle
        if (this.lastSnapAlignment && this.lastSnapAlignment.angle !== undefined) {
            const alignmentAngleDeg = this.lastSnapAlignment.angle * 180 / Math.PI;
            const angleDiff = Math.abs(rawAngle - alignmentAngleDeg);

            if (angleDiff <= this.snapThreshold || (360 - angleDiff) <= this.snapThreshold) {
                return alignmentAngleDeg;
            }
        }

        // Find the closest snap angle
        const closestAngle = this.snapAngles.reduce((prev, curr) => {
            const diffPrev = Math.min(Math.abs(rawAngle - prev), Math.abs(360 + rawAngle - prev));
            const diffCurr = Math.min(Math.abs(rawAngle - curr), Math.abs(360 + rawAngle - curr));
            return diffCurr < diffPrev ? curr : prev;
        }, this.snapAngles[0]);

        // Only snap if we're close enough to a snap angle
        const angleDiff = Math.min(
            Math.abs(rawAngle - closestAngle),
            Math.abs(360 + rawAngle - closestAngle)
        );

        return angleDiff <= this.snapThreshold ? closestAngle : rawAngle;
    }

    /**
     * Draw dimension lines between start and end points of the wall
     */
    drawDimension(start, end, length, thickness) {
        this.clearDimension();

        // Get real angle from active wall
        const angle = this.activeWall.angle * Math.PI / 180;
        const angleDeg = this.activeWall.angle;

        // Recalculate end point based on real angle
        const realEnd = {
            x: start.x + length * Math.cos(angle),
            y: start.y + length * Math.sin(angle)
        };

        const midX = (start.x + realEnd.x) / 2;
        const midY = (start.y + realEnd.y) / 2;

        const baseOffset = 10;
        const offset = thickness / 2 + baseOffset;
        const extra = 10;
        const offsets = [+offset, -offset];

        const isFlipped = angleDeg > 90 && angleDeg < 270;

        const all = [];

        for (const off of offsets) {
            const offsetX = Math.sin(angle) * off;
            const offsetY = -Math.cos(angle) * off;

            const perpX = Math.sin(angle) * extra;
            const perpY = -Math.cos(angle) * extra;

            // Dimension line
            const dimLine = new fabric.Line(
                [start.x + offsetX, start.y + offsetY, realEnd.x + offsetX, realEnd.y + offsetY],
                { stroke: '#000', strokeWidth: 1, selectable: false }
            );
            all.push(dimLine);

            // Perpendicular lines
            const perpStart = new fabric.Line(
                [
                    start.x + offsetX - perpX,
                    start.y + offsetY - perpY,
                    start.x + offsetX + perpX,
                    start.y + offsetY + perpY
                ],
                { stroke: '#000', strokeWidth: 1, selectable: false }
            );
            all.push(perpStart);

            const perpEnd = new fabric.Line(
                [
                    realEnd.x + offsetX - perpX,
                    realEnd.y + offsetY - perpY,
                    realEnd.x + offsetX + perpX,
                    realEnd.y + offsetY + perpY
                ],
                { stroke: '#000', strokeWidth: 1, selectable: false }
            );
            all.push(perpEnd);

            // Length text
            const text = new fabric.Text(`${Math.round(length*10)}`, {
                left: midX + offsetX,
                top: midY + offsetY,
                fontSize: 14,
                fill: '#000',
                angle: isFlipped ? angleDeg + 180 : angleDeg,
                originX: 'center',
                originY: 'center',
                selectable: false
            });
            all.push(text);
        }

        all.forEach(obj => this.canvas.add(obj));
        this.dimensionLines.push(...all);
    }

    /**
     * Clear current dimension lines
     */
    clearDimension() {
        this.dimensionLines.forEach(line => this.canvas.remove(line));
        this.dimensionLines = [];
    }

    /**
     * Update the thickness of the active wall
     */
    updateWallThickness(newThickness) {
        if (this.activeWall) {
            const newHeight = newThickness / 10;
            this.activeWall.set({
                height: newHeight
            });
            this.canvas.requestRenderAll();
        }
    }

    /**
     * Update all walls thickness
     */
    updateAllWallsThickness(newThickness) {
        // This method might be used to update all wall thicknesses if needed
        // After updating, trigger room detection
        if (this.roomManager) {
            this.roomManager.updateRooms();
        }
    }
}