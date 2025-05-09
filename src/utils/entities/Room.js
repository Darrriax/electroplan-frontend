// src/utils/entities/Room.js
export class Room {
    constructor(id, walls = []) {
        this.id = id;
        this.walls = walls;  // Масив ідентифікаторів стін, які утворюють кімнату
        this.color = 'rgba(200, 230, 255, 0.3)';  // Колір заливки кімнати
        this.name = `Кімната ${id}`;  // Назва кімнати
        this.area = 0;  // Площа кімнати в м²
    }

    // Малювання кімнати
    draw(ctx, wallsMap) {
        if (this.walls.length < 3) return;  // Кімната має містити мінімум 3 стіни

        ctx.save();

        ctx.fillStyle = this.color;

        // Створюємо шлях для заливки кімнати
        ctx.beginPath();

        // Знаходимо першу стіну
        const firstWall = wallsMap.get(this.walls[0]);
        if (!firstWall) {
            ctx.restore();
            return;
        }

        // Починаємо шлях з центру першої стіни
        ctx.moveTo(
            firstWall.x + firstWall.width / 2,
            firstWall.y + firstWall.height / 2
        );

        // Додаємо решту стін до шляху
        for (let i = 1; i < this.walls.length; i++) {
            const wall = wallsMap.get(this.walls[i]);
            if (wall) {
                ctx.lineTo(
                    wall.x + wall.width / 2,
                    wall.y + wall.height / 2
                );
            }
        }

        // Замикаємо шлях
        ctx.closePath();
        ctx.fill();

        // Малюємо назву кімнати та площу
        this.drawRoomLabel(ctx, wallsMap);

        ctx.restore();
    }

    // Малювання мітки з назвою та площею кімнати
    drawRoomLabel(ctx, wallsMap) {
        // Обчислюємо центр кімнати
        let centerX = 0;
        let centerY = 0;
        let count = 0;

        for (const wallId of this.walls) {
            const wall = wallsMap.get(wallId);
            if (wall) {
                centerX += wall.x + wall.width / 2;
                centerY += wall.y + wall.height / 2;
                count++;
            }
        }

        if (count === 0) return;

        centerX /= count;
        centerY /= count;

        // Налаштування стилю тексту
        ctx.font = '14px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Малюємо назву та площу
        const areaText = `${this.area.toFixed(2)} м²`;
        ctx.fillText(this.name, centerX, centerY - 10);
        ctx.fillText(areaText, centerX, centerY + 10);
    }

    // Обчислення площі кімнати
    calculateArea(wallsMap, pixelsPerCm) {
        if (this.walls.length < 3) {
            this.area = 0;
            return;
        }

        // Збираємо точки для обчислення
        const points = [];
        for (const wallId of this.walls) {
            const wall = wallsMap.get(wallId);
            if (wall) {
                points.push({
                    x: wall.x + wall.width / 2,
                    y: wall.y + wall.height / 2
                });
            }
        }

        // Площа за формулою Гаусса (метод шнурка)
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }

        area = Math.abs(area) / 2;

        // Переводимо з пікселів в см², а потім в м²
        const areaInCm2 = area / (pixelsPerCm * pixelsPerCm);
        this.area = areaInCm2 / 10000;  // конвертуємо в м²
    }
}