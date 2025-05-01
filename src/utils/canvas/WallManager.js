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
        this.wallEdges = new WallEdges(canvas);

        this.activeWall = null;
        this.dimensionLines = [];
        this.currentSnapPoint = null;
        this.snapAngles = [0, 45, 90, 135, 180, 225, 270, 315];
        this.snapThreshold = 12;

        this.bindCanvasEvents();
    }

    showWallEdges(wall) {
        this.wallEdges.clearEdges();
        this.wallEdges.createEdges({
            start: wall.start,
            end: wall.end,
            thickness: wall.thickness
        });
    }

    handleWallHover(mousePoint) {
        const nearestWall = this.findNearestWall(mousePoint);
        if (nearestWall) {
            this.showWallEdges(nearestWall);
            this.currentHoveredWall = nearestWall;
        } else {
            this.wallEdges.clearEdges();
            this.currentHoveredWall = null;
        }
    }

    findNearestWall(point, threshold = 15) {
        const walls = this.store.getters['walls/allWalls'];
        let nearest = { wall: null, distance: Infinity };

        walls.forEach(wall => {
            const distance = this.calculateDistanceToWall(point, wall);
            if (distance < threshold && distance < nearest.distance) {
                nearest = { wall, distance };
            }
        });

        return nearest.wall;
    }

    calculateDistanceToWall(point, wall) {
        const start = wall.start;
        const end = wall.end;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSq = dx*dx + dy*dy;

        if (lengthSq === 0) return Math.hypot(point.x - start.x, point.y - start.y);

        const t = ((point.x - start.x)*dx + (point.y - start.y)*dy) / lengthSq;
        const tClamped = Math.max(0, Math.min(1, t));

        const projection = {
            x: start.x + tClamped*dx,
            y: start.y + tClamped*dy
        };

        return Math.hypot(point.x - projection.x, point.y - projection.y);
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

        const nearestWall = this.findNearestWall(currentPoint);
        if (nearestWall) {
            targetPoint = this.calculateSnapPoint(currentPoint, nearestWall);
            this.previewRect.magnetToWall(nearestWall, currentPoint);
        }
        if (this.currentSnapPoint) {
            const wall = this.findWallAtPoint(this.currentSnapPoint);
            angle = wall.angle + 90;

            const angleRad = angle * Math.PI / 180;
            targetPoint = {
                x: this.currentSnapPoint.x + (thickness / 2) * Math.cos(angleRad),
                y: this.currentSnapPoint.y + (thickness / 2) * Math.sin(angleRad)
            };
        }

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

        if (this.currentSnapPoint) {
            this.snapManager.showSnapIndicator(this.currentSnapPoint);
            this.activeWall.set({ stroke: 'transparent' });
        } else {
            this.snapManager.hideSnapIndicator();
            this.activeWall.set({ stroke: '#404040' });
        }

        // Малюємо розміри на основі реальних координат
        this.drawDimension(startPoint, realEnd, length, thickness);
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

    calculateSnapPoint(currentPoint, wall) {
        const angleRad = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
        const normal = {
            x: -Math.sin(angleRad),
            y: Math.cos(angleRad)
        };

        // Вектор від стіни до курсора
        const toCursor = {
            x: currentPoint.x - wall.start.x,
            y: currentPoint.y - wall.start.y
        };

        // Визначаємо сторону
        const dot = toCursor.x * normal.x + toCursor.y * normal.y;
        const side = dot > 0 ? 1 : -1;

        // Зміщення з урахуванням товщин
        const totalOffset = (wall.thickness/10 + this.getThickness()/10)/2;

        // Проекція на стіну
        const t = ((currentPoint.x - wall.start.x)*(wall.end.x - wall.start.x) +
            ((currentPoint.y - wall.start.y)*(wall.end.y - wall.start.y)) /
            Math.pow(wallLength, 2))

        const tClamped = Math.max(0, Math.min(1, t));

        return {
            x: wall.start.x + tClamped*(wall.end.x - wall.start.x) + normal.x*totalOffset*side,
            y: wall.start.y + tClamped*(wall.end.y - wall.start.y) + normal.y*totalOffset*side
        };
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