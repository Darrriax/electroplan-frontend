// RoomDetector.js - Utility class for detecting and managing rooms
export default class RoomDetector {
    constructor(store) {
        this.store = store;
    }

    // Check if walls form a closed loop
    detectRoom(walls) {
        if (!walls || walls.length < 3) return null;

        // Create a map of wall connections
        const connections = new Map();
        walls.forEach(wall => {
            const startKey = `${wall.start.x},${wall.start.y}`;
            const endKey = `${wall.end.x},${wall.end.y}`;
            
            if (!connections.has(startKey)) connections.set(startKey, []);
            if (!connections.has(endKey)) connections.set(endKey, []);
            
            connections.get(startKey).push(wall);
            connections.get(endKey).push(wall);
        });

        // Check if each point connects exactly two walls
        for (const [_, connectedWalls] of connections) {
            if (connectedWalls.length !== 2) {
                return null; // Not a closed loop
            }
        }

        // Get points in order
        const points = [];
        let currentWall = walls[0];
        let currentPoint = currentWall.start;
        const visited = new Set();

        while (!visited.has(currentWall.id)) {
            visited.add(currentWall.id);
            points.push(currentPoint);

            // Find next wall
            const endKey = `${currentWall.end.x},${currentWall.end.y}`;
            const connectedWalls = connections.get(endKey);
            const nextWall = connectedWalls.find(w => w.id !== currentWall.id);

            if (!nextWall) break;

            currentPoint = currentWall.end;
            currentWall = nextWall;
        }

        // Check if we've visited all walls and formed a closed loop
        if (visited.size !== walls.length) return null;

        return {
            points,
            area: this.calculateArea(points)
        };
    }

    // Calculate area of the room using the shoelace formula
    calculateArea(points) {
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area) / 2 / 100; // Convert to square meters
    }

    // Create a room object for the store
    createRoom(points, area) {
        return {
            id: `room_${Date.now()}`,
            type: 'room',
            points: points,
            area: area.toFixed(2),
            color: 'rgba(255, 255, 255, 0.3)' // Semi-transparent white
        };
    }
} 