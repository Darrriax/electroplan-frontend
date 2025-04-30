export class Grid {
    constructor(canvas) {
        this.canvas = canvas;
        this.gridLines = [];
        this.snapLines = [];
    }

    /**
     * Показує напрямні (лінії прилипання) з центру вказаної точки
     * під кутами: 0°, 45°, 90°, ..., 315°.
     * @param {Object} startPoint - Точка {x, y}, з якої виходять лінії.
     */
    showSnapLines(startPoint) {
        this.clearSnapLines();

        const angles = [0, 45, 90, 135, 180, 225, 270, 315];
        angles.forEach(angle => {
            const line = this.createSnapLine(startPoint, angle);
            this.snapLines.push(line);
            this.canvas.add(line);
        });
    }

    /**
     * Створює одну напрямну лінію під заданим кутом.
     * @param {Object} startPoint - Центр лінії {x, y}.
     * @param {number} angle - Кут у градусах.
     * @returns {fabric.Line} - Об'єкт Fabric лінії.
     */
    createSnapLine(startPoint, angle) {
        const length = 5000;
        const rad = angle * Math.PI / 180;
        const x = Math.round(startPoint.x);
        const y = Math.round(startPoint.y);

        return new fabric.Line([
            x - Math.cos(rad) * length,
            y - Math.sin(rad) * length,
            x + Math.cos(rad) * length,
            y + Math.sin(rad) * length
        ], {
            stroke: '#00a400',
            strokeWidth: 1,
            strokeDashArray: [4, 2],
            strokeLineCap: 'square',
            strokeDashOffset: 0,
            snapToPixels: true,
            objectCaching: false,
            selectable: false,
            evented: false
        });
    }

    /**
     * Видаляє всі лінії прилипання з полотна.
     */
    clearSnapLines() {
        this.snapLines.forEach(line => this.canvas.remove(line));
        this.snapLines = [];
    }

    /**
     * Створює сітку на канвасі з лініями кожні 10px,
     * кожна десята (100px) — жирна.
     */
    setupGrid() {
        this.clearGrid();
        const width = this.canvas.getWidth();
        const height = this.canvas.getHeight();
        const cellSize = 10;

        for (let x = 0; x <= width; x += cellSize) {
            this.addGridLine(x, 0, x, height, x % 100 === 0);
        }

        for (let y = 0; y <= height; y += cellSize) {
            this.addGridLine(0, y, width, y, y % 100 === 0);
        }
    }

    /**
     * Додає одну лінію до сітки.
     * @param {number} x1 - Початкова координата X.
     * @param {number} y1 - Початкова координата Y.
     * @param {number} x2 - Кінцева координата X.
     * @param {number} y2 - Кінцева координата Y.
     * @param {boolean} isBold - Чи має лінія бути жирною.
     */
    addGridLine(x1, y1, x2, y2, isBold) {
        const line = new fabric.Line([x1, y1, x2, y2], {
            stroke: isBold ? '#bbb' : '#ddd',
            selectable: false,
            evented: false
        });
        this.canvas.add(line);
        this.gridLines.push(line);
    }

    /**
     * Видаляє всі лінії сітки з полотна.
     */
    clearGrid() {
        this.gridLines.forEach(line => this.canvas.remove(line));
        this.gridLines = [];
    }
}