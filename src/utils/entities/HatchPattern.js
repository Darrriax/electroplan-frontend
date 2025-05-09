// utils/entities/HatchPattern.js
export class HatchPattern {
    constructor(lineColor = '#888888', lineWidth = 1, spacing = 10, opacity = 0.1) {
        this.lineColor = lineColor;      // Колір ліній заштриховки
        this.lineWidth = lineWidth;      // Товщина ліній
        this.spacing = spacing;          // Відстань між лініями заштриховки
        this.opacity = opacity;          // Загальна непрозорість заштриховки
        this.visible = false;            // Видимість заштриховки
        this.highlightArea = null;       // Область, яка буде підсвічена (використовується в PreviewRect)
    }

    // Малювання заштриховки
    draw(ctx, width, height, startX = 0, startY = 0) {
        if (!ctx || !this.visible) return;

        // Зауважте: ми не малюємо тут нічого напряму
        // Заштриховка буде малюватися тільки в обмежених областях (стіни і previewRect)
        // Основний патерн намальований так, щоб здаватися однорідним по всьому полотну
    }

    // Метод для малювання заштриховки в конкретній області (зазвичай в стінах)
    drawInArea(ctx, area, canvasWidth, canvasHeight) {
        if (!ctx || !this.visible) return;

        ctx.save();

        // Встановлюємо прозорість
        ctx.globalAlpha = this.opacity;

        // Малюємо патерн на всій видимій області, але він буде видимий тільки через clip()
        this._drawPattern(ctx, canvasWidth, canvasHeight, -canvasWidth/2, -canvasHeight/2);

        ctx.restore();
    }

    // Малювання підсвіченої області (для PreviewRect)
    drawHighlight(ctx, canvasWidth, canvasHeight) {
        if (!ctx || !this.visible || !this.highlightArea) return;

        ctx.save();

        // Створюємо кліп для області підсвічування
        ctx.beginPath();
        ctx.rect(
            this.highlightArea.x,
            this.highlightArea.y,
            this.highlightArea.width,
            this.highlightArea.height
        );
        ctx.clip();

        // Підвищена непрозорість для виділення
        ctx.globalAlpha = 0.4;

        // Малюємо патерн на всій видимій області
        this._drawPattern(ctx, canvasWidth, canvasHeight, -canvasWidth/2, -canvasHeight/2);

        ctx.restore();
    }

    // Допоміжний метод для малювання самої заштриховки
    _drawPattern(ctx, width, height, startX, startY) {
        ctx.strokeStyle = this.lineColor;
        ctx.lineWidth = this.lineWidth;

        const endX = startX + width;
        const endY = startY + height;

        ctx.beginPath();

        // Лінії знизу зліва → догори вправо (↗)
        for (let x = startX - height; x < endX + height; x += this.spacing) {
            ctx.moveTo(x, endY);
            ctx.lineTo(x + height, startY);
        }

        ctx.stroke();
    }

    // Метод для встановлення області підсвічування (викликається з PreviewRect)
    setHighlightArea(x, y, width, height) {
        this.highlightArea = { x, y, width, height };
    }

    // Метод для очищення області підсвічування
    clearHighlightArea() {
        this.highlightArea = null;
    }

    // Метод для зміни видимості заштриховки
    setVisibility(isVisible) {
        this.visible = isVisible;
    }
}