export class WallSnapManager {
    constructor() {
        this.walls = [];
    }

    registerWall(wall) {
        this.walls.push(wall);
    }
}