// utils/canvas/WallManager.js
import { fabric } from 'fabric';
import { createWallPattern } from '../patternUtils';

export class WallManager {
    constructor(canvas, options) {
        this.canvas = canvas;
        this.getThickness = options.getThickness;
        this.snapManager = options.snapManager;
        this.previewRect = options.previewRect;
        this.store = options.store;

        this.activeWall = null;
        this.dimensionLines = [];
        this.currentSnapPoint = null;
        this.snapAngles = [0, 45, 90, 135, 180, 225, 270, 315];
        this.snapThreshold = 12;

        this.bindCanvasEvents();
    }

    bindCanvasEvents() {
        this.canvas.on('object:modified', this.handleWallModified.bind(this));
        this.canvas.on('object:moving', this.handleWallMoving.bind(this));
        this.canvas.on('object:scaling', this.handleWallScaling.bind(this));
    }

    handleWallModified(e) {
        const wall = e.target;
        this.updateStoreWall(wall);
    }

    handleWallMoving(e) {
        const wall = e.target;
        this.updatePreviewDuringMove(wall);
    }

    handleWallScaling(e) {
        const wall = e.target;
        this.updateWallDimensions(wall);
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
            this.linkWallToFabricObject(wallData.id);
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

    linkWallToFabricObject(wallId) {
        this.activeWall.set({ wallId });
        this.snapManager.registerWall(this.activeWall);
    }

    updateStoreWall(fabricWall) {
        const wallId = fabricWall.wallId;
        const wallData = this.calculateWallData();

        this.store.dispatch('walls/updateWallProperties', {
            id: wallId,
            properties: {
                start: wallData.start,
                end: wallData.end,
                thickness: wallData.thickness
            }
        });
    }

    updateWallDimensions(wall) {
        const newThickness = wall.height * 10;
        const newLength = wall.width;

        this.store.dispatch('walls/updateWallProperties', {
            id: wall.wallId,
            properties: {
                thickness: newThickness,
                length: newLength
            }
        });
    }

    deleteSelectedWalls() {
        const activeObjects = this.canvas.getActiveObjects();
        activeObjects.forEach(obj => {
            if (obj.wallId) {
                this.store.dispatch('walls/deleteWall', obj.wallId);
                this.canvas.remove(obj);
            }
        });
        this.canvas.discardActiveObject().requestRenderAll();
    }

    updateAllWallsThickness() {
        const thickness = this.store.getters['walls/defaultThickness']
        this.canvas.getObjects().forEach(obj => {
            if (obj.wallId) {
                obj.set({
                    height: thickness / 10,
                    top: obj.top - (thickness/10 - obj.height)/2
                })
            }
        })
        this.canvas.requestRenderAll()
    }

    updateAllWallsHeight(height) {
        this.store.dispatch('walls/updateAllWallHeight', height);
        this.canvas.requestRenderAll();
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
        this.currentSnapPoint = this.snapManager.findSnapPoint(currentPoint, thickness);

        let targetPoint = currentPoint;
        let angle = this.calculateAdjustedAngle(startPoint, targetPoint);

        if (this.currentSnapPoint) {
            const wall = this.findWallAtPoint(this.currentSnapPoint);
            angle = wall.angle + 90;

            const angleRad = angle * Math.PI / 180;
            targetPoint = {
                x: this.currentSnapPoint.x + (thickness / 2) * Math.cos(angleRad),
                y: this.currentSnapPoint.y + (thickness / 2) * Math.sin(angleRad)
            };

            if (this.previewRect) {
                this.previewRect.magnetToWall(wall, currentPoint);
            }
        }

        const dx = targetPoint.x - startPoint.x;
        const dy = targetPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        this.activeWall.set({
            width: length,
            angle: angle,
            left: startPoint.x,
            top: startPoint.y,
            height: thickness
        });

        if (this.currentSnapPoint) {
            this.snapManager.showSnapIndicator(this.currentSnapPoint);
            this.activeWall.set({ stroke: 'transparent' });
        } else {
            this.snapManager.hideSnapIndicator();
            this.activeWall.set({ stroke: '#404040' });
        }

        this.drawDimension(startPoint, targetPoint, length, thickness);
        this.canvas.requestRenderAll();
    }


    /**
     * Пошук стіни, до якої можна прив'язати точку.
     */
    findWallAtPoint(point) {
        return this.snapManager.walls.find(wall => {
            const points = this.snapManager.getSnapPoints(wall, this.getThickness() / 10);
            return points.some(p => Math.hypot(p.x - point.x, p.y - point.y) < 5);
        });
    }

    /**
     * Малює лінію розмірів між початковою та кінцевою точкою стіни.
     */
    drawDimension(start, end, length, thickness) {
        this.clearDimension();

        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const angleDeg = angle * 180 / Math.PI;
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        const baseOffset = 10;
        const offset = thickness / 2 + baseOffset;
        const extra = 10; // Виступ за розмірну лінію
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
                [start.x + offsetX, start.y + offsetY, end.x + offsetX, end.y + offsetY],
                { stroke: '#000', strokeWidth: 1, selectable: false }
            );
            all.push(dimLine);

            // Перпендикуляр зліва
            const perpStart = new fabric.Line(
                [
                    start.x + offsetX - perpX, start.y + offsetY - perpY,
                    start.x + offsetX + perpX, start.y + offsetY + perpY
                ],
                { stroke: '#000', strokeWidth: 1, selectable: false }
            );
            all.push(perpStart);

            // Перпендикуляр справа
            const perpEnd = new fabric.Line(
                [
                    end.x + offsetX - perpX, end.y + offsetY - perpY,
                    end.x + offsetX + perpX, end.y + offsetY + perpY
                ],
                { stroke: '#000', strokeWidth: 1, selectable: false }
            );
            all.push(perpEnd);

            // Текст довжини
            const text = new fabric.Text(`${length.toFixed(0)}`, {
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