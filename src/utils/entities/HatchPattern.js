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

    // Малювання загальної заштриховки та підсвіченої області
    draw(ctx, width, height, startX = 0, startY = 0) {
        if (!ctx || !this.visible) return;

        ctx.save();

        // Якщо є область підсвічування (від PreviewRect)
        if (this.highlightArea) {
            const { x, y, width, height } = this.highlightArea;

            // Зберігаємо поточний стан контексту для кліпінгу
            ctx.save();

            // Обмежуємо область малювання прямокутником виділення
            ctx.beginPath();
            ctx.rect(x, y, width, height);
            ctx.clip();

            // Малюємо заштриховку тільки в області виділення з більшою непрозорістю
            ctx.globalAlpha = 0.4;
            this._drawPattern(ctx, width * 3, height * 3, x - width, y - height, 1);

            // Відновлюємо стан контексту після кліпінгу
            ctx.restore();
        }

        ctx.restore();
    }

    // Допоміжний метод для малювання самої заштриховки
    _drawPattern(ctx, width, height, startX, startY, alpha) {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this.lineColor;
        ctx.lineWidth = this.lineWidth;

        const endX = startX + width;
        const endY = startY + height;

        ctx.beginPath();

        // Лінії знизу зліва → догори вправо (↗)
        for (let x = startX - height; x < endX; x += this.spacing) {
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