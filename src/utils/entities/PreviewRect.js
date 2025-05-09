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
        this.angle = 0;        // Кут повороту в радіанах
        this.isMagnetized = false; // Флаг примагнічування
    }

    // Оновлення позиції прямокутника
    updatePosition(x, y, cellSize) {
        if (!this.isMagnetized) {
            // Прив'язка до сітки якщо не примагнічений
            this.x = Math.round(x / cellSize) * cellSize;
            this.y = Math.round(y / cellSize) * cellSize;
            this.angle = 0; // Обнуляємо кут, якщо не примагнічений
        }

        // Оновлюємо область підсвічування у хетч-патерні, якщо він є
        this._updateHatchPattern();
    }

    // Встановлення позиції з магнітизацією
    setMagnetizedPosition(x, y, angle = 0) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.isMagnetized = true;

        // Оновлюємо область підсвічування у хетч-патерні
        this._updateHatchPattern();
    }

    // Скидання статусу примагнічування
    resetMagnetization() {
        this.isMagnetized = false;
        this.angle = 0;
    }

    // Оновлення області підсвічування в хетч-патерні
    _updateHatchPattern() {
        if (this.hatchPattern && this.visible) {
            const halfWidth = this.width / 2;
            const halfHeight = this.height / 2;

            // Якщо прямокутник повернутий, потрібно розрахувати оновлену область
            if (this.angle !== 0) {
                // Для повернутого прямокутника створюємо більшу область підсвічування,
                // щоб вона охоплювала весь повернутий прямокутник
                const diagonal = Math.sqrt(this.width * this.width + this.height * this.height);

                this.hatchPattern.setHighlightArea(
                    this.x - diagonal / 2,
                    this.y - diagonal / 2,
                    diagonal,
                    diagonal
                );
            } else {
                // Для неповернутого прямокутника використовуємо точні розміри
                this.hatchPattern.setHighlightArea(
                    this.x - halfWidth,
                    this.y - halfHeight,
                    this.width,
                    this.height
                );
            }
        }
    }

    // Малювання прямокутника
    draw(ctx, pixelsPerCm) {
        if (!this.visible) return;

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        // Зберігаємо стан контексту перед трансформаціями
        ctx.save();

        // Якщо прямокутник повернутий, застосовуємо відповідну трансформацію
        if (this.angle !== 0) {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.translate(-this.x, -this.y);
        }

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

        // Відновлюємо стан контексту
        ctx.restore();

        // Малюємо заштриховку, якщо вона є
        if (this.hatchPattern && this.visible) {
            // Отримуємо розміри канвасу для правильного відображення заштриховки
            const canvasWidth = ctx.canvas.width * 2;
            const canvasHeight = ctx.canvas.height * 2;

            ctx.save();

            // Створюємо маску для заштриховки відповідно до повороту прямокутника
            ctx.beginPath();

            if (this.angle !== 0) {
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                ctx.rect(-halfWidth, -halfHeight, this.width, this.height);
            } else {
                ctx.rect(this.x - halfWidth, this.y - halfHeight, this.width, this.height);
            }

            ctx.clip();

            // Якщо прямокутник повернутий, повертаємо контекст назад для заштриховки
            if (this.angle !== 0) {
                ctx.rotate(-this.angle);
                ctx.translate(-this.x, -this.y);
            }

            // Малюємо підсвічену область (PreviewRect)
            this.hatchPattern.drawHighlight(ctx, canvasWidth, canvasHeight);

            ctx.restore();
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