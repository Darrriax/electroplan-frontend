// src/utils/entities/Grid.js
export class Grid {
    constructor(cellSize = 10, bigCellSize = 100) {
        this.cellSize = cellSize;         // Розмір маленької клітинки (в пікселях)
        this.bigCellSize = bigCellSize;   // Розмір великої клітинки (в пікселях)
        this.lineColor = '#e0e0e0';       // Колір ліній сітки
        this.bigLineColor = '#c0c0c0';    // Колір ліній великої сітки
        this.diagonalLineColor = '#f0f0f0'; // Колір діагональної заштриховки
        this.diagonalLineSpacing = 20;    // Відстань між діагональними лініями
    }

    // Малювання сітки на канвасі
    draw(ctx, width, height, startX = 0, startY = 0) {
        // Розраховуємо межі для малювання сітки
        const endX = startX + width;
        const endY = startY + height;

        // Розраховуємо, з якої лінії починати малювання сітки
        const startGridX = Math.floor(startX / this.cellSize) * this.cellSize;
        const startGridY = Math.floor(startY / this.cellSize) * this.cellSize;
        const startBigGridX = Math.floor(startX / this.bigCellSize) * this.bigCellSize;
        const startBigGridY = Math.floor(startY / this.bigCellSize) * this.bigCellSize;

        // Малюємо маленькі клітинки
        ctx.strokeStyle = this.lineColor;
        ctx.lineWidth = 1;

        for (let x = startGridX; x <= endX; x += this.cellSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }

        for (let y = startGridY; y <= endY; y += this.cellSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }

        // Малюємо великі клітинки
        ctx.strokeStyle = this.bigLineColor;
        ctx.lineWidth = 1.5;

        for (let x = startBigGridX; x <= endX; x += this.bigCellSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }

        for (let y = startBigGridY; y <= endY; y += this.bigCellSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    }

    // Малювання діагональної заштриховки (якщо потрібно)
    drawDiagonalPattern(ctx, width, height, startX = 0, startY = 0) {
        ctx.save();
        ctx.strokeStyle = this.diagonalLineColor;
        ctx.lineWidth = 1;

        const endX = startX + width;
        const endY = startY + height;
        const totalSize = width + height;

        // Розраховуємо початкову позицію для діагональних ліній
        const startDiag = Math.floor((startX - height) / this.diagonalLineSpacing) * this.diagonalLineSpacing;

        for (let x = startDiag; x < endX + height; x += this.diagonalLineSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x - totalSize, endY);
            ctx.stroke();
        }

        ctx.restore();
    }
}