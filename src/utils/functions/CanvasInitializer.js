// utils/functions/CanvasInitializer.js
import { Grid, MouseHandler, HatchPattern } from '../index';
import { PreviewRect } from '../entities/PreviewRect';

export class CanvasInitializer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = {
            virtualSize: 500000,
            pixelsPerCm: 1,
            cellSize: 10,
            ...options
        };

        this.grid = null;
        this.mouseHandler = null;
        this.previewRect = null;
        this.hatchPattern = null;

        this.callbacks = {
            onResize: null,
            onMouseMove: null,
            onMouseEnter: null,
            onMouseLeave: null
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
        this.previewRect = new PreviewRect(thickness, 'rgba(100, 100, 255, 0.5)', this.hatchPattern);

        // Встановлюємо розмір PreviewRect
        const size = this.options.wallThicknessInCm * this.options.pixelsPerCm;
        this.previewRect.width = size;
        this.previewRect.height = size;
        this.previewRect.visible = false;

        // Ініціалізуємо MouseHandler
        this.initMouseHandler();

        // Прив'язуємо обробники подій
        this.bindEvents();

        return this;
    }

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

            // Малюємо заштриховку та PreviewRect
            if (this.options.isWallToolActive) {
                // Спочатку малюємо заштриховку
                this.hatchPattern.draw(
                    ctx,
                    this.options.virtualSize,
                    this.options.virtualSize,
                    -this.options.virtualSize / 2,
                    -this.options.virtualSize / 2
                );

                // Потім малюємо PreviewRect
                this.previewRect.draw(ctx, this.options.pixelsPerCm);
            }
        });

        // Початкове малювання
        this.redraw();
    }

    bindEvents() {
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    unbindEvents() {
        this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.removeEventListener('mouseenter', this.handleMouseEnter.bind(this));
        this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
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

            this.previewRect.updatePosition(worldX, worldY, this.options.cellSize);
            this.redraw();
        }

        if (this.callbacks.onMouseMove) {
            this.callbacks.onMouseMove(e);
        }
    }

    handleMouseEnter() {
        this.options.isMouseOnCanvas = true;

        if (this.options.isWallToolActive) {
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
                const halfWidth = size / 2;
                const halfHeight = size / 2;

                this.hatchPattern.setHighlightArea(
                    this.previewRect.x - halfWidth,
                    this.previewRect.y - halfHeight,
                    size,
                    size
                );
            }

            this.redraw();
        }
    }

    updateOptions(newOptions) {
        this.options = {
            ...this.options,
            ...newOptions
        };
    }

    setCallbacks(callbacks) {
        this.callbacks = {
            ...this.callbacks,
            ...callbacks
        };
    }

    destroy() {
        this.unbindEvents();
        this.grid = null;
        this.mouseHandler = null;
        this.previewRect = null;
        this.hatchPattern = null;
    }
}