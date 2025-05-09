// utils/functions/WallDrawingHandler.js
import { Wall } from '../entities/Wall';

export class WallDrawingHandler {
    constructor(canvas, mouseHandler, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mouseHandler = mouseHandler;
        this.options = {
            wallThickness: 10,
            wallThicknessInCm: 10,
            pixelsPerCm: 1,
            cellSize: 10,
            isWallToolActive: false,
            ...options
        };

        this.isDrawing = false;
        this.startPoint = { x: 0, y: 0 };
        this.endPoint = { x: 0, y: 0 };
        this.previewWall = null;
        this.walls = [];
        this.nextWallId = 1;
        this.hatchPattern = null;

        this.callbacks = {
            onWallCreated: null,
            onDrawingStart: null,
            onDrawingEnd: null
        };
    }

    init(hatchPattern) {
        this.hatchPattern = hatchPattern;
        this._bindEvents();
        return this;
    }

    _bindEvents() {
        // Прив'язуємо події тільки якщо інструмент стіни активний
        if (this.options.isWallToolActive) {
            this.canvas.addEventListener('mousedown', this._onMouseDown.bind(this));
            this.canvas.addEventListener('mousemove', this._onMouseMove.bind(this));
            this.canvas.addEventListener('mouseup', this._onMouseUp.bind(this));
        } else {
            this._unbindEvents();
        }
    }

    _unbindEvents() {
        this.canvas.removeEventListener('mousedown', this._onMouseDown.bind(this));
        this.canvas.removeEventListener('mousemove', this._onMouseMove.bind(this));
        this.canvas.removeEventListener('mouseup', this._onMouseUp.bind(this));
    }

    _onMouseDown(e) {
        // Перевіряємо, чи активний інструмент стіни і чи ліва кнопка миші
        if (!this.options.isWallToolActive || e.button !== 0) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Перетворюємо координати екрану в світові координати
        const worldX = (mouseX - this.mouseHandler.offsetX) / this.mouseHandler.scale;
        const worldY = (mouseY - this.mouseHandler.offsetY) / this.mouseHandler.scale;

        // Прив'язуємо до сітки
        const gridX = Math.round(worldX / this.options.cellSize) * this.options.cellSize;
        const gridY = Math.round(worldY / this.options.cellSize) * this.options.cellSize;

        this.isDrawing = true;
        this.startPoint = { x: gridX, y: gridY };
        this.endPoint = { x: gridX, y: gridY };

        // Створюємо попередній вигляд стіни
        this._createPreviewWall();

        if (this.callbacks.onDrawingStart) {
            this.callbacks.onDrawingStart(this.startPoint);
        }
    }

    _onMouseMove(e) {
        if (!this.isDrawing || !this.options.isWallToolActive) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Перетворюємо координати екрану в світові координати
        const worldX = (mouseX - this.mouseHandler.offsetX) / this.mouseHandler.scale;
        const worldY = (mouseY - this.mouseHandler.offsetY) / this.mouseHandler.scale;

        // Прив'язуємо до сітки
        const gridX = Math.round(worldX / this.options.cellSize) * this.options.cellSize;
        const gridY = Math.round(worldY / this.options.cellSize) * this.options.cellSize;

        this.endPoint = { x: gridX, y: gridY };

        // Оновлюємо попередній вигляд стіни
        this._updatePreviewWall();
    }

    _onMouseUp(e) {
        if (!this.isDrawing || !this.options.isWallToolActive) return;

        // Create wall only if start and end points are different
        if (this.startPoint.x !== this.endPoint.x || this.startPoint.y !== this.endPoint.y) {
            const wall = this._createWall();
            this.walls.push(wall);

            if (this.callbacks.onWallCreated) {
                this.callbacks.onWallCreated(wall);
            }
        }

        this.isDrawing = false;
        this.previewWall = null;

        if (this.callbacks.onDrawingEnd) {
            this.callbacks.onDrawingEnd();
        }

        this.mouseHandler._redraw();
    }

    _createPreviewWall() {
        // Обчислюємо ширину, висоту та розташування стіни
        const thickness = this.options.wallThicknessInCm * this.options.pixelsPerCm;
        const { x, y, width, height, angle } = this._calculateWallDimensions(
            this.startPoint.x,
            this.startPoint.y,
            this.endPoint.x,
            this.endPoint.y,
            thickness
        );

        // Створюємо тимчасовий об'єкт стіни для попереднього перегляду
        this.previewWall = {
            x, y, width, height, thickness, angle
        };

        this.mouseHandler._redraw();
    }

    _updatePreviewWall() {
        if (!this.previewWall) return;

        const thickness = this.options.wallThicknessInCm * this.options.pixelsPerCm;
        const { x, y, width, height, angle } = this._calculateWallDimensions(
            this.startPoint.x,
            this.startPoint.y,
            this.endPoint.x,
            this.endPoint.y,
            thickness
        );

        this.previewWall.x = x;
        this.previewWall.y = y;
        this.previewWall.width = width;
        this.previewWall.height = height;
        this.previewWall.angle = angle;

        this.mouseHandler._redraw();
    }

    _createWall() {
        const thickness = this.options.wallThicknessInCm * this.options.pixelsPerCm;
        const { x, y, width, height, angle } = this._calculateWallDimensions(
            this.startPoint.x,
            this.startPoint.y,
            this.endPoint.x,
            this.endPoint.y,
            thickness
        );

        // Створюємо новий об'єкт Wall
        const wall = new Wall({
            id: this.nextWallId++,
            x,
            y,
            width,
            height,
            thickness: this.options.wallThicknessInCm,
            angle
        });

        // Передаємо об'єкт заштриховки стіні
        if (this.hatchPattern) {
            wall.setHatchPattern(this.hatchPattern);
        }

        return wall;
    }

