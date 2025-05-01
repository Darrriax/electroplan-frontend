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
}
