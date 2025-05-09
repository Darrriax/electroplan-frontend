// src/utils/entities/PreviewRect.js
export class PreviewRect {
    constructor(thickness = 10, color = 'rgba(100, 100, 255, 0.5)') {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.thickness = thickness;  // Товщина стіни (в см)
        this.color = color;
        this.angle = 0;              // Кут нахилу (в радіанах)
        this.visible = false;
        this.magnetized = false;     // Чи примагнічений до стіни
        this.magnetizedTo = null;    // Об'єкт стіни, до якої примагнічений
        this.magnetizedEdge = null;  // Сторона примагнічування ('top', 'right', 'bottom', 'left')
    }

    // Оновлення розташування на основі позиції миші
    updatePosition(mouseX, mouseY, cellSize) {
        if (this.magnetized) return;

        // Прив'язка до сітки
        this.x = Math.floor(mouseX / cellSize) * cellSize;
        this.y = Math.floor(mouseY / cellSize) * cellSize;
    }

    // Малювання PreviewRect на канвасі
    draw(ctx, pixelsPerCm) {
        if (!this.visible) return;

        ctx.save();

        // Якщо є кут нахилу, повертаємо контекст канвасу
        if (this.angle !== 0) {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.translate(-this.x, -this.y);
        }

        // Малюємо прямокутник
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Малюємо діагональну заштриховку всередині
        this.drawPattern(ctx);

        // Малюємо рамку
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        ctx.restore();
    }

    // Малювання діагональної заштриховки всередині PreviewRect
    drawPattern(ctx) {
        const spacing = 10;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;

        for (let i = -this.height; i < this.width + this.height; i += spacing) {
            ctx.beginPath();
            ctx.moveTo(this.x + i, this.y);
            ctx.lineTo(this.x + i + this.height, this.y + this.height);
            if (i + this.height > this.width) {
                // Обрізаємо лінії, які виходять за межі прямокутника
                const dy = this.width - i;
                ctx.lineTo(this.x + this.width, this.y + dy);
            }
            ctx.stroke();
        }
    }

    // Магнітування до стіни
    magnetizeTo(wall, edge, pixelsPerCm) {
        this.magnetized = true;
        this.magnetizedTo = wall;
        this.magnetizedEdge = edge;

        // Встановлюємо той самий кут, що і у стіни
        this.angle = wall.angle;

        // Розташовуємо PreviewRect відповідно до примагнічування
        switch (edge) {
            case 'top':
                this.x = wall.x;
                this.y = wall.y - this.thickness * pixelsPerCm;
                this.width = wall.width;
                this.height = this.thickness * pixelsPerCm;
                break;
            case 'right':
                this.x = wall.x + wall.width;
                this.y = wall.y;
                this.width = this.thickness * pixelsPerCm;
                this.height = wall.height;
                break;
            case 'bottom':
                this.x = wall.x;
                this.y = wall.y + wall.height;
                this.width = wall.width;
                this.height = this.thickness * pixelsPerCm;
                break;
            case 'left':
                this.x = wall.x - this.thickness * pixelsPerCm;
                this.y = wall.y;
                this.width = this.thickness * pixelsPerCm;
                this.height = wall.height;
                break;
        }
    }

    // Скасування магнітування
    resetMagnetization() {
        this.magnetized = false;
        this.magnetizedTo = null;
        this.magnetizedEdge = null;
        this.angle = 0;
    }
}