    _calculateWallDimensions(startX, startY, endX, endY, thickness) {
        // Calculate the delta and length
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // If length is zero, return minimum dimensions
        if (length === 0) {
            return {
                x: startX - thickness / 2,
                y: startY - thickness / 2,
                width: thickness,
                height: thickness,
                angle: 0
            };
        }

        // Calculate the angle of the wall
        const angle = Math.atan2(deltaY, deltaX);

        // For perfectly vertical or horizontal walls, use simplified calculations
        if (Math.abs(deltaX) < 0.000) { // Vertical wall
            return {
                x: startX - thickness / 2,
                y: Math.min(startY, endY),
                width: thickness,
                height: Math.abs(deltaY),
                angle: (deltaY >= 0) ? Math.PI / 2 : -Math.PI / 2 // Correctly set angle based on direction
            };
        } else if (Math.abs(deltaY) < 0.000) { // Horizontal wall
            return {
                x: Math.min(startX, endX),
                y: startY - thickness / 2,
                width: Math.abs(deltaX),
                height: thickness,
                angle: (deltaX >= 0) ? 0 : Math.PI // Correctly set angle based on direction
            };
        } else {
            // For angled walls, center the wall along the line between start and end points
            const centerX = (startX + endX) / 2;
            const centerY = (startY + endY) / 2;

            return {
                x: centerX - length / 2, // Position from the center
                y: centerY - thickness / 2, // Position from the center
                width: length,
                height: thickness,
                angle: angle
            };
        }
    }

    // Малювання стін і попереднього вигляду стіни
    drawWalls(ctx) {
        // Малюємо усі стіни (завжди, незалежно від активності інструменту)
        this.walls.forEach(wall => {
            wall.draw(ctx, this.options.pixelsPerCm);
        });

        // Малюємо попередній вигляд стіни лише якщо інструмент активний
        if (this.isDrawing && this.previewWall && this.options.isWallToolActive) {
            ctx.save();

            // Якщо є кут нахилу, повертаємо контекст канвасу
            if (this.previewWall.angle !== 0) {
                ctx.translate(
                    this.previewWall.x + this.previewWall.width / 2,
                    this.previewWall.y + this.previewWall.height / 2
                );
                ctx.rotate(this.previewWall.angle);
                ctx.translate(
                    -(this.previewWall.x + this.previewWall.width / 2),
                    -(this.previewWall.y + this.previewWall.height / 2)
                );
            }

            // Малюємо фон стіни
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillRect(
                this.previewWall.x,
                this.previewWall.y,
                this.previewWall.width,
                this.previewWall.height
            );

            // Малюємо контур
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                this.previewWall.x,
                this.previewWall.y,
                this.previewWall.width,
                this.previewWall.height
            );

            ctx.restore();

            // Додаємо заштриховку для попереднього вигляду стіни
            if (this.hatchPattern) {
                ctx.save();

                // Створюємо маску для стіни (обертаємо її відповідно до кута)
                ctx.beginPath();

                // Ротація маски для відсічення
                if (this.previewWall.angle !== 0) {
                    ctx.translate(
                        this.previewWall.x + this.previewWall.width / 2,
                        this.previewWall.y + this.previewWall.height / 2
                    );
                    ctx.rotate(this.previewWall.angle);
                    ctx.rect(
                        -this.previewWall.width / 2,
                        -this.previewWall.height / 2,
                        this.previewWall.width,
                        this.previewWall.height
                    );
                } else {
                    ctx.rect(
                        this.previewWall.x,
                        this.previewWall.y,
                        this.previewWall.width,
                        this.previewWall.height
                    );
                }

                ctx.clip();

                // Перед відображенням патерну, повертаємо контекст назад
                if (this.previewWall.angle !== 0) {
                    ctx.rotate(-this.previewWall.angle);
                    ctx.translate(
                        -(this.previewWall.x + this.previewWall.width / 2),
                        -(this.previewWall.y + this.previewWall.height / 2)
                    );
                }

                // Малюємо заштриховку на обмеженій області
                const canvasWidth = ctx.canvas.width * 2;
                const canvasHeight = ctx.canvas.height * 2;

                // Використовуємо новий метод для малювання в обмеженій області з підвищеною прозорістю
                ctx.globalAlpha = 0.4; // Більша прозорість для попереднього перегляду
                this.hatchPattern.drawInArea(ctx,
                    {x: this.previewWall.x, y: this.previewWall.y, width: this.previewWall.width, height: this.previewWall.height},
                    canvasWidth, canvasHeight
                );

                ctx.restore();
            }
        }
    }

    updateOptions(newOptions) {
        const previousIsWallToolActive = this.options.isWallToolActive;

        this.options = {
            ...this.options,
            ...newOptions
        };

        // Якщо змінився стан активності інструменту, перевіряємо чи потрібно оновити прив'язки подій
        if (previousIsWallToolActive !== this.options.isWallToolActive) {
            if (this.options.isWallToolActive) {
                this._bindEvents();
            } else {
                this._unbindEvents();
                // Також закриваємо режим малювання, якщо він був активний
                if (this.isDrawing) {
                    this.isDrawing = false;
                    this.previewWall = null;

                    if (this.callbacks.onDrawingEnd) {
                        this.callbacks.onDrawingEnd();
                    }
                }
            }
        }
    }

    setCallbacks(callbacks) {
        this.callbacks = {
            ...this.callbacks,
            ...callbacks
        };
    }

    destroy() {
        this._unbindEvents();
        this.walls = [];
        this.previewWall = null;
        this.hatchPattern = null;
    }
}