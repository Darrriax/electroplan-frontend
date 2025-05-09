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

        // Розміри PreviewRect
        const halfWidth = previewRect.width / 2;
        const halfHeight = previewRect.height / 2;

        // Знаходимо найближчу стіну та її грань
        let closestWall = null;
        let closestEdge = null;
        let minDistance = Infinity;

        // Проходимо по всіх стінах та шукаємо найближчу
        for (const wall of walls) {
            // Перевіряємо, чи миша знаходиться поблизу стіни
            // Трансформуємо координати миші відповідно до кута стіни
            const transformedPoint = this._transformPointByWallAngle(mouseX, mouseY, wall);

            // Перевіряємо, чи точка знаходиться в межах стіни з урахуванням порогу
            if (this._isPointNearWall(transformedPoint.x, transformedPoint.y, wall, threshold)) {
                // Визначаємо найближчу грань стіни
                const edge = this._getNearestEdge(transformedPoint.x, transformedPoint.y, wall);
                const distance = this._calculateDistanceToEdge(transformedPoint.x, transformedPoint.y, wall, edge);

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
     * Перевіряє, чи точка знаходиться поблизу стіни
     * @param {Number} x - X-координата точки
     * @param {Number} y - Y-координата точки
     * @param {Object} wall - Стіна
     * @param {Number} threshold - Поріг відстані
     * @returns {Boolean} - true, якщо точка поблизу стіни
     */
    _isPointNearWall(x, y, wall, threshold) {
        // Розширені межі стіни з урахуванням порогу
        const expandedX = wall.x - threshold;
        const expandedY = wall.y - threshold;
        const expandedWidth = wall.width + threshold * 2;
        const expandedHeight = wall.height + threshold * 2;

        return (
            x >= expandedX &&
            x <= expandedX + expandedWidth &&
            y >= expandedY &&
            y <= expandedY + expandedHeight
        );
    }

    /**
     * Визначає найближчу грань стіни до заданої точки
     * @param {Number} x - X-координата точки
     * @param {Number} y - Y-координата точки
     * @param {Object} wall - Стіна
     * @returns {String} - Назва грані ('top', 'right', 'bottom', 'left')
     */
    _getNearestEdge(x, y, wall) {
        // Відстані до кожної грані
        const topDistance = Math.abs(y - wall.y);
        const rightDistance = Math.abs(x - (wall.x + wall.width));
        const bottomDistance = Math.abs(y - (wall.y + wall.height));
        const leftDistance = Math.abs(x - wall.x);

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
    _calculateDistanceToEdge(x, y, wall, edge) {
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