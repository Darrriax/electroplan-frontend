// utils/functions/CanvasInitializer.js
import { Grid, MouseHandler, HatchPattern, WallDrawingHandler } from '../index';
import { PreviewRect } from '../entities/PreviewRect';
import { Wall } from '../entities/Wall';  // Додаємо імпорт Wall
import { MagnetizationHandler } from './MagnetizationHandler'; // Імпортуємо обробник магнітизації

export class CanvasInitializer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = {
            virtualSize: 500000,
            pixelsPerCm: 1,
            cellSize: 10,
            isWallToolActive: false,
            wallThicknessInCm: 10,
            magneticThreshold: 20, // Поріг магнітизації в пікселях
            ...options
        };

        this.grid = null;
        this.mouseHandler = null;
        this.previewRect = null;
        this.hatchPattern = null;
        this.wallDrawingHandler = null;
        this.magnetizationHandler = null; // Додаємо обробник магнітизації

        this.callbacks = {
            onResize: null,
            onMouseMove: null,
            onMouseEnter: null,
            onMouseLeave: null,
            onWallCreated: null,
            onToolDeselect: null
        };
    }

    init() {
        // Встановлюємо фактичні розміри канвасу
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        // Ініціалізуємо сітку
        this.grid = new Grid();

        // Створюємо екземпляр HatchPattern
        this.hatchPattern = new HatchPattern('#555555', 1, 8, 0.4);

        // Створюємо екземпляр PreviewRect
        const thickness = this.options.wallThickness || 10;
        this.previewRect = new PreviewRect(thickness, 'rgba(255,255,255,0)', this.hatchPattern);

        // Встановлюємо розмір PreviewRect
        const size = this.options.wallThicknessInCm * this.options.pixelsPerCm;
        this.previewRect.width = size;
        this.previewRect.height = size;
        this.previewRect.visible = false;

        // Ініціалізуємо обробник магнітизації
        this.magnetizationHandler = new MagnetizationHandler({
            magneticThreshold: this.options.magneticThreshold,
            cellSize: this.options.cellSize
        });

        // Ініціалізуємо MouseHandler
        this.initMouseHandler();

        // Ініціалізуємо WallDrawingHandler
        this.initWallDrawingHandler();

        // Прив'язуємо обробники подій
        this.bindEvents();

        return this;
    }

    // Оновлення ініціалізації MouseHandler в CanvasInitializer
    initMouseHandler() {
        this.mouseHandler = new MouseHandler(this.canvas, (ctx) => {
            ctx.clearRect(
                -this.options.virtualSize / 2,
                -this.options.virtualSize / 2,
                this.options.virtualSize,
                this.options.virtualSize
            );

            // Малюємо сітку
            this.grid.draw(
                ctx,
                this.options.virtualSize,
                this.options.virtualSize,
                -this.options.virtualSize / 2,
                -this.options.virtualSize / 2
            );

            // Оскільки ми хочемо, щоб хетч-патерн був глобальним шаром, малюємо його одразу після сітки
            // але перед стінами. Це дозволить патерну "проявлятися" через стіни
            if (this.options.isWallToolActive) {
                // Встановлюємо видимість хетч-патерна
                this.hatchPattern.setVisibility(true);

                // Малюємо заштриховку на всьому полотні
                // Стіни завдяки кліпінгу будуть "проявляти" цей патерн
                this.hatchPattern.draw(
                    ctx,
                    this.options.virtualSize,
                    this.options.virtualSize,
                    -this.options.virtualSize / 2,
                    -this.options.virtualSize / 2
                );
            }

            // Малюємо стіни ЗАВЖДИ, незалежно від активності інструмента
            if (this.wallDrawingHandler) {
                this.wallDrawingHandler.drawWalls(ctx);
            }

            // Малюємо PreviewRect
            if (this.options.isWallToolActive) {
                this.previewRect.draw(ctx, this.options.pixelsPerCm);
            }
        }, {
            isWallToolActive: this.options.isWallToolActive
        });

        // Початкове малювання
        this.redraw();
    }

    initWallDrawingHandler() {
        // Initialize wall drawing handler
        this.wallDrawingHandler = new WallDrawingHandler(this.canvas, this.mouseHandler, {
            wallThickness: this.options.wallThickness,
            wallThicknessInCm: this.options.wallThicknessInCm,
            pixelsPerCm: this.options.pixelsPerCm,
            cellSize: this.options.cellSize,
            isWallToolActive: this.options.isWallToolActive
        }).init(this.hatchPattern);  // Передаємо hatchPattern

        // Set up callback to store created walls in Vuex
        this.wallDrawingHandler.setCallbacks({
            onWallCreated: (wall) => {
                // Dispatch to Vuex store
                if (this.options.onWallCreated) {
                    this.options.onWallCreated(wall);
                }
            },
            onDrawingStart: (startPoint) => {
                // Callback when drawing starts
                if (this.options.onDrawingStart) {
                    this.options.onDrawingStart(startPoint);
                }
            },
            onDrawingEnd: () => {
                // Callback when drawing ends
                if (this.options.onDrawingEnd) {
                    this.options.onDrawingEnd();
                }
            }
        });

        // Load existing walls from store
        if (this.options.existingWalls && Array.isArray(this.options.existingWalls)) {
            // Копіюємо стіни та встановлюємо заштриховку для кожної
            this.wallDrawingHandler.walls = this.options.existingWalls.map(wall => {
                // Створюємо копію стіни
                const wallCopy = new Wall({
                    id: wall.id,
                    x: wall.x,
                    y: wall.y,
                    width: wall.width,
                    height: wall.height,
                    thickness: wall.thickness || this.options.wallThicknessInCm,
                    angle: wall.angle || 0
                });

                // Встановлюємо заштриховку для стіни
                wallCopy.setHatchPattern(this.hatchPattern);

                // Зберігаємо з'єднані стіни, якщо вони є
                if (wall.connectedWalls && Array.isArray(wall.connectedWalls)) {
                    wallCopy.connectedWalls = [...wall.connectedWalls];
                }

                return wallCopy;
            });

            // Оновлюємо nextWallId, щоб уникнути дублювання ID
            if (this.wallDrawingHandler.walls.length > 0) {
                const maxId = Math.max(...this.wallDrawingHandler.walls.map(w => w.id));
                this.wallDrawingHandler.nextWallId = maxId + 1;
            }
        }
    }

    bindEvents() {
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this.canvas.addEventListener('tool:deselect', this.handleToolDeselect.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    unbindEvents() {
        this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.removeEventListener('mouseenter', this.handleMouseEnter.bind(this));
        this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this.canvas.removeEventListener('tool:deselect', this.handleToolDeselect.bind(this));
        window.removeEventListener('resize', this.handleResize.bind(this));
    }

    handleResize() {
        if (this.canvas) {
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;

            if (this.mouseHandler) {
                this.mouseHandler.offsetX = this.canvas.width / 2;
                this.mouseHandler.offsetY = this.canvas.height / 2;
                this.redraw();
            }
        }

        if (this.callbacks.onResize) {
            this.callbacks.onResize();
        }
    }

    handleMouseMove(e) {
        if (this.previewRect && this.options.isWallToolActive && this.options.isMouseOnCanvas) {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left);
            const mouseY = (e.clientY - rect.top);

            const worldX = (mouseX - this.mouseHandler.offsetX) / this.mouseHandler.scale;
            const worldY = (mouseY - this.mouseHandler.offsetY) / this.mouseHandler.scale;

            // Спочатку перевіряємо на магнітизацію до стін, якщо стіни є
            if (this.wallDrawingHandler && this.wallDrawingHandler.walls.length > 0) {
                // Отримуємо результат перевірки магнітизації
                const magnetizationResult = this.magnetizationHandler.magnetizeToWall(
                    this.previewRect,
                    this.wallDrawingHandler.walls,
                    worldX,
                    worldY,
                    this.mouseHandler.scale
                );

                // Якщо є результат магнітизації, застосовуємо його
                if (magnetizationResult) {
                    // Встановлюємо примагнічену позицію для PreviewRect
                    this.previewRect.setMagnetizedPosition(
                        magnetizationResult.x,
                        magnetizationResult.y,
                        magnetizationResult.angle
                    );
                } else {
                    // Якщо примагнічування немає, скидаємо статус і оновлюємо позицію звичайним чином
                    this.previewRect.resetMagnetization();
                    this.previewRect.updatePosition(worldX, worldY, this.options.cellSize);
                }
            } else {
                // Якщо стін немає, просто оновлюємо позицію
                this.previewRect.updatePosition(worldX, worldY, this.options.cellSize);
            }

            this.redraw();
        }

        if (this.callbacks.onMouseMove) {
            this.callbacks.onMouseMove(e);
        }
    }

    handleMouseEnter() {
        this.options.isMouseOnCanvas = true;

        if (this.options.isWallToolActive && this.wallDrawingHandler && !this.wallDrawingHandler.isDrawing) {
            this.previewRect.show();
            this.redraw();
        }

        if (this.callbacks.onMouseEnter) {
            this.callbacks.onMouseEnter();
        }
    }

    handleMouseLeave() {
        this.options.isMouseOnCanvas = false;

        this.previewRect.hide();
        this.redraw();

        if (this.callbacks.onMouseLeave) {
            this.callbacks.onMouseLeave();
        }
    }

    handleToolDeselect(e) {
        if (this.callbacks.onToolDeselect) {
            this.callbacks.onToolDeselect(e.detail);
        }
    }

    redraw() {
        if (this.mouseHandler) {
            this.mouseHandler._redraw();
        }
    }

    updatePreviewRect(wallThicknessInCm, pixelsPerCm) {
        if (this.previewRect) {
            const size = wallThicknessInCm * pixelsPerCm;
            this.previewRect.width = size;
            this.previewRect.height = size;

            if (this.previewRect.visible && this.hatchPattern) {
                this._updateHatchPatternForPreviewRect();
            }

            this.redraw();
        }
    }

    // Додали окремий метод для оновлення хетч-патерну PreviewRect
    _updateHatchPatternForPreviewRect() {
        if (!this.previewRect || !this.hatchPattern) return;

        const halfWidth = this.previewRect.width / 2;
        const halfHeight = this.previewRect.height / 2;

        // Якщо прямокутник повернутий, створюємо більшу область підсвічування
        if (this.previewRect.angle !== 0) {
            const diagonal = Math.sqrt(this.previewRect.width * this.previewRect.width +
                this.previewRect.height * this.previewRect.height);

            this.hatchPattern.setHighlightArea(
                this.previewRect.x - diagonal / 2,
                this.previewRect.y - diagonal / 2,
                diagonal,
                diagonal
            );
        } else {
            // Для неповернутого прямокутника використовуємо точні розміри
            this.hatchPattern.setHighlightArea(
                this.previewRect.x - halfWidth,
                this.previewRect.y - halfHeight,
                this.previewRect.width,
                this.previewRect.height
            );
        }
    }

    updateOptions(newOptions) {
        this.options = {
            ...this.options,
            ...newOptions
        };

        // Оновлюємо опції для MouseHandler
        if (this.mouseHandler) {
            this.mouseHandler.updateOptions({
                isWallToolActive: this.options.isWallToolActive
            });
        }

        // Оновлюємо опції для WallDrawingHandler
        if (this.wallDrawingHandler) {
            this.wallDrawingHandler.updateOptions(newOptions);
        }

        // Оновлюємо опції для MagnetizationHandler
        if (this.magnetizationHandler) {
            this.magnetizationHandler.updateOptions({
                magneticThreshold: this.options.magneticThreshold,
                cellSize: this.options.cellSize
            });
        }
    }

    setCallbacks(callbacks) {
        this.callbacks = {
            ...this.callbacks,
            ...callbacks
        };
    }

    destroy() {
        this.unbindEvents();

        if (this.wallDrawingHandler) {
            this.wallDrawingHandler.destroy();
        }

        this.grid = null;
        this.mouseHandler = null;
        this.previewRect = null;
        this.hatchPattern = null;
        this.wallDrawingHandler = null;
        this.magnetizationHandler = null;
    }
}