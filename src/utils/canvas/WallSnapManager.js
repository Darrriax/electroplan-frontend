export class WallSnapManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.walls = [];
        this.snapDistance = 20; // Поріг прив'язки (у пікселях, що відповідає см)
        this.snapIndicator = null;
    }

    /**
     * Додає стіну до списку для пошуку прив'язки.
     * @param {fabric.Rect} wall - Стіна, яку потрібно зареєструвати.
     */
    registerWall(wall) {
        this.walls.push(wall);
    }

    /**
     * Повертає найближчу точку прив'язки до заданої, якщо вона в межах snapDistance.
     * @param {Object} currentPoint - Поточна точка {x, y}, яку перевіряємо.
     * @param {number} currentThickness - Товщина поточної стіни (в пікселях).
     * @returns {Object|null} - Найближча точка прив'язки або null.
     */
    findSnapPoint(currentPoint, currentThickness) {
        let closestPoint = null;
        let minDistance = Infinity;

        this.walls.forEach(wall => {
            const points = this.getSnapPoints(wall, currentThickness);
            points.forEach(point => {
                const dist = Math.hypot(currentPoint.x - point.x, currentPoint.y - point.y);
                if (dist < this.snapDistance && dist < minDistance) {
                    minDistance = dist;
                    closestPoint = point;
                }
            });
        });

        return closestPoint;
    }

    /**
     * Обчислює точки прив’язки для заданої стіни з урахуванням товщини.
     * @param {fabric.Rect} wall - Стіна для прив’язки.
     * @param {number} currentThickness - Товщина поточної стіни (в пікселях).
     * @returns {Array} - Масив з двох точок прив’язки.
     */
    getSnapPoints(wall, currentThickness) {
        const angleRad = wall.angle * Math.PI / 180;
        const wallThickness = wall.height;
        const totalOffset = (wallThickness + currentThickness) / 2;

        return [
            {
                x: wall.left - totalOffset * Math.sin(angleRad),
                y: wall.top + totalOffset * Math.cos(angleRad)
            },
            {
                x: wall.left + wall.width * Math.cos(angleRad) + totalOffset * Math.sin(angleRad),
                y: wall.top + wall.width * Math.sin(angleRad) - totalOffset * Math.cos(angleRad)
            }
        ];
    }

    /**
     * Показує візуальний індикатор точки прив’язки.
     * @param {Object} point - Точка {x, y}, де показати індикатор.
     */
    showSnapIndicator(point) {
        this.hideSnapIndicator();
        this.snapIndicator = new fabric.Circle({
            left: point.x - 4,
            top: point.y - 4,
            radius: 4,
            fill: '#32CD32',
            stroke: '#FFF',
            strokeWidth: 1,
            selectable: false
        });
        this.canvas.add(this.snapIndicator);
    }

    /**
     * Приховує візуальний індикатор точки прив’язки.
     */
    hideSnapIndicator() {
        if (this.snapIndicator) {
            this.canvas.remove(this.snapIndicator);
            this.snapIndicator = null;
        }
    }
}