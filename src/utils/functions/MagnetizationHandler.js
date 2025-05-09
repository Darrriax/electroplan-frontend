// utils/functions/MagnetizationHandler.js

export class MagnetizationHandler {
    constructor(options = {}) {
        this.options = {
            magneticThreshold: 20, // Відстань в пікселях для спрацювання магнітного ефекту
            cellSize: 10,
            ...options
        };
    }

    /**
     * Перевіряє, чи потрібно примагнітити PreviewRect до стіни
     * @param {Object} previewRect - Об'єкт PreviewRect
     * @param {Array} walls - Масив стін
     * @param {Number} mouseX - Світова X-координата курсора миші
     * @param {Number} mouseY - Світова Y-координата курсора миші
     * @param {Number} scale - Масштаб перегляду
     * @returns {Object} - Нові координати і кут для PreviewRect або null якщо примагнічування не потрібне
     */
    magnetizeToWall(previewRect, walls, mouseX, mouseY, scale) {
        if (!walls || !walls.length) return null;

        // Перетворюємо поріг магнітизації з урахуванням масштабу
        const threshold = this.options.magneticThreshold / scale;

        // Знаходимо найближчу стіну та її грань
        let closestWall = null;
        let closestEdge = null;
        let minDistance = Infinity;

        // Проходимо по всіх стінах та шукаємо найближчу
        for (const wall of walls) {
            // Перевіряємо, чи миша знаходиться поблизу стіни з урахуванням її товщини
            // Трансформуємо координати миші відповідно до кута стіни
            const transformedPoint = this._transformPointByWallAngle(mouseX, mouseY, wall);

            // Розрахуємо реальні межі стіни з урахуванням товщини
            const wallThickness = wall.thickness || 10; // використовуємо товщину стіни, якщо доступна
            const halfThickness = wallThickness / 2;

            // Перевіряємо, чи точка знаходиться в межах стіни з урахуванням порогу та товщини
            if (this._isPointNearWallEdges(transformedPoint.x, transformedPoint.y, wall, threshold, halfThickness)) {
                // Визначаємо найближчу грань стіни з урахуванням товщини
                const edge = this._getNearestWallEdge(transformedPoint.x, transformedPoint.y, wall, halfThickness);
                const distance = this._calculateDistanceToWallEdge(transformedPoint.x, transformedPoint.y, wall, edge, halfThickness);

                if (distance < minDistance && distance < threshold) {
                    minDistance = distance;
                    closestWall = wall;
                    closestEdge = edge;
                }
            }
        }

        // Якщо знайдено стіну для магнітизації
        if (closestWall && closestEdge) {
            // Розраховуємо нові координати для PreviewRect з урахуванням магнітного примикання
            return this._calculateMagnetizedPosition(
                previewRect,
                closestWall,
                closestEdge,
                mouseX,
                mouseY
            );
        }

        return null;
    }

    /**
     * Трансформує координати точки з урахуванням кута стіни
     * @param {Number} x - X-координата точки
     * @param {Number} y - Y-координата точки
     * @param {Object} wall - Стіна
     * @returns {Object} - Трансформовані координати
     */
    _transformPointByWallAngle(x, y, wall) {
        if (wall.angle === 0) {
            return { x, y };
        }

        const centerX = wall.x + wall.width / 2;
        const centerY = wall.y + wall.height / 2;

        // Обертаємо точку в зворотному напрямку відносно кута стіни
        const dx = x - centerX;
        const dy = y - centerY;
        const rotatedX = centerX + dx * Math.cos(-wall.angle) - dy * Math.sin(-wall.angle);
        const rotatedY = centerY + dx * Math.sin(-wall.angle) + dy * Math.cos(-wall.angle);

        return { x: rotatedX, y: rotatedY };
    }

    /**
     * Трансформує координати точки з координатної системи стіни у світові координати
     * @param {Number} x - X-координата точки в системі стіни
     * @param {Number} y - Y-координата точки в системі стіни
     * @param {Object} wall - Стіна
     * @returns {Object} - Трансформовані світові координати
     */
    _transformPointToWorldCoordinates(x, y, wall) {
        if (wall.angle === 0) {
            return { x, y };
        }

        const centerX = wall.x + wall.width / 2;
        const centerY = wall.y + wall.height / 2;

        // Обертаємо точку в напрямку кута стіни
        const dx = x - centerX;
        const dy = y - centerY;
        const rotatedX = centerX + dx * Math.cos(wall.angle) - dy * Math.sin(wall.angle);
        const rotatedY = centerY + dx * Math.sin(wall.angle) + dy * Math.cos(wall.angle);

        return { x: rotatedX, y: rotatedY };
    }

    /**
     * Перевіряє, чи точка знаходиться поблизу країв стіни з урахуванням товщини
     * @param {Number} x - X-координата точки
     * @param {Number} y - Y-координата точки
     * @param {Object} wall - Стіна
     * @param {Number} threshold - Поріг відстані
     * @param {Number} halfThickness - Половина товщини стіни
     * @returns {Boolean} - true, якщо точка поблизу краю стіни
     */
    _isPointNearWallEdges(x, y, wall, threshold, halfThickness) {
        // Розширені межі стіни з урахуванням порогу та товщини
        const wallLeft = wall.x - halfThickness;
        const wallRight = wall.x + wall.width + halfThickness;
        const wallTop = wall.y - halfThickness;
        const wallBottom = wall.y + wall.height + halfThickness;

        // Перевіряємо чи точка знаходиться поблизу країв стіни з урахуванням порогу
        return (
            // Перевірка для лівого краю
            (Math.abs(x - wallLeft) <= threshold && y >= wallTop - threshold && y <= wallBottom + threshold) ||
            // Перевірка для правого краю
            (Math.abs(x - wallRight) <= threshold && y >= wallTop - threshold && y <= wallBottom + threshold) ||
            // Перевірка для верхнього краю
            (Math.abs(y - wallTop) <= threshold && x >= wallLeft - threshold && x <= wallRight + threshold) ||
            // Перевірка для нижнього краю
            (Math.abs(y - wallBottom) <= threshold && x >= wallLeft - threshold && x <= wallRight + threshold)
        );
    }

