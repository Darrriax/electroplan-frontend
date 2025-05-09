// src/utils/entities/WallDimensions.js
export class WallDimensions {
    constructor(wall, pixelsPerCm, unitType = 'cm') {
        this.wall = wall;
        this.pixelsPerCm = pixelsPerCm;
        this.unitType = unitType;
        this.fontSize = 12;
        this.offset = 25;  // Відступ від стіни до розмірної лінії (в пікселях)
        this.arrowSize = 5;  // Розмір стрілок на розмірних лініях
    }

    // Форматування розміру для відображення
    formatDimension(pixels) {
        const valueInCm = pixels / this.pixelsPerCm;

        if (this.unitType === 'cm') {
            return `${Math.round(valueInCm)} см`;
        } else if (this.unitType === 'm') {
            return `${(valueInCm / 100).toFixed(2)} м`;
        }

        return `${Math.round(valueInCm)} см`;
    }

    // Малювання розмірних ліній та значень для стіни
    draw(ctx) {
        ctx.save();

        // Якщо є кут нахилу, повертаємо контекст канвасу
        if (this.wall.angle !== 0) {
            ctx.translate(this.wall.x + this.wall.width / 2, this.wall.y + this.wall.height / 2);
            ctx.rotate(this.wall.angle);
            ctx.translate(-(this.wall.x + this.wall.width / 2), -(this.wall.y + this.wall.height / 2));
        }

        // Налаштування стилю для розмірних ліній
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#000';
        ctx.lineWidth = 1;
        ctx.font = `${this.fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Ширина (верхня лінія)
        this.drawDimensionLine(
            ctx,
            this.wall.x, this.wall.y - this.offset,
            this.wall.x + this.wall.width, this.wall.y - this.offset,
            this.formatDimension(this.wall.width)
        );

        // Висота (права лінія)
        this.drawDimensionLine(
            ctx,
            this.wall.x + this.wall.width + this.offset, this.wall.y,
            this.wall.x + this.wall.width + this.offset, this.wall.y + this.wall.height,
            this.formatDimension(this.wall.height)
        );

        ctx.restore();
    }

    // Малювання розмірної лінії зі стрілками та значенням
    drawDimensionLine(ctx, x1, y1, x2, y2, text) {
        // Малюємо лінію
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Малюємо стрілки на кінцях
        this.drawArrow(ctx, x1, y1, x2, y2);
        this.drawArrow(ctx, x2, y2, x1, y1);

        // Малюємо розмірне значення
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;

        // Малий прямокутник під текстом для кращої видимості
        const textWidth = ctx.measureText(text).width + 10;
        const textHeight = this.fontSize + 6;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(centerX - textWidth / 2, centerY - textHeight / 2, textWidth, textHeight);

        ctx.fillStyle = '#000';
        ctx.fillText(text, centerX, centerY);
    }

    // Малювання стрілки
    drawArrow(ctx, fromX, fromY, toX, toY) {
        const angle = Math.atan2(toY - fromY, toX - fromX);

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(
            fromX - this.arrowSize * Math.cos(angle - Math.PI / 6),
            fromY - this.arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            fromX - this.arrowSize * Math.cos(angle + Math.PI / 6),
            fromY - this.arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    }

    // Оновлення розмірів при зміні стіни
    updateDimensions() {
        // Оновлення внутрішніх даних
        this.pixelsPerCm = this.pixelsPerCm;
    }
}