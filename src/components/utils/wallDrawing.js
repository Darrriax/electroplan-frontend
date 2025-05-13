// wallDrawing.js - Core drawing functionality for walls
import WallConnectionManager from './wallConnection.js';

// Constants
const GRID_SIZE = 10; // Grid size in pixels
const ROOM_COLORS = [
    'rgba(255, 230, 200, 0.3)', // Light orange
];
const WALL_FILL_COLOR = 'rgba(220, 220, 220, 0.8)'; // Light gray fill for walls
const WALL_STROKE_COLOR = '#333'; // Dark gray stroke for walls
const TEMP_WALL_FILL_COLOR = 'rgba(200, 220, 255, 0.6)'; // Light blue for temp walls
const TEMP_WALL_STROKE_COLOR = '#3366cc'; // Blue stroke for temp walls

// Alignment constants
const ALIGNMENT_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]; // Angles for alignment in degrees
const ALIGNMENT_TOLERANCE = 5; // Degrees of tolerance for alignment
const ALIGNMENT_LINE_LENGTH = 1000; // Length of alignment guide lines

export default class WallDrawingManager {
    constructor(canvas, store) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.store = store;

        // Create wall connection manager
        this.connectionManager = new WallConnectionManager();

        // Wall drawing state
        this.isDrawing = false;
        this.startPoint = null;
        this.currentPoint = null;
        this.magnetPoint = null;
        this.walls = [];
        this.rooms = [];
        this.alignmentGuides = null; // Store alignment guides when drawing
        this.angleDisplay = null; // Store angle information for display

