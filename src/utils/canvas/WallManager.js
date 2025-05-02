// utils/canvas/WallManager.js
import { fabric } from 'fabric';
import { createWallPattern } from '../patternUtils';
import {WallEdges} from "./WallEdges.js";

export class WallManager {
    constructor(canvas, options) {
        this.canvas = canvas;
        this.getThickness = options.getThickness;
        this.snapManager = options.snapManager;
        this.previewRect = options.previewRect;
        this.store = options.store;

        this.activeWall = null;
        this.dimensionLines = [];
        this.snapAngles = [0, 45, 90, 135, 180, 225, 270, 315];
        this.snapThreshold = 12;
    }

    startDrawing(startPoint) {
        const thickness = this.store.getters['walls/defaultThickness']
        this.activeWall = new fabric.Rect({
            left: startPoint.x,
            top: startPoint.y,
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
    }

    async finishDrawing() {
        if (this.activeWall?.width > 0) {
            const wallData = this.calculateWallData();
            await this.store.dispatch('walls/createWall', wallData);
        }
        this.activeWall = null;
    }

    calculateWallData() {
        const angleRad = this.activeWall.angle * Math.PI / 180;
        return {
            start: {
                x: this.activeWall.left,
                y: this.activeWall.top
            },
            end: {
                x: this.activeWall.left + this.activeWall.width * Math.cos(angleRad),
                y: this.activeWall.top + this.activeWall.width * Math.sin(angleRad)
            },
            thickness: this.activeWall.height * 10,
            height: this.store.state.walls.defaultHeight
        };
    }

    updateAllWallsThickness() {
        const thickness = this.store.getters['walls/defaultThickness']
        this.canvas.getObjects().forEach(obj => {
            if (obj.wallId) {
                obj.set({
                    height: thickness / 10,
                    top: obj.top - (thickness / 10 - obj.height) / 2
                })
            }
        })
        this.canvas.requestRenderAll()
    }

    /**
     * Розраховує кут з урахуванням прив’язки до найближчих кутів.
     */
    calculateAdjustedAngle(startPoint, currentPoint) {
        const dx = currentPoint.x - startPoint.x;
        const dy = currentPoint.y - startPoint.y;
        let rawAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        rawAngle = ((rawAngle % 360) + 360) % 360;

        const closestAngle = this.snapAngles.reduce((prev, curr) => {
            const diffPrev = Math.abs(rawAngle - prev);
            const diffCurr = Math.abs(rawAngle - curr);
            return diffCurr < diffPrev ? curr : prev;
        });

        const angleDiff = Math.abs(rawAngle - closestAngle);
        return angleDiff <= this.snapThreshold || (360 - angleDiff) <= this.snapThreshold
            ? closestAngle
            : rawAngle;
    }

    /**
     * Оновлює координати, кут та вигляд активної стіни в процесі малювання.
     */
    updateDrawing(currentPoint, startPoint) {
        const thickness = this.getThickness() / 10;
        let targetPoint = currentPoint;

        const dx = targetPoint.x - startPoint.x;
        const dy = targetPoint.y - startPoint.y;
        const length = Math.sqrt(dx*dx + dy*dy);

        // Зберігаємо реальний кут перед оновленням
        const finalAngle = this.calculateAdjustedAngle(startPoint, targetPoint);

        this.activeWall.set({
            width: length,
            angle: finalAngle,
            left: startPoint.x,
            top: startPoint.y,
            height: thickness
        });

        // Перераховуємо кінцеву точку на основі реального кута
        const angleRad = finalAngle * Math.PI / 180;
        const realEnd = {
            x: startPoint.x + length * Math.cos(angleRad),
            y: startPoint.y + length * Math.sin(angleRad)
        };

        // Малюємо розміри на основі реальних координат
        this.drawDimension(startPoint, realEnd, length, thickness);
        this.canvas.requestRenderAll();
    }

    /**
     * Малює лінію розмірів між початковою та кінцевою точкою стіни.
     */
    drawDimension(start, end, length, thickness) {
        this.clearDimension();

        // Отримуємо реальний кут з активної стіни
        const angle = this.activeWall.angle * Math.PI / 180;
        const angleDeg = this.activeWall.angle;

        // Перераховуємо кінцеву точку на основі реального кута
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

            // Лінія розміру
            const dimLine = new fabric.Line(
                [start.x + offsetX, start.y + offsetY, realEnd.x + offsetX, realEnd.y + offsetY],
                { stroke: '#000', strokeWidth: 1, selectable: false }
            );
            all.push(dimLine);

            // Перпендикуляри
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

            // Текст довжини
            const text = new fabric.Text(`${Math.round(length)}`, {
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
     * Очищує поточні лінії розмірів.
     */
    clearDimension() {
        this.dimensionLines.forEach(line => this.canvas.remove(line));
        this.dimensionLines = [];
    }

    /**
     * Оновлює товщину активної стіни.
     */
    updateWallThickness(newThickness) {
        if (this.activeWall) {
            const newHeight = newThickness / 10;
            this.activeWall.set({
                height: newHeight,
                top: this.activeWall.top - (newHeight - this.activeWall.height) / 2
            });
            this.canvas.requestRenderAll();
        }
    }
}