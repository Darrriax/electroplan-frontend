// RoomDetector.js - Utility class for detecting and managing rooms
export default class RoomDetector {
    constructor(store) {
        this.store = store;
    }

    // Check if walls form a closed loop
    detectRoom(walls) {
        if (!walls || walls.length < 3) return null;

        // Create adjacency map for all wall endpoints
        const adjacencyMap = this.createAdjacencyMap(walls);
        
        // Find all possible boundary cycles
        const boundaries = this.findBoundaries(walls, adjacencyMap);
        
        if (boundaries.length === 0) return null;

        // Return the largest valid boundary
        return boundaries.reduce((best, current) => {
            return current.area > best.area ? current : best;
        });
    }

    // Create a map of all connected points and their walls
    createAdjacencyMap(walls) {
        const adjacencyMap = new Map();

        walls.forEach(wall => {
            const startKey = this.getPointKey(wall.start);
            const endKey = this.getPointKey(wall.end);

            if (!adjacencyMap.has(startKey)) {
                adjacencyMap.set(startKey, { point: wall.start, connections: new Map() });
            }
            if (!adjacencyMap.has(endKey)) {
                adjacencyMap.set(endKey, { point: wall.end, connections: new Map() });
            }

            // Add bidirectional connections with wall references
            adjacencyMap.get(startKey).connections.set(endKey, wall);
            adjacencyMap.get(endKey).connections.set(startKey, wall);
        });

        return adjacencyMap;
    }

    // Find all possible room boundaries
    findBoundaries(walls, adjacencyMap) {
        const boundaries = [];
        const processedCombos = new Set();

        // Try each wall as a potential starting edge
        walls.forEach(startWall => {
            // Try both directions of the wall
            [
                { start: startWall.start, end: startWall.end },
                { start: startWall.end, end: startWall.start }
            ].forEach(({ start, end }) => {
                const startKey = this.getPointKey(start);
                const endKey = this.getPointKey(end);
                const comboKey = `${startWall.id}:${startKey}`;

                if (processedCombos.has(comboKey)) return;

                const boundary = this.traceBoundary(start, end, adjacencyMap, new Set([startWall.id]));
                if (boundary) {
                    const area = this.calculateArea(boundary.points);
                    if (area > 0.1) { // Minimum area threshold
                        boundaries.push({
                            points: boundary.points,
                            walls: boundary.walls,
                            area: area
                        });

                        // Mark this boundary's wall combinations as processed
                        boundary.walls.forEach(w => {
                            processedCombos.add(`${w.id}:${this.getPointKey(w.start)}`);
                            processedCombos.add(`${w.id}:${this.getPointKey(w.end)}`);
                        });
                    }
                }
            });
        });

        return boundaries;
    }

    // Trace a boundary starting from a point and direction
    traceBoundary(startPoint, nextPoint, adjacencyMap, usedWalls) {
        const points = [startPoint];
        const walls = [];
        let currentPoint = nextPoint;
        const maxSteps = 50; // Safety limit for very complex rooms
        let steps = 0;

        while (steps < maxSteps) {
            steps++;
            points.push(currentPoint);

            // Get all possible next points
            const currentKey = this.getPointKey(currentPoint);
            const node = adjacencyMap.get(currentKey);
            
            if (!node) break;

            // Find the next unvisited connection
            let foundNext = false;
            for (const [nextKey, wall] of node.connections) {
                if (usedWalls.has(wall.id)) {
                    // If we're back at start and have a valid boundary
                    if (this.pointsAreEqual(currentPoint, startPoint) && points.length >= 3) {
                        return {
                            points: points,
                            walls: Array.from(usedWalls).map(id => 
                                walls.find(w => w.id === id) || wall
                            )
                        };
                    }
                    continue;
                }

                // Try this connection
                usedWalls.add(wall.id);
                walls.push(wall);
                const nextPoint = adjacencyMap.get(nextKey).point;
                
                const result = this.traceBoundary(startPoint, nextPoint, adjacencyMap, usedWalls);
                if (result) return result;

                // Backtrack
                usedWalls.delete(wall.id);
                walls.pop();
            }

            if (!foundNext) break;
        }

        return null;
    }

    // Get a unique key for a point
    getPointKey(point) {
        return `${Math.round(point.x)},${Math.round(point.y)}`;
    }

    // Calculate area of the room using the shoelace formula
    calculateArea(points) {
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area) / 2 / 10000; // Convert to square meters
    }

    // Helper method to check if two points are equal
    pointsAreEqual(p1, p2) {
        return Math.abs(p1.x - p2.x) < 0.1 && Math.abs(p1.y - p2.y) < 0.1;
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