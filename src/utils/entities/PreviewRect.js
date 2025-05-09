// utils/entities/PreviewRect.js
export class PreviewRect {
    constructor(thickness, color = 'rgba(100, 100, 255, 0.5)', hatchPattern = null) {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.thickness = thickness;
        this.color = color;
        this.visible = false;
        this.hatchPattern = hatchPattern; // Посилання на екземпляр HatchPattern
    }

    // Оновлення позиції прямокутника з прив'язкою до сітки
    updatePosition(x, y, gridSize) {
        // Прив'язка до сітки
        this.x = Math.round(x / gridSize) * gridSize;
        this.y = Math.round(y / gridSize) * gridSize;

        // Оновлюємо область підсвічування у HatchPattern, якщо він доступний
        if (this.visible && this.hatchPattern) {
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

    // Малювання прямокутника на канвасі
    draw(ctx, pixelsPerCm) {
        if (!this.visible) return;

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        // Спочатку малюємо заштриховку, якщо вона є
        if (this.hatchPattern) {
            // Заштриховка малюється через HatchPattern.draw()
            // Область підсвічування вже встановлена в updatePosition
        }

        // Потім малюємо контур прямокутника
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;

        // Малюємо контур прямокутника з центром у точці (x, y)
        ctx.strokeRect(
            this.x - halfWidth,
            this.y - halfHeight,
            this.width,
            this.height
        );

        ctx.restore();
    }

    // Показати PreviewRect
    show() {
        this.visible = true;
        // Активуємо видимість заштриховки
        if (this.hatchPattern) {
            this.hatchPattern.setVisibility(true);

            // Також оновлюємо область підсвічування у HatchPattern
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

    // Приховати PreviewRect
    hide() {
        this.visible = false;
        // Приховуємо заштриховку та очищаємо підсвічену область
        if (this.hatchPattern) {
            this.hatchPattern.clearHighlightArea();
            this.hatchPattern.setVisibility(false);
        }
    }
}