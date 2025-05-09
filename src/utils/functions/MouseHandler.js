// utils/functions/MouseHandler.js
export class MouseHandler {
    constructor(canvas, drawCallback, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.drawCallback = drawCallback;
        this.options = {
            isWallToolActive: false,
            ...options
        };

        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;

        // Початкове зміщення до центру канвасу
        this.offsetX = canvas.width / 2;
        this.offsetY = canvas.height / 2;
        this.scale = 1;

        this._bindEvents();
    }

    _bindEvents() {
        this.canvas.addEventListener('mousedown', this._onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this._onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this._onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
        this.canvas.addEventListener('contextmenu', this._onContextMenu.bind(this));

        // Додаємо обробник зміни розміру вікна для перерахунку центру
        window.addEventListener('resize', this._handleResize.bind(this));
    }

    _handleResize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this._redraw();
    }

    _onMouseDown(e) {
        // Якщо активний інструмент стіни, не дозволяємо переміщення
        if (this.options.isWallToolActive && e.button === 0) {
            return;
        }

        // Переміщення дозволено тільки коли не обрано жодного інструменту
        if (!this.options.isWallToolActive && e.button === 0) {
            this.isDragging = true;
            this.startX = e.offsetX;
            this.startY = e.offsetY;
        }
    }

    _onMouseMove(e) {
        if (!this.isDragging) return;

        const dx = e.offsetX - this.startX;
        const dy = e.offsetY - this.startY;

        this.startX = e.offsetX;
        this.startY = e.offsetY;

        this.offsetX += dx;
        this.offsetY += dy;

        this._redraw();
    }

    _onMouseUp() {
        this.isDragging = false;
    }

    _onWheel(e) {
        e.preventDefault();

        const zoomFactor = 0.1;
        const direction = e.deltaY > 0 ? -1 : 1;
        const factor = 1 + zoomFactor * direction;

        const mouseX = e.offsetX;
        const mouseY = e.offsetY;

        const newScale = this.scale * factor;

        // Центрування масштабування навколо курсора
        this.offsetX = mouseX - ((mouseX - this.offsetX) * (newScale / this.scale));
        this.offsetY = mouseY - ((mouseY - this.offsetY) * (newScale / this.scale));
        this.scale = newScale;

        this._redraw();
    }

    // Обробник клікання правою кнопкою миші - відміна активного інструменту
    _onContextMenu(e) {
        e.preventDefault(); // Відміняємо стандартне контекстне меню

        // Створюємо кастомну подію для відміни активного інструменту
        const customEvent = new CustomEvent('tool:deselect', {
            bubbles: true,
            detail: { mode: 'originalPlan' }
        });

        this.canvas.dispatchEvent(customEvent);
    }

    _redraw() {
        this.ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);
        this.drawCallback(this.ctx);
    }

    updateOptions(newOptions) {
        this.options = {
            ...this.options,
            ...newOptions
        };
    }

    resetView() {
        // Скидання до центрального положення
        this.offsetX = this.canvas.width / 2;
        this.offsetY = this.canvas.height / 2;
        this.scale = 1;
        this._redraw();
    }
}