    /**
     * Визначає найближчу грань стіни до заданої точки з урахуванням товщини
     * @param {Number} x - X-координата точки
     * @param {Number} y - Y-координата точки
     * @param {Object} wall - Стіна
     * @param {Number} halfThickness - Половина товщини стіни
     * @returns {String} - Назва грані ('top', 'right', 'bottom', 'left')
     */
    _getNearestWallEdge(x, y, wall, halfThickness) {
        // Розрахунок реальних країв стіни з урахуванням товщини
        const topEdge = wall.y - halfThickness;
        const rightEdge = wall.x + wall.width + halfThickness;
        const bottomEdge = wall.y + wall.height + halfThickness;
        const leftEdge = wall.x - halfThickness;

        // Відстані до кожної грані
        const topDistance = Math.abs(y - topEdge);
        const rightDistance = Math.abs(x - rightEdge);
        const bottomDistance = Math.abs(y - bottomEdge);
        const leftDistance = Math.abs(x - leftEdge);

        // Знаходимо найменшу відстань
        const minDistance = Math.min(topDistance, rightDistance, bottomDistance, leftDistance);

        if (minDistance === topDistance) return 'top';
        if (minDistance === rightDistance) return 'right';
        if (minDistance === bottomDistance) return 'bottom';
        return 'left';
    }

    /**
     * Розраховує відстань від точки до грані стіни
     * @param {Number} x - X-координата точки
     * @param {Number} y - Y-координата точки
     * @param {Object} wall - Стіна
     * @param {String} edge - Грань стіни ('top', 'right', 'bottom', 'left')
     * @returns {Number} - Відстань до грані
     */
    _calculateDistanceToWallEdge(x, y, wall, edge) {
        switch (edge) {
            case 'top': return Math.abs(y - wall.y);
            case 'right': return Math.abs(x - (wall.x + wall.width));
            case 'bottom': return Math.abs(y - (wall.y + wall.height));
            case 'left': return Math.abs(x - wall.x);
            default: return Infinity;
        }
    }

    /**
     * Розраховує нову позицію для PreviewRect з урахуванням магнітного примикання
     * @param {Object} previewRect - Об'єкт PreviewRect
     * @param {Object} wall - Стіна для примагнічування
     * @param {String} edge - Грань стіни ('top', 'right', 'bottom', 'left')
     * @param {Number} mouseX - X-координата курсора миші
     * @param {Number} mouseY - Y-координата курсора миші
     * @returns {Object} - Нові координати і кут для PreviewRect
     */
    _calculateMagnetizedPosition(previewRect, wall, edge, mouseX, mouseY) {
        const halfWidth = previewRect.width / 2;
        const halfHeight = previewRect.height / 2;

        // Спочатку працюємо в системі координат стіни (без обертання)
        // Розраховуємо нові координати для PreviewRect залежно від грані стіни
        let newX, newY;

        // Визначаємо обмеження для координат, щоб PreviewRect не виходив за межі стіни
        const minX = wall.x + halfWidth;
        const maxX = wall.x + wall.width - halfWidth;
        const minY = wall.y + halfHeight;
        const maxY = wall.y + wall.height - halfHeight;

        // Трансформуємо координати миші до системи координат стіни
        const transformedMouse = this._transformPointByWallAngle(mouseX, mouseY, wall);

        // Розраховуємо нові координати відповідно до грані
        switch (edge) {
            case 'top':
                newX = Math.max(minX, Math.min(maxX, transformedMouse.x));
                newY = wall.y - halfHeight;
                break;
            case 'right':
                newX = wall.x + wall.width + halfWidth;
                newY = Math.max(minY, Math.min(maxY, transformedMouse.y));
                break;
            case 'bottom':
                newX = Math.max(minX, Math.min(maxX, transformedMouse.x));
                newY = wall.y + wall.height + halfHeight;
                break;
            case 'left':
                newX = wall.x - halfWidth;
                newY = Math.max(minY, Math.min(maxY, transformedMouse.y));
                break;
        }

        // Трансформуємо координати назад до світових координат
        const worldCoords = this._transformPointToWorldCoordinates(newX, newY, wall);

        // Прив'язуємо до сітки, якщо кут стіни 0 або 90 градусів
        if (wall.angle === 0 || Math.abs(wall.angle) === Math.PI/2) {
            worldCoords.x = Math.round(worldCoords.x / this.options.cellSize) * this.options.cellSize;
            worldCoords.y = Math.round(worldCoords.y / this.options.cellSize) * this.options.cellSize;
        }

        return {
            x: worldCoords.x,
            y: worldCoords.y,
            angle: wall.angle
        };
    }

    /**
     * Оновлює параметри обробника магнітизації
     * @param {Object} newOptions - Нові параметри
     */
    updateOptions(newOptions) {
        this.options = {
            ...this.options,
            ...newOptions
        };
    }
}