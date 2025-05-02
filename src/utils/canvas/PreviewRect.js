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
     * Повертає координати 4-х кутів прямокутника.
     * Порядок: верх-ліво, верх-право, низ-право, низ-ліво
     */
    getCorners() {
        const left = this.rect.left;
        const top = this.rect.top;
        const width = this.rect.width * this.rect.scaleX;
        const height = this.rect.height * this.rect.scaleY;

        const halfW = width / 2;
        const halfH = height / 2;

        return [
            { x: left - halfW, y: top - halfH }, // top-left
            { x: left + halfW, y: top - halfH }, // top-right
            { x: left + halfW, y: top + halfH }, // bottom-right
            { x: left - halfW, y: top + halfH }  // bottom-left
        ];
    }
    getEdges() {
        const corners = this.getCorners();
        return [
            { start: corners[0], end: corners[1] }, // Верхня сторона
            { start: corners[1], end: corners[2] }, // Права сторона
            { start: corners[2], end: corners[3] }, // Нижня сторона
            { start: corners[3], end: corners[0] }, // Ліва сторона
        ];
    }
}
