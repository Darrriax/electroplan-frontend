export class WallSnapManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.walls = [];
    }

    /**
     * Додає стіну до списку для пошуку прив'язки.
     * @param {fabric.Rect} wall - Стіна, яку потрібно зареєструвати.
     */
    registerWall(wall) {
        this.walls.push(wall);
    }
}