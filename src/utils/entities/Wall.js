// src/utils/entities/Wall.js
export class Wall {
    constructor({ id, x, y, width, height, thickness, angle = 0 }) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.thickness = thickness;  // Товщина стіни (в см)
        this.angle = angle;          // Кут нахилу (в радіанах)
        this.connectedWalls = [];    // Список з'єднаних стін
        this.color = '#fff';         // Колір заливки стіни
        this.borderColor = '#000';   // Колір границь стіни
        this.dimensions = {          // Розміри стіни в см
            width: 0,
            height: 0
        };
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

        // Малюємо стіну
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Малюємо границі стіни
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        ctx.restore();
    }

    // Перевірка, чи знаходиться точка (x, y) на стіні
    containsPoint(x, y) {
        // Якщо є кут нахилу, спочатку трансформуємо координати
        if (this.angle !== 0) {
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;

            // Обертаємо точку в зворотному напрямку
            const dx = x - centerX;
            const dy = y - centerY;
            const rotatedX = centerX + dx * Math.cos(-this.angle) - dy * Math.sin(-this.angle);
            const rotatedY = centerY + dx * Math.sin(-this.angle) + dy * Math.cos(-this.angle);

            x = rotatedX;
            y = rotatedY;
        }

        return (
            x >= this.x &&
            x <= this.x + this.width &&
            y >= this.y &&
            y <= this.y + this.height
        );
    }

    // Визначення найближчої грані до заданої точки
    getNearestEdge(x, y) {
        // Якщо є кут нахилу, спочатку трансформуємо координати
        if (this.angle !== 0) {
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;

            // Обертаємо точку в зворотному напрямку
            const dx = x - centerX;
            const dy = y - centerY;
            const rotatedX = centerX + dx * Math.cos(-this.angle) - dy * Math.sin(-this.angle);
            const rotatedY = centerY + dx * Math.sin(-this.angle) + dy * Math.cos(-this.angle);

            x = rotatedX;
            y = rotatedY;
        }

        // Відстані до кожної грані
        const topDistance = Math.abs(y - this.y);
        const rightDistance = Math.abs(x - (this.x + this.width));
        const bottomDistance = Math.abs(y - (this.y + this.height));
        const leftDistance = Math.abs(x - this.x);

        // Знаходимо найменшу відстань
        const minDistance = Math.min(topDistance, rightDistance, bottomDistance, leftDistance);

        if (minDistance === topDistance) return 'top';
        if (minDistance === rightDistance) return 'right';
        if (minDistance === bottomDistance) return 'bottom';
        return 'left';
    }

    // З'єднання з іншою стіною
    connectWith(wallId, edge) {
        if (!this.connectedWalls.find(w => w.wallId === wallId && w.edge === edge)) {
            this.connectedWalls.push({ wallId, edge });
        }
    }
}