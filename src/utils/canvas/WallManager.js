import { fabric } from 'fabric';
import { createWallPattern } from '../patternUtils';

export class WallManager {
    constructor(canvas, options) {
        this.canvas = canvas;
        this.getThickness = options.getThickness;
        this.store = options.store;
        this.activeWall = null;
    }

    startDrawing(startPoint) {
        const thickness = this.store.getters['walls/defaultThickness'];
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
            selectable: false
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
            start: { x: this.activeWall.left, y: this.activeWall.top },
            end: {
                x: this.activeWall.left + this.activeWall.width * Math.cos(angleRad),
                y: this.activeWall.top + this.activeWall.width * Math.sin(angleRad)
            },
            thickness: this.activeWall.height * 10,
            height: this.store.state.walls.defaultHeight
        };
    }

    updateDrawing(currentPoint, startPoint) {
        const dx = currentPoint.x - startPoint.x;
        const dy = currentPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        this.activeWall.set({
            width: length,
            angle: angle,
            left: startPoint.x,
            top: startPoint.y
        });
        this.canvas.requestRenderAll();
    }
}