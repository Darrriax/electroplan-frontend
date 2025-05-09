// utils/entities/PreviewRect.js
export class PreviewRect {
    constructor(size, fillColor = 'rgba(100, 100, 255, 0.5)', hatchPattern = null) {
        this.x = 0;            // Позиція X центру прямокутника
        this.y = 0;            // Позиція Y центру прямокутника
        this.width = size;     // Ширина прямокутника
        this.height = size;    // Висота прямокутника
        this.fillColor = fillColor;  // Колір заливки
        this.visible = false;  // Видимість
        this.hatchPattern = hatchPattern;  // Об'єкт заштриховки
    }

    // Оновлення позиції прямокутника
    updatePosition(x, y, cellSize) {
        // Прив'язка до сітки
        this.x = Math.round(x / cellSize) * cellSize;
        this.y = Math.round(y / cellSize) * cellSize;

        // Оновлюємо область підсвічування у хетч-патерні, якщо він є
        if (this.hatchPattern && this.visible) {
            const halfWidth = this.width / 2;
            const halfHeight = this.height / 2;

            this.hatchPattern.setHighlightArea(
                this.x - halfWidth,
                this.y - halfHeight,
                this.width,
                this.height
            );
        }
    }

    // Малювання прямокутника
    draw(ctx, pixelsPerCm) {
        if (!this.visible) return;

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        // Малюємо заливку прямокутника
        ctx.fillStyle = this.fillColor;
        ctx.fillRect(
            this.x - halfWidth,
            this.y - halfHeight,
            this.width,
            this.height
        );

        // Малюємо контур прямокутника
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            this.x - halfWidth,
            this.y - halfHeight,
            this.width,
            this.height
        );

        // Малюємо заштриховку, якщо вона є
        if (this.hatchPattern && this.visible) {
            // Отримуємо розміри канвасу для правильного відображення заштриховки
            const canvasWidth = ctx.canvas.width * 2;
            const canvasHeight = ctx.canvas.height * 2;

            // Малюємо підсвічену область (PreviewRect)
            this.hatchPattern.drawHighlight(ctx, canvasWidth, canvasHeight);
        }
    }

    // Відображення прямокутника
    show() {
        this.visible = true;
        if (this.hatchPattern) {
            this.hatchPattern.setVisibility(true);
        }
    }

    // Приховування прямокутника
    hide() {
        this.visible = false;
        if (this.hatchPattern) {
            this.hatchPattern.clearHighlightArea();
        }
    }
}