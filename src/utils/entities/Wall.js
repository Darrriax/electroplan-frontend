// src/utils/entities/Wall.js
export class Wall {
    constructor({ id, x, y, width, height, thickness, angle = 0 }) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.thickness = thickness;
        this.angle = angle;          // Кут нахилу (в радіанах)
        this.connectedWalls = [];    // Список з'єднаних стін
        this.hatchPattern = null;    // Посилання на об'єкт заштриховки
    }

    // Встановлення об'єкта заштриховки
    setHatchPattern(hatchPattern) {
        this.hatchPattern = hatchPattern;
    }

    // Малювання стіни на канвасі
    draw(ctx, pixelsPerCm) {
        ctx.save();

        // Якщо є кут нахилу, повертаємо контекст канвасу
        if (this.angle !== 0) {
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.angle);
            ctx.translate(-(this.x + this.width / 2), -(this.y + this.height / 2));
        }

        // Малюємо стіну з білим фоном
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Малюємо границі стіни
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        ctx.restore();

        // Малюємо заштриховку із застосуванням відсічення (кліпінгу)
        if (this.hatchPattern) {
            ctx.save();

            // Створюємо маску для стіни (обертаємо її відповідно до кута)
            ctx.beginPath();

            // Ротація маски для відсічення
            if (this.angle !== 0) {
                ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
                ctx.rotate(this.angle);
                ctx.rect(-(this.width / 2), -(this.height / 2), this.width, this.height);
            } else {
                ctx.rect(this.x, this.y, this.width, this.height);
            }

            ctx.clip();

            // Перед відображенням патерну, повертаємо контекст назад, щоб патерн завжди був під однаковим кутом
            if (this.angle !== 0) {
                ctx.rotate(-this.angle);
                ctx.translate(-(this.x + this.width / 2), -(this.y + this.height / 2));
            }

            // Малюємо заштриховку на всьому канвасі, але вона буде видна тільки в області відсічення (стіни)
            const canvasWidth = ctx.canvas.width * 2;
            const canvasHeight = ctx.canvas.height * 2;

            // Використовуємо новий метод для малювання в обмеженій області
            this.hatchPattern.drawInArea(ctx,
                {x: this.x, y: this.y, width: this.width, height: this.height},
                canvasWidth, canvasHeight
            );

            ctx.restore();
        }
    }
}