        // Binding methods
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);

        // Initialize
        this.setupCanvas();
        this.attachEvents();
    }

    setupCanvas() {
        // Set canvas to fill its container
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));

        // Set initial canvas styles
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.offsetWidth;
        this.canvas.height = container.offsetHeight;
        this.draw(); // Redraw everything when resizing
    }

    attachEvents() {
        this.canvas.addEventListener('mousedown', this.onMouseDown);
        this.canvas.addEventListener('mousemove', this.onMouseMove);
        this.canvas.addEventListener('mouseup', this.onMouseUp);
    }

    removeEvents() {
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mouseup', this.onMouseUp);
    }

    // Event handlers
    onMouseDown(e) {
        if (this.store.state.project.currentTool !== 'wall') return;

        // Cancel drawing if right mouse button is clicked
        if (e.button === 2) {
            this.isDrawing = false;
            this.startPoint = null;
            this.alignmentGuides = null;
            this.angleDisplay = null;
            this.draw();
            return;
        }

        const point = this.getMousePos(e);
        this.isDrawing = true;

        // If we have a magnet point, use it as the start point
        this.startPoint = this.magnetPoint || point;

        // If there's a magnet point and it's on a wall, prepare for wall connection
        if (this.magnetPoint && this.magnetPointWall) {
            // This will be used later to connect walls
            this.startConnection = {
                wall: this.magnetPointWall,
                point: this.magnetPoint,
                isEnd: this.magnetIsEnd
            };
        } else {
            this.startConnection = null;
        }

        // Initialize alignment guides
        this.calculateAlignmentGuides(this.startPoint);

        // Initialize angle display if we're starting from an existing wall
        if (this.startConnection) {
            this.initAngleDisplay(this.startConnection.wall);
        }

        this.draw();
    }

    onMouseMove(e) {
        const point = this.getMousePos(e);
        this.currentPoint = point;

        // Check if we should snap to existing walls
        this.magnetPoint = null;
        this.magnetPointWall = null;

        // Only check for magnet points if we're using the wall tool
        if (this.store.state.project.currentTool === 'wall') {
            // Get wall thickness for magnetization calculations
            const wallThickness = this.store.getters['walls/defaultThickness'] / 100; // Convert mm to canvas units

            // Check if we need to snap to existing walls
            for (const wall of this.walls) {
                // Check if point is near wall start or end
                if (this.distance(point, wall.start) < 10) {
                    this.magnetPoint = { ...wall.start };
                    this.magnetPointWall = wall;
                    this.magnetIsEnd = false;
                    break;
                }
                if (this.distance(point, wall.end) < 10) {
                    this.magnetPoint = { ...wall.end };
                    this.magnetPointWall = wall;
                    this.magnetIsEnd = true;
                    break;
                }

                // Check if point is near wall edges
                const snapPoint = this.getPointOnWall(point, wall);
                if (snapPoint) {
                    this.magnetPoint = snapPoint;
                    this.magnetPointWall = wall;
                    this.magnetIsEnd = null; // Not at an endpoint
                    break;
                }
            }

            // Update angle display if we're drawing
            if (this.isDrawing && this.angleDisplay) {
                this.updateAngleDisplay(point);
            }
        }

        this.draw();
    }

    onMouseUp(e) {
        if (!this.isDrawing) return;

        // Cancel drawing if right mouse button is clicked
        if (e.button === 2) {
            this.isDrawing = false;
            this.startPoint = null;
            this.alignmentGuides = null;
            this.angleDisplay = null;
            this.draw();
            return;
        }

        const endPoint = this.magnetPoint || this.currentPoint;

        // Only create wall if start and end points are different enough
        if (this.distance(this.startPoint, endPoint) > 5) {
            // Create a new wall
            const wallThickness = this.store.getters['walls/defaultThickness'] / 10; // Adjusted thickness conversion
            const newWall = {
                id: Date.now().toString(),
                start: { ...this.startPoint },
                end: { ...endPoint },
                thickness: wallThickness
            };

            // Check if we can merge with an existing wall (same axis extension)
            let merged = false;

            if (this.startConnection) {
                // Check if the new wall extends an existing wall along the same axis
                const connectedWall = this.startConnection.wall;
                merged = this.connectionManager.tryMergeWalls(connectedWall, newWall, this.startConnection.isEnd);
            }

            if (this.magnetPointWall && this.magnetPoint && !merged) {
                // Try to merge with the wall we're connecting to at the end point
                merged = this.connectionManager.tryMergeWalls(this.magnetPointWall, newWall, this.magnetIsEnd);
            }

            if (!merged) {
                // Connect walls if needed but no merging occurred
                if (this.startConnection) {
                    const splitWall = this.connectionManager.connectWalls(newWall, this.startConnection);
                    if (splitWall) {
                        this.walls.push(splitWall);
                    }
                }

                if (this.magnetPointWall && this.magnetPoint) {
                    const splitWall = this.connectionManager.connectWalls(newWall, {
                        wall: this.magnetPointWall,
                        point: this.magnetPoint,
                        isEnd: this.magnetIsEnd
                    }, true); // End point connection

                    if (splitWall) {
                        this.walls.push(splitWall);
                    }
                }

                // Add the wall to our collection
                this.walls.push(newWall);
            }

            // Update rooms
            this.detectRooms();

            // Save to store
            this.saveWallsToStore();
        }

        // Reset drawing state
        this.isDrawing = false;
        this.startPoint = null;
        this.startConnection = null;
        this.alignmentGuides = null;
        this.angleDisplay = null;

        this.draw();
    }

    // Calculate the coordinates of a rectangle given start, end points and thickness
    calculateWallRectangle(start, end, thickness) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        // Avoid division by zero
        if (length < 0.001) return null;

        // Calculate the unit normal vector (perpendicular to wall)
        const nx = -dy / length;
        const ny = dx / length;

        // Calculate half thickness
        const halfThick = thickness / 2;

        // Calculate the four corners of the rectangle
        return [
            { x: start.x + nx * halfThick, y: start.y + ny * halfThick },
            { x: end.x + nx * halfThick, y: end.y + ny * halfThick },
            { x: end.x - nx * halfThick, y: end.y - ny * halfThick },
            { x: start.x - nx * halfThick, y: start.y - ny * halfThick }
        ];
    }

    drawWalls() {
        // Create a map to track drawn wall connections
        const drawnConnections = new Map();

        this.walls.forEach(wall => {
            // Find all walls connected to this wall
            const connectedWalls = this.walls.filter(otherWall =>
                otherWall.id !== wall.id && this.connectionManager.isWallsConnected(wall, otherWall)
            );

            // Calculate wall rectangle coordinates
            const rect = this.calculateWallRectangle(wall.start, wall.end, wall.thickness);
            if (!rect) return;

            // If wall has connections, handle them specially
            if (connectedWalls.length > 0) {
                this.connectionManager.drawWallWithConnections(this.ctx, wall, connectedWalls, drawnConnections);
            } else {
                // Draw simple wall with no connections
                this.drawSimpleWall(wall, rect);
            }

            // Draw the dimension lines and text
            this.drawWallDimension(wall);
        });
    }

    // Draw a simple wall with no connections
    drawSimpleWall(wall, rect) {
        this.ctx.fillStyle = WALL_FILL_COLOR;
        this.ctx.strokeStyle = WALL_STROKE_COLOR;
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        this.ctx.moveTo(rect[0].x, rect[0].y);
        this.ctx.lineTo(rect[1].x, rect[1].y);
        this.ctx.lineTo(rect[2].x, rect[2].y);
        this.ctx.lineTo(rect[3].x, rect[3].y);
        this.ctx.closePath();

        this.ctx.fill();
        this.ctx.stroke();
    }



    // Alignment guide calculation
    calculateAlignmentGuides(startPoint) {
        this.alignmentGuides = {
            horizontal: { y: startPoint.y },
            vertical: { x: startPoint.x },
            diagonal45: { offset: startPoint.y - startPoint.x },
            diagonal135: { offset: startPoint.y + startPoint.x }
        };
    }

    // Calculate angle between walls for display
    initAngleDisplay(connectedWall) {
        const dx = connectedWall.end.x - connectedWall.start.x;
        const dy = connectedWall.end.y - connectedWall.start.y;

        // Calculate angle of the connected wall
        const connectedAngle = Math.atan2(dy, dx);

        this.angleDisplay = {
            connectedWall,
            connectedAngle,
            currentAngle: null,
            angle: null,
            point: this.startPoint
        };
    }

    updateAngleDisplay(currentPoint) {
        if (!this.angleDisplay) return;

        // Calculate current angle
        const dx = currentPoint.x - this.startPoint.x;
        const dy = currentPoint.y - this.startPoint.y;
        const currentAngle = Math.atan2(dy, dx);

        // Calculate angle between walls (always use the smaller angle)
        let angle = Math.abs(currentAngle - this.angleDisplay.connectedAngle);
        if (angle > Math.PI) {
            angle = 2 * Math.PI - angle;
        }

        // Convert to degrees
        const angleDegrees = (angle * 180 / Math.PI).toFixed(0);

        this.angleDisplay.currentAngle = currentAngle;
        this.angleDisplay.angle = angleDegrees;
    }

    // Room detection logic
    detectRooms() {
        // Reset rooms collection
        const oldRooms = [...this.rooms]; // Save previous rooms to maintain positions
        this.rooms = [];

        // Find all possible paths
        const paths = this.findClosedPaths();

        // Filter duplicate paths (same room detected multiple times)
        const uniquePaths = [];

        paths.forEach(path => {
            // Check if this path is already in uniquePaths
            const isDuplicate = uniquePaths.some(existingPath =>
                this.arePathsEquivalent(path, existingPath)
            );

            if (!isDuplicate) {
                uniquePaths.push(path);
            }
        });

        // For each unique path, calculate area and create room
        uniquePaths.forEach((path, index) => {
            const area = this.calculatePolygonArea(path);
            if (area > 0) { // Only positive areas (clockwise paths)
                // Check if this room already existed (to maintain label position)
                const existingRoom = oldRooms.find(room =>
                    this.arePathsEquivalent(room.path, path)
                );

                const color = ROOM_COLORS[index % ROOM_COLORS.length];

                if (existingRoom) {
                    // Keep the same ID and labelPosition if room existed before
                    this.rooms.push({
                        id: existingRoom.id,
                        path,
                        area: (area / 100).toFixed(2), // Convert to square meters
                        color,
                        labelPosition: existingRoom.labelPosition
                    });
                } else {
                    // Calculate centroid for new room
                    const centroid = this.calculatePolygonCentroid(path);

                    this.rooms.push({
                        id: `room_${Date.now()}_${index}`,
                        path,
                        area: (area / 100).toFixed(2), // Convert to square meters
                        color,
                        labelPosition: centroid
                    });
                }
            }
        });
    }

    arePathsEquivalent(path1, path2) {
        if (path1.length !== path2.length) return false;

        // Create a set of point strings for efficient comparison
        const pointStrings1 = path1.map(p => `${p.x},${p.y}`);
        const pointStrings2 = path2.map(p => `${p.x},${p.y}`);

        // Check if all points in path1 exist in path2
        return pointStrings1.every(p => pointStrings2.includes(p));
    }

    findClosedPaths() {
        // Get all wall endpoints as vertices
        const vertices = new Map();

        // Create a graph representation
        this.walls.forEach(wall => {
            const startKey = `${wall.start.x},${wall.start.y}`;
            const endKey = `${wall.end.x},${wall.end.y}`;

            if (!vertices.has(startKey)) {
                vertices.set(startKey, []);
            }
            if (!vertices.has(endKey)) {
                vertices.set(endKey, []);
            }

            vertices.get(startKey).push({ point: wall.end, key: endKey });
            vertices.get(endKey).push({ point: wall.start, key: startKey });
        });

        // Find all cycles (closed paths) using DFS
        const paths = [];
        const visited = new Set();

        for (const [startKey, neighbors] of vertices.entries()) {
            if (neighbors.length > 1) {
                this.findCycles(startKey, startKey, vertices, [this.keyToPoint(startKey)], new Set(), paths);
            }
        }

        return paths;
    }

    findCycles(startKey, currentKey, graph, path, visited, cycles, depth = 0) {
        if (depth > 0 && currentKey === startKey && path.length > 2) {
            // Found a cycle
            cycles.push([...path]);
            return;
        }

        if (visited.has(currentKey)) return;
        visited.add(currentKey);

        // Visit neighbors
        const neighbors = graph.get(currentKey) || [];
        for (const neighbor of neighbors) {
            path.push(this.keyToPoint(neighbor.key));
            this.findCycles(startKey, neighbor.key, graph, path, new Set([...visited]), cycles, depth + 1);
            path.pop();
        }
    }

    keyToPoint(key) {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
    }

    calculatePolygonArea(vertices) {
        let area = 0;
        const n = vertices.length;

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += vertices[i].x * vertices[j].y;
            area -= vertices[j].x * vertices[i].y;
        }

        return Math.abs(area) / 2;
    }

    // Helper methods for wall drawing
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Snap to grid if needed
        return {
            x: Math.round(x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(y / GRID_SIZE) * GRID_SIZE
        };
    }

    distance(p1, p2) {
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }

    getPointOnWall(point, wall) {
        // Check if point is on the wall line
        const distToLine = this.distanceToLine(point, wall.start, wall.end);
        if (distToLine > 10) return null;

        // Project point onto line
        const projection = this.projectPointOnLine(point, wall.start, wall.end);

        // Check if projection is on the segment
        const lineLength = this.distance(wall.start, wall.end);
        const startToProj = this.distance(wall.start, projection);
        const endToProj = this.distance(wall.end, projection);

        if (startToProj <= lineLength && endToProj <= lineLength) {
            return projection;
        }

        return null;
    }

    distanceToLine(point, lineStart, lineEnd) {
        // Calculate distance from point to line segment
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;

        // If it's a point rather than a line
        if (dx === 0 && dy === 0) {
            return this.distance(point, lineStart);
        }

        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);

        if (t < 0) {
            return this.distance(point, lineStart);
        }
        if (t > 1) {
            return this.distance(point, lineEnd);
        }

        const projection = {
            x: lineStart.x + t * dx,
            y: lineStart.y + t * dy
        };

        return this.distance(point, projection);
    }

    projectPointOnLine(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;

        // If it's a point rather than a line
        if (dx === 0 && dy === 0) {
            return { ...lineStart };
        }

        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);

        return {
            x: lineStart.x + t * dx,
            y: lineStart.y + t * dy
        };
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.drawGrid();

        // Draw rooms
        this.drawRooms();

        // Draw existing walls
        this.drawWalls();

        // Draw alignment guides if we're in drawing mode
        if (this.isDrawing && this.alignmentGuides) {
            this.drawAlignmentGuides();
        }

        // Draw angle display if we're drawing from an existing wall
        if (this.isDrawing && this.angleDisplay && this.angleDisplay.angle) {
            this.drawAngleIndicator();
        }

        // Draw wall being created if in drawing mode
        if (this.isDrawing && this.startPoint && this.currentPoint) {
            this.drawTemporaryWall();
        }

        // Draw magnet indicator (if we're hovering near an existing wall)
        if (this.magnetPoint && this.store.state.project.currentTool === 'wall') {
            this.drawMagnetPoint();
        }

        // Draw wall preview cursor if wall tool is active
        if (this.store.state.project.currentTool === 'wall' && !this.isDrawing) {
            this.drawWallPreview();
        }
    }

    drawGrid() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Small grid lines
        this.ctx.strokeStyle = '#eee';
        this.ctx.lineWidth = 1.5;

        // Draw vertical small grid lines
        for (let x = 0; x < width; x += GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        // Draw horizontal small grid lines
        for (let y = 0; y < height; y += GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        // Draw larger grid lines (10x size) with darker color
        const LARGE_GRID_SIZE = GRID_SIZE * 10;
        this.ctx.strokeStyle = '#aaa';
        this.ctx.lineWidth = 1;

        // Draw vertical large grid lines
        for (let x = 0; x < width; x += LARGE_GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        // Draw horizontal large grid lines
        for (let y = 0; y < height; y += LARGE_GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }

    drawWallDimension(wall) {
        const midPoint = {
            x: (wall.start.x + wall.end.x) / 2,
            y: (wall.start.y + wall.end.y) / 2
        };

        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        // Only draw dimension if wall is long enough
        if (length < 20) return;

        // Calculate normal vector for offset direction
        const nx = -dy / length;
        const ny = dx / length;

        // Offset for dimension line (perpendicular to wall)
        const offset = 15 + wall.thickness / 2;

        // Draw dimension line
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 0.5;

        // Start arrow
        this.ctx.beginPath();
        this.ctx.moveTo(
            wall.start.x + nx * offset,
            wall.start.y + ny * offset
        );
        this.ctx.lineTo(
            wall.start.x + nx * (offset - 5) - dx * 0.03,
            wall.start.y + ny * (offset - 5) - dy * 0.03
        );
        this.ctx.stroke();

        // End arrow
        this.ctx.beginPath();
        this.ctx.moveTo(
            wall.end.x + nx * offset,
            wall.end.y + ny * offset
        );
        this.ctx.lineTo(
            wall.end.x + nx * (offset - 5) + dx * 0.03,
            wall.end.y + ny * (offset - 5) + dy * 0.03
        );
        this.ctx.stroke();

        // Main dimension line
        this.ctx.beginPath();
        this.ctx.moveTo(
            wall.start.x + nx * offset,
            wall.start.y + ny * offset
        );
        this.ctx.lineTo(
            wall.end.x + nx * offset,
            wall.end.y + ny * offset
        );
        this.ctx.stroke();

        // Draw length text
        const lengthInMeters = (length / 100).toFixed(2);
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#333';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Background for text
        const textWidth = this.ctx.measureText(lengthInMeters + ' m').width;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fillRect(
            midPoint.x + nx * offset - textWidth / 2 - 2,
            midPoint.y + ny * offset - 8,
            textWidth + 4,
            16
        );

        // Text
        this.ctx.fillStyle = '#333';
        this.ctx.fillText(
            `${lengthInMeters} m`,
            midPoint.x + nx * offset,
            midPoint.y + ny * offset
        );
    }

    drawRooms() {
        this.rooms.forEach(room => {
            if (!room.path || room.path.length < 3) return;

            // Fill the room with color only
            this.ctx.fillStyle = room.color;
            this.ctx.beginPath();
            this.ctx.moveTo(room.path[0].x, room.path[0].y);

            for (let i = 1; i < room.path.length; i++) {
                this.ctx.lineTo(room.path[i].x, room.path[i].y);
            }

            this.ctx.closePath();
            this.ctx.fill();

            // No area calculation or text display
        });
    }


    calculatePolygonCentroid(points) {
        let area = 0;
        let cx = 0;
        let cy = 0;

        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            const cross = points[i].x * points[j].y - points[j].x * points[i].y;

            area += cross;
            cx += (points[i].x + points[j].x) * cross;
            cy += (points[i].y + points[j].y) * cross;
        }

        area = area / 2;

        // Avoid division by zero
        if (Math.abs(area) < 0.001) {
            // Fallback to simple average if area calculation fails
            return this.calculateSimpleCentroid(points);
        }

        cx = cx / (6 * area);
        cy = cy / (6 * area);

        return {
            x: Math.abs(cx),
            y: Math.abs(cy)
        };
    }

    calculateSimpleCentroid(points) {
        let sumX = 0;
        let sumY = 0;

        points.forEach(point => {
            sumX += point.x;
            sumY += point.y;
        });

        return {
            x: sumX / points.length,
            y: sumY / points.length
        };
    }

    drawAlignmentGuides() {
        if (!this.currentPoint || !this.alignmentGuides) return;

        this.ctx.strokeStyle = 'rgba(0, 150, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 3]);

        // Horizontal guide
        this.ctx.beginPath();
        this.ctx.moveTo(this.startPoint.x - ALIGNMENT_LINE_LENGTH, this.alignmentGuides.horizontal.y);
        this.ctx.lineTo(this.startPoint.x + ALIGNMENT_LINE_LENGTH, this.alignmentGuides.horizontal.y);
        this.ctx.stroke();

        // Vertical guide
        this.ctx.beginPath();
        this.ctx.moveTo(this.alignmentGuides.vertical.x, this.startPoint.y - ALIGNMENT_LINE_LENGTH);
        this.ctx.lineTo(this.alignmentGuides.vertical.x, this.startPoint.y + ALIGNMENT_LINE_LENGTH);
        this.ctx.stroke();

        // 45° diagonal guide
        this.ctx.beginPath();
        let x1 = this.startPoint.x - ALIGNMENT_LINE_LENGTH;
        let y1 = this.alignmentGuides.diagonal45.offset + x1;
        let x2 = this.startPoint.x + ALIGNMENT_LINE_LENGTH;
        let y2 = this.alignmentGuides.diagonal45.offset + x2;
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        // 135° diagonal guide
        this.ctx.beginPath();
        x1 = this.startPoint.x - ALIGNMENT_LINE_LENGTH;
        y1 = this.alignmentGuides.diagonal135.offset - x1;
        x2 = this.startPoint.x + ALIGNMENT_LINE_LENGTH;
        y2 = this.alignmentGuides.diagonal135.offset - x2;
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        this.ctx.setLineDash([]);
    }

    drawAngleIndicator() {
        if (!this.angleDisplay || !this.currentPoint) return;

        const startX = this.angleDisplay.point.x;
        const startY = this.angleDisplay.point.y;

        // Calculate radius for arc
        const radius = 30;

        // Draw arc
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
        this.ctx.lineWidth = 2;

        // Draw arc between the two angles
        const startAngle = this.angleDisplay.connectedAngle;
        const endAngle = this.angleDisplay.currentAngle;
        this.ctx.arc(startX, startY, radius, Math.min(startAngle, endAngle), Math.max(startAngle, endAngle));
        this.ctx.stroke();

        // Draw angle text
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillStyle = 'rgba(255, 50, 50, 0.9)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Calculate position for text (midway between the angles)
        const midAngle = (startAngle + endAngle) / 2;
        const textX = startX + (radius + 10) * Math.cos(midAngle);
        const textY = startY + (radius + 10) * Math.sin(midAngle);

        // Background for text
        const textWidth = this.ctx.measureText(`${this.angleDisplay.angle}°`).width;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fillRect(
            textX - textWidth / 2 - 2,
            textY - 8,
            textWidth + 4,
            16
        );

        // Text
        this.ctx.fillStyle = 'rgba(255, 50, 50, 0.9)';
        this.ctx.fillText(`${this.angleDisplay.angle}°`, textX, textY);
    }

    drawTemporaryWall() {
        const endPoint = this.magnetPoint || this.currentPoint;
        const wallThickness = this.store.getters['walls/defaultThickness'] / 10; // Adjusted thickness conversion

        // Draw the temporary wall
        this.ctx.strokeStyle = 'rgba(50, 50, 200, 0.6)';
        this.ctx.lineWidth = wallThickness;

        this.ctx.beginPath();
        this.ctx.moveTo(this.startPoint.x, this.startPoint.y);
        this.ctx.lineTo(endPoint.x, endPoint.y);
        this.ctx.stroke();

        // Draw dimension
        const dx = endPoint.x - this.startPoint.x;
        const dy = endPoint.y - this.startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 20) {
            const lengthInMeters = (length / 100).toFixed(2);
            const midPoint = {
                x: (this.startPoint.x + endPoint.x) / 2,
                y: (this.startPoint.y + endPoint.y) / 2
            };

            // Calculate normal vector for offset direction
            const nx = -dy / length;
            const ny = dx / length;

            // Offset for dimension line
            const offset = 15 + wallThickness / 2;

            this.ctx.font = '12px Arial';
            this.ctx.fillStyle = '#3366cc';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            // Background
            const textWidth = this.ctx.measureText(lengthInMeters + ' m').width;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.fillRect(
                midPoint.x + nx * offset - textWidth / 2 - 2,
                midPoint.y + ny * offset - 8,
                textWidth + 4,
                16
            );

            // Text
            this.ctx.fillStyle = '#3366cc';
            this.ctx.fillText(
                `${lengthInMeters} m`,
                midPoint.x + nx * offset,
                midPoint.y + ny * offset
            );
        }
    }

    drawWallPreview() {
        if (!this.currentPoint) return;

        const wallThickness = this.store.getters['walls/defaultThickness'] / 10; // Adjusted thickness conversion
        const halfThickness = wallThickness / 2;

        // Draw a square under the cursor representing wall thickness
        this.ctx.fillStyle = 'rgba(50, 50, 200, 0.3)';
        this.ctx.fillRect(
            this.currentPoint.x - halfThickness,
            this.currentPoint.y - halfThickness,
            wallThickness,
            wallThickness
        );

        // Draw outline
        this.ctx.strokeStyle = '#3366cc';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            this.currentPoint.x - halfThickness,
            this.currentPoint.y - halfThickness,
            wallThickness,
            wallThickness
        );
    }


    drawMagnetPoint() {
        // Draw a visual indicator for magnetic point
        this.ctx.fillStyle = '#3366cc';
        this.ctx.beginPath();
        this.ctx.arc(this.magnetPoint.x, this.magnetPoint.y, 5, 0, Math.PI * 2);
        this.ctx.fill();

        // Highlight the connection area
        this.ctx.strokeStyle = '#3366cc';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 3]);
        this.ctx.beginPath();
        this.ctx.arc(this.magnetPoint.x, this.magnetPoint.y, 10, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    // Store interaction
    saveWallsToStore() {
        // Convert walls and rooms to the format expected by store
        const wallElements = this.walls.map(wall => ({
            id: wall.id,
            type: 'wall',
            start: { x: wall.start.x, y: wall.start.y },
            end: { x: wall.end.x, y: wall.end.y },
            thickness: wall.thickness * 10 // Convert back to mm with adjusted ratio
        }));

        const roomElements = this.rooms.map(room => ({
            id: room.id,
            type: 'room',
            path: room.path,
            area: room.area,
            color: room.color
        }));

        // Dispatch to store
        this.store.commit('project/setElements', [...wallElements, ...roomElements]);
    }

    // Load data from store
    loadFromStore() {
        const elements = this.store.state.project.elements || [];

        // Reset collections
        this.walls = [];
        this.rooms = [];

        // Process elements
        elements.forEach(element => {
            if (element.type === 'wall') {
                this.walls.push({
                    id: element.id,
                    start: { x: element.start.x, y: element.start.y },
                    end: { x: element.end.x, y: element.end.y },
                    thickness: element.thickness / 10 // Convert mm to canvas units with adjusted ratio
                });
            } else if (element.type === 'room') {
                this.rooms.push({
                    id: element.id,
                    path: element.path,
                    area: element.area,
                    color: element.color
                });
            }
        });

        this.draw();
    }

    cleanup() {
        this.removeEvents();
    }
}