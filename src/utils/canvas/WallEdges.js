// utils/canvas/WallEdges.js
export class WallEdges {
    constructor(canvas) {
        this.canvas = canvas;
        this.edges = [];
    }

    createEdges(wallData) {
        const { start, end, thickness } = wallData;
        const edges = [];

        // Основний вектор стіни
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Нормальний вектор (перпендикуляр)
        const normal = {
            x: -Math.sin(angle),
            y: Math.cos(angle)
        };

        // Зміщення для товщини (1px = 10мм)
        const offset = (thickness / 10) / 2;

        // Створюємо дві паралельні лінії
        for (let side = -1; side <= 1; side += 2) {
            const line = new fabric.Line([
                start.x + normal.x * offset * side,
                start.y + normal.y * offset * side,
                end.x + normal.x * offset * side,
                end.y + normal.y * offset * side
            ], {
                stroke: '#FFA500',
                strokeWidth: 2,
                selectable: false,
                evented: false
            });
            edges.push(line);
        }

        // Додаємо торці
        const startCap = new fabric.Line([
            start.x - normal.x * offset,
            start.y - normal.y * offset,
            start.x + normal.x * offset,
            start.y + normal.y * offset
        ], {
            stroke: '#FFA500',
            strokeWidth: 2,
            selectable: false,
            evented: false
        });

        const endCap = new fabric.Line([
            end.x - normal.x * offset,
            end.y - normal.y * offset,
            end.x + normal.x * offset,
            end.y + normal.y * offset
        ], {
            stroke: '#FFA500',
            strokeWidth: 2,
            selectable: false,
            evented: false
        });

        edges.push(startCap, endCap);
        this.edges.push(...edges);
        edges.forEach(edge => this.canvas.add(edge));
    }

    clearEdges() {
        this.edges.forEach(edge => this.canvas.remove(edge));
        this.edges = [];
    }
}