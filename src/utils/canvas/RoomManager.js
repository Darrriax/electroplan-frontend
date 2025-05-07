// utils/canvas/RoomManager.js
import { fabric } from 'fabric';

export class RoomManager {
    constructor(canvas, store) {
        this.canvas = canvas;
        this.store = store;
        this.rooms = [];
        this.roomObjects = {};
    }

    /**
     * Detects rooms by finding closed polygons formed by walls
     * @returns {Array} - Array of detected rooms
     */
    detectRooms() {
        const walls = this.store.state.walls.walls;
        if (!walls || walls.length < 3) {
            return []; // Need at least 3 walls to form a room
        }

        // Create a graph representation where vertices are wall endpoints
        const vertices = new Map();
        const edges = [];

        // Add wall endpoints as vertices and walls as edges
        walls.forEach(wall => {
            const startX = Math.round(wall.start.x * 10) / 10;
            const startY = Math.round(wall.start.y * 10) / 10;
            const endX = Math.round(wall.end.x * 10) / 10;
            const endY = Math.round(wall.end.y * 10) / 10;

            const startKey = `${startX.toFixed(1)},${startY.toFixed(1)}`;
            const endKey = `${endX.toFixed(1)},${endY.toFixed(1)}`;

            // Add edge
            const edge = {
                start: startKey,
                end: endKey,
                wall: wall
            };
            edges.push(edge);

            // Connect vertices to their edges
            vertices.get(startKey).edges.push(edge);
            vertices.get(endKey).edges.push(edge);
        });

        // Find cycles (potential rooms)
        const rooms = this.findCycles(vertices, edges);
        return rooms;
    }

    /**
     * Find cycles in a graph using DFS
     * @param {Map} vertices - Map of vertices
     * @param {Array} edges - Array of edges
     * @returns {Array} - Array of detected room cycles
     */
    findCycles(vertices, edges) {
        const cycles = [];
        const visited = new Set();

        // Helper function for DFS to find cycles
        const findCyclesDFS = (currentVertex, path, startVertex) => {
            // If we've come back to the start and path has at least 3 vertices
            if (currentVertex === startVertex && path.length >= 3) {
                // Check if this is a simple cycle (no repeated vertices except start/end)
                const uniqueVertices = new Set(path);
                if (uniqueVertices.size === path.length - 1) { // Corrected condition
                    cycles.push([...path, startVertex]);
                }
                return;
            }

            // Mark as visited during this DFS path
            visited.add(currentVertex);

            const vertex = vertices.get(currentVertex);
            if (!vertex) return;

            // Check all edges from this vertex
            for (const edge of vertex.edges) {
                const nextVertex = edge.start === currentVertex ? edge.end : edge.start;

                // Skip if we've already visited this vertex in this path
                if (path.includes(nextVertex) && nextVertex !== startVertex) continue;

                // Continue DFS
                findCyclesDFS(nextVertex, [...path, nextVertex], startVertex);
            }

            // Backtrack
            visited.delete(currentVertex);
        };

        // Start DFS from each vertex
        for (const [vertexKey] of vertices) {
            if (!visited.has(vertexKey)) {
                findCyclesDFS(vertexKey, [vertexKey], vertexKey);
            }
        }

        // Filter out larger cycles that contain smaller cycles
        const minimalCycles = this.filterMinimalCycles(cycles, vertices);

        // Convert cycles to room objects with coordinates and area
        return minimalCycles.map(cycle => {
            const points = cycle.map(vertexKey => vertices.get(vertexKey))
                .filter(vertex => vertex !== undefined);

            // Calculate room area
            const area = this.calculatePolygonArea(points);

            return {
                id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                vertices: points,
                area: area,
                points: points.map(p => ({x: p.x, y: p.y}))
            };
        });
    }

    /**
     * Filter out cycles that fully contain other cycles
     * @param {Array} cycles - Array of detected cycles
     * @param {Map} vertices - Map of vertices
     * @returns {Array} - Array of minimal cycles
     */
    filterMinimalCycles(cycles, vertices) {
        const uniqueCycles = [];
        const cycleSet = new Set();

        cycles.forEach(cycle => {
            // Normalize cycle by sorting vertices to ignore order
            const sorted = [...new Set(cycle.slice(0, -1))].sort(); // Remove duplicate start/end
            const key = sorted.join('|');
            if (!cycleSet.has(key)) {
                cycleSet.add(key);
                uniqueCycles.push(cycle);
            }
        });

        return uniqueCycles;
    }

    /**
     * Calculate the area of a polygon in square meters
     * @param {Array} points - Array of {x, y} points
     * @returns {number} - Area in square meters
     */
    calculatePolygonArea(points) {
        if (points.length < 3) return 0;

        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }

        area = Math.abs(area) / 2;

        // Convert from canvas units to square meters
        // Each canvas unit is 1/10th of a mm, so divide by 10 to get mm
        // Then by 1000 to get meters, then square it
        return Number(((area / 10 / 1000) ** 2).toFixed(2));
    }

    /**
     * Render rooms on the canvas
     */
    renderRooms() {
        // Clear existing room objects
        this.clearRooms();

        // Detect and get rooms
        const rooms = this.detectRooms();
        this.rooms = rooms;

        // Render each room
        rooms.forEach(room => {
            this.renderRoom(room);
        });

        this.canvas.requestRenderAll();
    }

    /**
     * Render a single room on the canvas
     * @param {Object} room - Room object with vertices and area
     */
    renderRoom(room) {
        // Create points array for polygon
        const points = room.points.flatMap(p => [p.x, p.y]);

        // Create polygon for room
        const polygon = new fabric.Polygon(points, {
            fill: 'rgba(255, 255, 255, 0.6)',
            stroke: 'rgba(0, 0, 0, 0)',
            strokeWidth: 0,
            objectCaching: false,
            perPixelTargetFind: true,
            selectable: false,
            evented: false
        });

        // Find center of room for text placement
        const centerX = room.points.reduce((sum, p) => sum + p.x, 0) / room.points.length;
        const centerY = room.points.reduce((sum, p) => sum + p.y, 0) / room.points.length;

        // Create text showing area
        const text = new fabric.Text(`${room.area} м²`, {
            left: centerX,
            top: centerY,
            fontSize: 16,
            fill: '#333333',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
        });

        // Add to canvas
        this.canvas.add(polygon);
        this.canvas.add(text);

        // Move to background
        polygon.moveTo(1); // Just above canvas background

        // Store references for later removal
        this.roomObjects[room.id] = {
            polygon: polygon,
            text: text
        };
    }

    /**
     * Clear all room objects from canvas
     */
    clearRooms() {
        Object.values(this.roomObjects).forEach(obj => {
            this.canvas.remove(obj.polygon);
            this.canvas.remove(obj.text);
        });

        this.roomObjects = {};
    }

    /**
     * Update rooms after wall changes
     */
    updateRooms() {
        this.renderRooms();
    }
}