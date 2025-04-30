export class PreviewRect {
    constructor(canvas, options) {
        this.canvas = canvas;
        this.rect = new fabric.Rect({
            width: options.initialSize,
            height: options.initialSize,
            fill: options.pattern,
            stroke: '#404040',
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
            hasControls: false,
            hasBorders: false,
            hoverCursor: 'crosshair',
            opacity: 0.8,
            visible: false
        });
        this.canvas.add(this.rect);
    }

    /**
     * Оновлює позицію прямокутника на полотні.
     * @param {number} x - Координата X.
     * @param {number} y - Координата Y.
     */
    updatePosition(x, y) {
        this.rect.set({ left: x, top: y });
        this.canvas.requestRenderAll();
    }

    /**
     * Вмикає або вимикає видимість прямокутника.
     * @param {boolean} visible - Чи має бути прямокутник видимим.
     */
    setVisible(visible) {
        this.rect.visible = visible;
        this.canvas.requestRenderAll();
    }

    /**
     * Оновлює розмір прямокутника.
     * @param {number} size - Нова ширина і висота прямокутника.
     */
    updateSize(size) {
        this.rect.set({ width: size, height: size });
        this.canvas.requestRenderAll();
    }

    /**
     * Примагнічує прямокутник до стіни згідно з напрямком та товщиною.
     * Визначає, з якого боку курсор — і зміщує прямокутник відповідно.
     * @param {Object} wall - Об'єкт стіни з параметрами: left, top, width, height, angle.
     * @param {Object} cursorPoint - Точка курсора {x, y}.
     */
    magnetToWall(wall, cursorPoint) {
        if (!wall) return;

        const angleRad = wall.angle * Math.PI / 180;
        const thickness = wall.height;
        const width = wall.width;

        const wallStart = { x: wall.left, y: wall.top };
        const wallEnd = {
            x: wall.left + width * Math.cos(angleRad),
            y: wall.top + width * Math.sin(angleRad)
        };

        const vectorToCursor = {
            x: cursorPoint.x - wallStart.x,
            y: cursorPoint.y - wallStart.y
        };

        const normal = {
            x: -Math.sin(angleRad),
            y: Math.cos(angleRad)
        };

        const side = vectorToCursor.x * normal.x + vectorToCursor.y * normal.y;
        const offset = (thickness / 2) + 1;

        const attachX = wallEnd.x + normal.x * offset * Math.sign(side);
        const attachY = wallEnd.y + normal.y * offset * Math.sign(side);

        this.rect.set({
            left: attachX,
            top: attachY,
            angle: wall.angle
        });

        this.canvas.requestRenderAll();
    }
}
