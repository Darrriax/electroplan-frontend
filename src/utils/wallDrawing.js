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
        this.isPanning = false;
        this.startPoint = null;
        this.currentPoint = null;
        this.magnetPoint = null;
        this.panOffset = { x: 0, y: 0 };
        this.lastPanPosition = null;
        this.zoom = 1;
        this.walls = [];
        this.rooms = [];
        this.selectedWall = null; // Add selected wall tracking
        this.alignmentGuides = null;
        this.angleDisplay = null;

        // Door placement state
        this.doorPreview = null;
        this.doorMagnetWall = null;
        this.doorMagnetPoint = null;

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
        if (!this.store.state.project.currentTool) {
            const point = this.getMousePos(e);
            
            // First check if we're clicking control points of the selected wall
            if (this.selectedWall) {
                const controlPoints = this.getWallControlPoints(this.selectedWall);
                const clickRadius = 10;
                
                if (this.distance(point, controlPoints.start) < clickRadius) {
                    const sharedPoint = this.findSharedPoint(this.selectedWall.start);
                    this.draggedWall = { wall: this.selectedWall, point: 'start', sharedPoint };
                    this.canvas.style.cursor = 'pointer';
                    return;
                } else if (this.distance(point, controlPoints.end) < clickRadius) {
                    const sharedPoint = this.findSharedPoint(this.selectedWall.end);
                    this.draggedWall = { wall: this.selectedWall, point: 'end', sharedPoint };
                    this.canvas.style.cursor = 'pointer';
                    return;
                } else if (this.distance(point, controlPoints.middle) < clickRadius) {
                    this.draggedWall = { wall: this.selectedWall, point: 'middle' };
                    this.canvas.style.cursor = 'move';
                    return;
                }
            }

            // If not clicking control points, check for wall selection
            const clickedWall = this.getWallAtPoint(point);
            if (clickedWall) {
                this.selectedWall = clickedWall;
                this.draw();
                return;
            } else {
                this.selectedWall = null;
                this.draw();
            }

            // Handle panning
            if (e.button === 0) {
                this.isPanning = true;
                const rect = this.canvas.getBoundingClientRect();
                this.lastPanPosition = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                this.canvas.style.cursor = 'grabbing';
            }
        } else if (e.button === 2) { // Right mouse button
            this.isPanning = true;
            const rect = this.canvas.getBoundingClientRect();
            this.lastPanPosition = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            this.canvas.style.cursor = 'grabbing';
            return;
        }

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
        if (this.draggedWall) {
            const point = this.getMousePos(e);
            const wall = this.draggedWall.wall;
            
            if (this.draggedWall.point === 'middle') {
                // Apply constrained movement and adjust adjacent walls
                this.constrainMovement(wall, point);
                
                // Save wall positions to store after movement
                this.saveWallsToStore();
            } else if (this.draggedWall.point === 'start' || this.draggedWall.point === 'end') {
                // Handle endpoint dragging as before
                const sharedPoint = this.draggedWall.sharedPoint;
                sharedPoint.x = point.x;
                sharedPoint.y = point.y;
                
                sharedPoint.connectedWalls.forEach(connection => {
                    if (connection.isStart) {
                        connection.wall.start = sharedPoint;
                    } else {
                        connection.wall.end = sharedPoint;
                    }
                });
            }
            
            // Recalculate rooms after wall movement
            this.detectRooms();
            this.draw();
            return;
        }

        if (this.isPanning && this.lastPanPosition) {
            const rect = this.canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            
            this.panOffset.x += currentX - this.lastPanPosition.x;
            this.panOffset.y += currentY - this.lastPanPosition.y;
            
            this.lastPanPosition = { x: currentX, y: currentY };
            this.draw();
            return;
        }

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

        // Update cursor based on what's under it
        if (!this.draggedWall && !this.isPanning && !this.store.state.project.currentTool) {
            if (this.selectedWall) {
                const controlPoints = this.getWallControlPoints(this.selectedWall);
                const clickRadius = 10;
                
                if (this.distance(point, controlPoints.start) < clickRadius ||
                    this.distance(point, controlPoints.end) < clickRadius) {
                    this.canvas.style.cursor = 'pointer';
                } else if (this.distance(point, controlPoints.middle) < clickRadius) {
                    this.canvas.style.cursor = 'move';
                } else {
                    const wallUnderCursor = this.getWallAtPoint(point);
                    this.canvas.style.cursor = wallUnderCursor ? 'pointer' : 'default';
                }
            } else {
                const wallUnderCursor = this.getWallAtPoint(point);
                this.canvas.style.cursor = wallUnderCursor ? 'pointer' : 'default';
            }
        }

        if (this.store.state.project.currentTool === 'door') {
            this.updateDoorPreview(point);
        }

        this.draw();
    }

    updateConnectedWalls(wall, newPoint, isStart, updatedWalls) {
        const connectedWalls = this.walls.filter(otherWall => 
            !updatedWalls.has(otherWall.id) && 
            this.connectionManager.isWallsConnected(wall, otherWall)
        );

        connectedWalls.forEach(connectedWall => {
            // Check which point of the connected wall needs to be updated
            if (this.connectionManager.pointsAreEqual(
                isStart ? wall.start : wall.end,
                connectedWall.start
            )) {
                connectedWall.start = { ...newPoint };
                updatedWalls.add(connectedWall.id);
                this.updateConnectedWalls(connectedWall, newPoint, true, updatedWalls);
            }
            
            if (this.connectionManager.pointsAreEqual(
                isStart ? wall.start : wall.end,
                connectedWall.end
            )) {
                connectedWall.end = { ...newPoint };
                updatedWalls.add(connectedWall.id);
                this.updateConnectedWalls(connectedWall, newPoint, false, updatedWalls);
            }
        });
    }

    updateConnectedWallsFromMiddle(wall, dx, dy, updatedWalls) {
        const connectedWalls = this.walls.filter(otherWall => 
            !updatedWalls.has(otherWall.id) && 
            this.connectionManager.isWallsConnected(wall, otherWall)
        );

        connectedWalls.forEach(connectedWall => {
            // Move the connected wall
            connectedWall.start.x += dx;
            connectedWall.start.y += dy;
            connectedWall.end.x += dx;
            connectedWall.end.y += dy;
            
            updatedWalls.add(connectedWall.id);
            this.updateConnectedWallsFromMiddle(connectedWall, dx, dy, updatedWalls);
        });
    }

    onMouseUp(e) {
        if (this.draggedWall) {
            this.draggedWall = null;
            this.canvas.style.cursor = 'default';
            return;
        }
        
        if (this.isPanning) {
            this.isPanning = false;
            this.lastPanPosition = null;
            this.canvas.style.cursor = 'default';
            return;
        }

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
        // First draw all unselected walls
        this.walls.forEach(wall => {
            if (!this.selectedWall || wall.id !== this.selectedWall.id) {
                const rect = this.calculateWallRectangle(wall.start, wall.end, wall.thickness);
                if (!rect) return;
                this.drawSimpleWall(wall, rect);
                this.drawWallDimension(wall); // Add dimension to all walls
            }
        });

        // Then draw the selected wall on top if there is one
        if (this.selectedWall) {
            const rect = this.calculateWallRectangle(this.selectedWall.start, this.selectedWall.end, this.selectedWall.thickness);
            if (rect) {
                this.drawSimpleWall(this.selectedWall, rect);
                this.drawWallDimension(this.selectedWall); // Add dimension to selected wall
                this.drawWallControlPoints(this.selectedWall);
            }
        }
    }

    drawSimpleWall(wall, rect) {
        // Draw the wall itself
        this.ctx.fillStyle = WALL_FILL_COLOR;
        this.ctx.strokeStyle = wall === this.selectedWall ? '#2196F3' : WALL_STROKE_COLOR;
        this.ctx.lineWidth = wall === this.selectedWall ? 2 : 1;

        this.ctx.beginPath();
        this.ctx.moveTo(rect[0].x, rect[0].y);
        this.ctx.lineTo(rect[1].x, rect[1].y);
        this.ctx.lineTo(rect[2].x, rect[2].y);
        this.ctx.lineTo(rect[3].x, rect[3].y);
        this.ctx.closePath();

        this.ctx.fill();
        this.ctx.stroke();
    }

    drawWallControlPoints(wall) {
        if (!this.store.state.project.currentTool) {
            const controlPoints = this.getWallControlPoints(wall);
            
            // Draw control points with different colors and sizes
            [
                { point: controlPoints.start, color: '#4CAF50', size: 6 },
                { point: controlPoints.middle, color: '#2196F3', size: 8 },
                { point: controlPoints.end, color: '#4CAF50', size: 6 }
            ].forEach(({ point, color, size }) => {
                // Draw outer circle (white background)
                this.ctx.fillStyle = 'white';
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, size + 2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw inner circle (colored)
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
                this.ctx.fill();

                // Draw connection indicator if this point is shared
                const isSharedPoint = this.walls.some(otherWall => 
                    otherWall.id !== wall.id && (
                        (this.connectionManager.pointsAreEqual(point, otherWall.start) ||
                        this.connectionManager.pointsAreEqual(point, otherWall.end))
                    )
                );

                if (isSharedPoint) {
                    this.ctx.strokeStyle = color;
                    this.ctx.lineWidth = 1;
                    this.ctx.setLineDash([2, 2]);
                    this.ctx.beginPath();
                    this.ctx.arc(point.x, point.y, size + 4, 0, Math.PI * 2);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                }
            });
        }
    }

    getWallControlPoints(wall) {
        return {
            start: { ...wall.start },
            middle: {
                x: (wall.start.x + wall.end.x) / 2,
                y: (wall.start.y + wall.end.y) / 2
            },
            end: { ...wall.end }
        };
    }

    getWallAtPoint(point) {
        // Check if we're clicking on any wall
        for (const wall of this.walls) {
            const dx = wall.end.x - wall.start.x;
            const dy = wall.end.y - wall.start.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length === 0) continue;
            
            // Calculate the distance from point to the wall line
            const dist = Math.abs((dy * point.x - dx * point.y + wall.end.x * wall.start.y - wall.end.y * wall.start.x) / length);

            // Check if the point is within the wall's thickness
            if (dist > wall.thickness) continue;

            // Now check if the point is between the wall's endpoints
            const dotProduct = ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / length;
            
            // If dot product is between 0 and length, the point is between the endpoints
            if (dotProduct >= 0 && dotProduct <= length) {
                return wall;
            }
        }
        return null;
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

    updateAngleDisplay(point) {
        if (!this.angleDisplay || !this.startConnection) return;

        const connectedWall = this.startConnection.wall;
        const dx = point.x - this.startPoint.x;
        const dy = point.y - this.startPoint.y;
        
        // Create temporary wall for angle calculation
        const tempWall = {
            start: { ...this.startPoint },
            end: { x: point.x, y: point.y }
        };
        
        // Calculate angle between walls
        const angle = this.calculateWallAngle(connectedWall, tempWall, this.startPoint);
        
        this.angleDisplay.currentAngle = Math.atan2(dy, dx);
        this.angleDisplay.angle = angle;
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
    getMousePos(e, snapToGrid = true) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panOffset.x) / this.zoom;
        const y = (e.clientY - rect.top - this.panOffset.y) / this.zoom;

        if (snapToGrid) {
            return {
                x: Math.round(x / GRID_SIZE) * GRID_SIZE,
                y: Math.round(y / GRID_SIZE) * GRID_SIZE
            };
        }
        return { x, y };
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
        
        // Apply pan and zoom transformation
        this.ctx.save();
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);

        // Draw grid
        this.drawGrid();

        // Draw rooms
        this.drawRooms();

        // Draw existing walls
        this.drawWalls();

        // Draw placed doors
        this.drawPlacedDoors();

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
        
        // Draw door preview if in door placement mode
        if (this.store.state.project.currentTool === 'door') {
            this.drawDoorPreview();
        }

        // Draw angles for selected wall
        if (this.selectedWall) {
            const connectedWalls = this.findConnectedWalls(this.selectedWall);
            
            // Group connected walls by shared points
            const startConnections = connectedWalls.filter(wall => 
                this.distance(wall.start, this.selectedWall.start) < 1 ||
                this.distance(wall.end, this.selectedWall.start) < 1
            );
            
            const endConnections = connectedWalls.filter(wall => 
                this.distance(wall.start, this.selectedWall.end) < 1 ||
                this.distance(wall.end, this.selectedWall.end) < 1
            );

            // Draw angles at start point
            if (startConnections.length > 0) {
                startConnections.forEach(connectedWall => {
                    this.drawAngleBetweenWalls(this.selectedWall, connectedWall, this.selectedWall.start);
                });
            }

            // Draw angles at end point
            if (endConnections.length > 0) {
                endConnections.forEach(connectedWall => {
                    this.drawAngleBetweenWalls(this.selectedWall, connectedWall, this.selectedWall.end);
                });
            }
        }

        // Restore context
        this.ctx.restore();
    }

    drawPlacedDoors() {
        const doors = this.store.state.doors.doors;
        
        doors.forEach(door => {
            this.ctx.save();
            this.ctx.translate(door.x, door.y);
            this.ctx.rotate(door.angle);

            // Draw door rectangle in black
            this.ctx.fillStyle = '#000000';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;

            // Draw door along the wall
            this.ctx.beginPath();
            this.ctx.rect(0, -door.thickness/2, door.width, door.thickness);
            this.ctx.fill();
            this.ctx.stroke();

            // Draw opening arc and connecting line
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#000000';
            this.ctx.setLineDash([]);
            
            const openAngle = door.openAngle * (Math.PI / 180);
            if (door.openDirection === 'left') {
                // Draw arc from left edge
                this.ctx.arc(0, 0, door.width, 0, openAngle);
                // Add perpendicular line from left edge (hinge side) to arc height
                const arcEndY = door.width * Math.sin(openAngle);
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(0, arcEndY);
            } else {
                // Draw arc from right edge
                this.ctx.arc(door.width, 0, door.width, Math.PI, Math.PI - openAngle, true);
                // Add perpendicular line from right edge (hinge side) to arc height
                const arcEndY = door.width * Math.sin(Math.PI - openAngle);
                this.ctx.moveTo(door.width, 0);
                this.ctx.lineTo(door.width, arcEndY);
            }
            
            this.ctx.stroke();

            // Update wall dimensions to show segments
            if (door.wallId) {
                const wall = this.walls.find(w => w.id === door.wallId);
                if (wall) {
                    // Hide the original wall dimension
                    wall.hideDimension = true;
                    
                    // Draw the three segments
                    this.drawDoorSegmentDimensions(door.leftSegment, door.rightSegment, door.width, door.thickness);
                }
            }

            this.ctx.restore();
        });
    }

    drawDoorSegmentDimensions(leftSegment, rightSegment, doorWidth, thickness) {
        const offset = thickness + 20; // Offset for dimension lines
        
        this.ctx.save();
        this.ctx.strokeStyle = '#666';
        this.ctx.fillStyle = '#666';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Left segment
        if (leftSegment > 0) {
            // Extension lines
            this.ctx.beginPath();
            this.ctx.moveTo(-leftSegment, -thickness/2);
            this.ctx.lineTo(-leftSegment, -offset);
            this.ctx.moveTo(0, -thickness/2);
            this.ctx.lineTo(0, -offset);
            this.ctx.stroke();

            // Dimension line
            this.ctx.beginPath();
            this.ctx.moveTo(-leftSegment, -offset);
            this.ctx.lineTo(0, -offset);
            this.ctx.stroke();

            // Text with background
            const leftText = `${Math.round(leftSegment)} cm`;
            const leftTextWidth = this.ctx.measureText(leftText).width;
            
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(-leftSegment/2 - leftTextWidth/2 - 2, -offset - 8, leftTextWidth + 4, 16);
            
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(leftText, -leftSegment/2, -offset);
        }

        // Door width
        this.ctx.beginPath();
        this.ctx.moveTo(0, -offset);
        this.ctx.lineTo(doorWidth, -offset);
        this.ctx.stroke();

        // Door width text with background
        const doorText = `${Math.round(doorWidth)} cm`;
        const doorTextWidth = this.ctx.measureText(doorText).width;
        
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(doorWidth/2 - doorTextWidth/2 - 2, -offset - 8, doorTextWidth + 4, 16);
        
        this.ctx.fillStyle = '#666';
        this.ctx.fillText(doorText, doorWidth/2, -offset);

        // Right segment
        if (rightSegment > 0) {
            // Extension lines
            this.ctx.beginPath();
            this.ctx.moveTo(doorWidth, -thickness/2);
            this.ctx.lineTo(doorWidth, -offset);
            this.ctx.moveTo(doorWidth + rightSegment, -thickness/2);
            this.ctx.lineTo(doorWidth + rightSegment, -offset);
            this.ctx.stroke();

            // Dimension line
            this.ctx.beginPath();
            this.ctx.moveTo(doorWidth, -offset);
            this.ctx.lineTo(doorWidth + rightSegment, -offset);
            this.ctx.stroke();

            // Text with background
            const rightText = `${Math.round(rightSegment)} cm`;
            const rightTextWidth = this.ctx.measureText(rightText).width;
            
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(doorWidth + rightSegment/2 - rightTextWidth/2 - 2, -offset - 8, rightTextWidth + 4, 16);
            
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(rightText, doorWidth + rightSegment/2, -offset);
        }

        this.ctx.setLineDash([]);
        this.ctx.restore();
    }

    drawWall(wall) {
        const rect = this.calculateWallRectangle(wall.start, wall.end, wall.thickness);
        if (!rect) return;
        this.drawSimpleWall(wall, rect);
        this.drawWallDimension(wall); // Add dimension to all walls
    }

    drawWallDimension(wall) {
        // Skip if wall dimensions should be hidden (when a door is placed)
        if (wall.hideDimension) return;

        // Find connected walls at both ends
        const startConnections = this.findWallsConnectedToPoint(wall.start);
        const endConnections = this.findWallsConnectedToPoint(wall.end);

        // Calculate the internal points accounting for wall thickness
        const internalPoints = this.calculateInternalPoints(wall, startConnections, endConnections);
        if (!internalPoints) return;

        const { internalStart, internalEnd } = internalPoints;

        const midPoint = {
            x: (internalStart.x + internalEnd.x) / 2,
            y: (internalStart.y + internalEnd.y) / 2
        };

        const dx = internalEnd.x - internalStart.x;
        const dy = internalEnd.y - internalStart.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        // Only draw dimension if wall is long enough
        if (length < 20) return;

        // Calculate normal vector for offset direction
        const nx = -dy / length;
        const ny = dx / length;

        // Offset for dimension line (perpendicular to wall)
        const offset = wall.thickness + 20;

        // Convert length to current unit and format
        const unit = this.store.state.project.unit;
        let displayLength;
        let unitLabel;

        switch (unit) {
            case 'mm':
                displayLength = (length * 10).toFixed(0); // Convert from internal units (cm) to mm
                unitLabel = 'mm';
                break;
            case 'm':
                displayLength = (length / 100).toFixed(2); // Convert from internal units (cm) to m
                unitLabel = 'm';
                break;
            case 'cm':
            default:
                displayLength = length.toFixed(1); // Internal units are already in cm
                unitLabel = 'cm';
                break;
        }

        // Draw dimension line
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);

        // Draw extension lines from internal points
        this.ctx.beginPath();
        this.ctx.moveTo(internalStart.x, internalStart.y);
        this.ctx.lineTo(
            internalStart.x + nx * offset,
            internalStart.y + ny * offset
        );
        this.ctx.moveTo(internalEnd.x, internalEnd.y);
        this.ctx.lineTo(
            internalEnd.x + nx * offset,
            internalEnd.y + ny * offset
        );
        this.ctx.stroke();

        // Draw dimension line
        this.ctx.beginPath();
        this.ctx.moveTo(
            internalStart.x + nx * offset,
            internalStart.y + ny * offset
        );
        this.ctx.lineTo(
            internalEnd.x + nx * offset,
            internalEnd.y + ny * offset
        );
        this.ctx.stroke();

        this.ctx.setLineDash([]); // Reset dash pattern

        // Draw arrows
        const arrowSize = 6;
        const angle = Math.atan2(dy, dx);

        // Start arrow
        this.ctx.beginPath();
        this.ctx.moveTo(
            internalStart.x + nx * offset,
            internalStart.y + ny * offset
        );
        this.ctx.lineTo(
            internalStart.x + nx * offset + Math.cos(angle + Math.PI * 0.75) * arrowSize,
            internalStart.y + ny * offset + Math.sin(angle + Math.PI * 0.75) * arrowSize
        );
        this.ctx.moveTo(
            internalStart.x + nx * offset,
            internalStart.y + ny * offset
        );
        this.ctx.lineTo(
            internalStart.x + nx * offset + Math.cos(angle - Math.PI * 0.75) * arrowSize,
            internalStart.y + ny * offset + Math.sin(angle - Math.PI * 0.75) * arrowSize
        );
        this.ctx.stroke();

        // End arrow
        this.ctx.beginPath();
        this.ctx.moveTo(
            internalEnd.x + nx * offset,
            internalEnd.y + ny * offset
        );
        this.ctx.lineTo(
            internalEnd.x + nx * offset + Math.cos(angle + Math.PI + Math.PI * 0.75) * arrowSize,
            internalEnd.y + ny * offset + Math.sin(angle + Math.PI + Math.PI * 0.75) * arrowSize
        );
        this.ctx.moveTo(
            internalEnd.x + nx * offset,
            internalEnd.y + ny * offset
        );
        this.ctx.lineTo(
            internalEnd.x + nx * offset + Math.cos(angle + Math.PI - Math.PI * 0.75) * arrowSize,
            internalEnd.y + ny * offset + Math.sin(angle + Math.PI - Math.PI * 0.75) * arrowSize
        );
        this.ctx.stroke();

        // Draw dimension text
        const dimensionText = `${displayLength} ${unitLabel}`;
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#333';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';

        // Calculate text angle to ensure it's always readable
        let textAngle = Math.atan2(dy, dx);
        if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
            textAngle += Math.PI;
        }

        // Draw text background
        const textWidth = this.ctx.measureText(dimensionText).width + 4;
        const textHeight = 16;
        
        this.ctx.save();
        this.ctx.translate(midPoint.x + nx * offset, midPoint.y + ny * offset);
        this.ctx.rotate(textAngle);
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(-textWidth / 2, 0, textWidth, -textHeight);
        
        // Draw text
        this.ctx.fillStyle = '#333';
        this.ctx.fillText(dimensionText, 0, -2);
        
        this.ctx.restore();
    }

    calculateInternalPoints(wall, startConnections, endConnections) {
        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < 0.001) return null;

        // Calculate unit vectors for wall direction and normal
        const ux = dx / length;  // Unit vector in wall direction
        const uy = dy / length;
        const nx = -dy / length; // Normal vector (perpendicular to wall)
        const ny = dx / length;

        // Find perpendicular walls at each end
        const startPerpendicularWalls = startConnections.filter(connectedWall => {
            const angle = this.calculateWallAngle(wall, connectedWall, wall.start);
            return angle !== null && Math.abs(angle - 90) < 15;
        });

        const endPerpendicularWalls = endConnections.filter(connectedWall => {
            const angle = this.calculateWallAngle(wall, connectedWall, wall.end);
            return angle !== null && Math.abs(angle - 90) < 15;
        });

        // Get the thicknesses of perpendicular walls
        const startThickness = startPerpendicularWalls.length > 0 
            ? Math.max(...startPerpendicularWalls.map(w => w.thickness))
            : 0;
        const endThickness = endPerpendicularWalls.length > 0 
            ? Math.max(...endPerpendicularWalls.map(w => w.thickness))
            : 0;

        // Calculate internal points using perpendicular wall thicknesses
        let internalStart = {
            x: wall.start.x + (startThickness / 2) * ux,
            y: wall.start.y + (startThickness / 2) * uy
        };

        let internalEnd = {
            x: wall.end.x - (endThickness / 2) * ux,
            y: wall.end.y - (endThickness / 2) * uy
        };

        return { internalStart, internalEnd };
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

        const elements = [...wallElements, ...roomElements];

        // Add to history and update current state
        this.store.commit('history/addToHistory', elements);
        this.store.commit('project/setElements', elements);
    }

    undo() {
        this.store.commit('history/undo');
        const elements = this.store.getters['history/currentState'];
        this.store.commit('project/setElements', elements);
        this.loadFromStore();
        this.draw();
    }

    redo() {
        this.store.commit('history/redo');
        const elements = this.store.getters['history/currentState'];
        this.store.commit('project/setElements', elements);
        this.loadFromStore();
        this.draw();
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

    findSharedPoint(point) {
        // Create a unique identifier for the point
        const pointKey = `${point.x},${point.y}`;
        
        // Find all walls that share this point
        const connectedWalls = this.walls.filter(wall => 
            (Math.abs(wall.start.x - point.x) < 0.1 && Math.abs(wall.start.y - point.y) < 0.1) ||
            (Math.abs(wall.end.x - point.x) < 0.1 && Math.abs(wall.end.y - point.y) < 0.1)
        );

        // Create a shared point object that will be referenced by all connected walls
        const sharedPoint = { x: point.x, y: point.y, connectedWalls: [] };

        // Update all connected walls to use this shared point
        connectedWalls.forEach(wall => {
            if (Math.abs(wall.start.x - point.x) < 0.1 && Math.abs(wall.start.y - point.y) < 0.1) {
                wall.start = sharedPoint;
                sharedPoint.connectedWalls.push({ wall, isStart: true });
            }
            if (Math.abs(wall.end.x - point.x) < 0.1 && Math.abs(wall.end.y - point.y) < 0.1) {
                wall.end = sharedPoint;
                sharedPoint.connectedWalls.push({ wall, isStart: false });
            }
        });

        return sharedPoint;
    }

    connectWalls(newWall, connection, isEnd = false) {
        const connectionPoint = connection.point;
        const oldWall = connection.wall;

        // Create or find a shared point
        const sharedPoint = this.findSharedPoint(connectionPoint);

        // Determine which end of the new wall to connect
        if (isEnd) {
            newWall.end = sharedPoint;
        } else {
            newWall.start = sharedPoint;
        }

        // Update the old wall's connection point
        if (connection.isEnd) {
            oldWall.end = sharedPoint;
        } else {
            oldWall.start = sharedPoint;
        }

        return null; // No split wall needed with shared points
    }

    // Add these helper methods after the existing helper methods
    isWallMoreHorizontal(wall) {
        const dx = Math.abs(wall.end.x - wall.start.x);
        const dy = Math.abs(wall.end.y - wall.start.y);
        return dx >= dy;
    }

    constrainMovement(wall, point) {
        const isHorizontal = this.isWallMoreHorizontal(wall);
        const dx = point.x - (wall.start.x + wall.end.x) / 2;
        const dy = point.y - (wall.start.y + wall.end.y) / 2;
        
        // Calculate the constrained movement
        const movement = {
            x: isHorizontal ? 0 : dx,
            y: isHorizontal ? dy : 0
        };

        // Store original positions and angle
        const originalStart = { ...wall.start };
        const originalEnd = { ...wall.end };
        const originalAngle = Math.atan2(
            originalEnd.y - originalStart.y,
            originalEnd.x - originalStart.x
        );

        // Move the wall
        wall.start.x += movement.x;
        wall.start.y += movement.y;
        wall.end.x += movement.x;
        wall.end.y += movement.y;

        // Update doors attached to this wall
        const doors = this.store.state.doors.doors;
        const updatedDoors = doors.map(door => {
            if (door.wallId === wall.id) {
                // Calculate wall angles
                const originalAngle = Math.atan2(
                    originalEnd.y - originalStart.y,
                    originalEnd.x - originalStart.x
                );
                const newAngle = Math.atan2(
                    wall.end.y - wall.start.y,
                    wall.end.x - wall.start.x
                );

                // Calculate the door's relative position along the wall (0 to 1)
                const originalWallLength = Math.sqrt(
                    Math.pow(originalEnd.x - originalStart.x, 2) +
                    Math.pow(originalEnd.y - originalStart.y, 2)
                );
                
                // Get the door's relative distance from wall start
                const doorToStartX = door.x - originalStart.x;
                const doorToStartY = door.y - originalStart.y;
                const relativePosition = (doorToStartX * (originalEnd.x - originalStart.x) + 
                                       doorToStartY * (originalEnd.y - originalStart.y)) / 
                                      (originalWallLength * originalWallLength);

                // Calculate new wall length and direction
                const newWallLength = Math.sqrt(
                    Math.pow(wall.end.x - wall.start.x, 2) +
                    Math.pow(wall.end.y - wall.start.y, 2)
                );
                const wallDirX = (wall.end.x - wall.start.x) / newWallLength;
                const wallDirY = (wall.end.y - wall.start.y) / newWallLength;

                // Calculate new door position
                const newX = wall.start.x + wallDirX * (relativePosition * newWallLength);
                const newY = wall.start.y + wallDirY * (relativePosition * newWallLength);

                return {
                    ...door,
                    x: newX,
                    y: newY,
                    angle: newAngle // Door angle should match wall angle
                };
            }
            return door;
        });

        if (doors.length !== updatedDoors.length || doors.some((door, i) => 
            door.x !== updatedDoors[i].x || 
            door.y !== updatedDoors[i].y || 
            door.angle !== updatedDoors[i].angle)) {
            this.store.commit('doors/updateDoors', updatedDoors);
        }

        // Find walls connected to both endpoints
        const startConnectedWalls = this.findWallsConnectedToPoint(wall.start).filter(w => w.id !== wall.id);
        const endConnectedWalls = this.findWallsConnectedToPoint(wall.end).filter(w => w.id !== wall.id);

        // Adjust connected walls at start point
        startConnectedWalls.forEach(connectedWall => {
            if (this.distance(connectedWall.start, originalStart) < 1) {
                connectedWall.start = wall.start;
            } else if (this.distance(connectedWall.end, originalStart) < 1) {
                connectedWall.end = wall.start;
            }
        });

        // Adjust connected walls at end point
        endConnectedWalls.forEach(connectedWall => {
            if (this.distance(connectedWall.start, originalEnd) < 1) {
                connectedWall.start = wall.end;
            } else if (this.distance(connectedWall.end, originalEnd) < 1) {
                connectedWall.end = wall.end;
            }
        });

        return movement;
    }

    findWallsConnectedToPoint(point) {
        return this.walls.filter(wall => 
            this.distance(wall.start, point) < 1 || 
            this.distance(wall.end, point) < 1
        );
    }

    calculateWallAngle(wall1, wall2, sharedPoint) {
        try {
            // Get vectors for both walls from the shared point
            let vec1, vec2;
            
            // For wall1
            if (this.distance(sharedPoint, wall1.start) < 1) {
                vec1 = {
                    x: wall1.end.x - wall1.start.x,
                    y: wall1.end.y - wall1.start.y
                };
            } else {
                vec1 = {
                    x: wall1.start.x - wall1.end.x,
                    y: wall1.start.y - wall1.end.y
                };
            }
            
            // For wall2
            if (this.distance(sharedPoint, wall2.start) < 1) {
                vec2 = {
                    x: wall2.end.x - wall2.start.x,
                    y: wall2.end.y - wall2.start.y
                };
            } else {
                vec2 = {
                    x: wall2.start.x - wall2.end.x,
                    y: wall2.start.y - wall2.end.y
                };
            }

            // Calculate angle between vectors
            const dot = vec1.x * vec2.x + vec1.y * vec2.y;
            const mag1 = Math.sqrt(vec1.x * vec1.x + vec1.y * vec1.y);
            const mag2 = Math.sqrt(vec2.x * vec2.x + vec2.y * vec2.y);
            
            // Check for zero magnitudes to avoid division by zero
            if (mag1 === 0 || mag2 === 0) {
                return null;
            }

            const cosAngle = dot / (mag1 * mag2);
            // Clamp cosAngle to [-1, 1] to avoid NaN from floating point errors
            const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
            let angle = Math.acos(clampedCosAngle) * 180 / Math.PI;

            // Calculate cross product to determine orientation
            const cross = vec1.x * vec2.y - vec1.y * vec2.x;

            // For clockwise room traversal, we want to show the internal angle
            // We need to consider the position of the shared point relative to the room
            const centerX = (wall1.start.x + wall1.end.x + wall2.start.x + wall2.end.x) / 4;
            const centerY = (wall1.start.y + wall1.end.y + wall2.start.y + wall2.end.y) / 4;
            
            // Vector from center to shared point
            const toSharedPoint = {
                x: sharedPoint.x - centerX,
                y: sharedPoint.y - centerY
            };

            // Calculate if the point is in a clockwise or counterclockwise position
            const isClockwise = (toSharedPoint.x * (vec1.y + vec2.y) - toSharedPoint.y * (vec1.x + vec2.x)) > 0;

            // Adjust the angle based on orientation and position
            if ((cross < 0 && !isClockwise) || (cross > 0 && isClockwise)) {
                angle = 360 - angle;
            }

            // Return the internal angle
            return Math.round(angle > 180 ? 360 - angle : angle);
        } catch (error) {
            console.error('Error calculating wall angle:', error);
            return null;
        }
    }

    findConnectedWalls(wall) {
        return this.walls.filter(otherWall => {
            if (otherWall === wall) return false;
            return (
                this.distance(wall.start, otherWall.start) < 1 ||
                this.distance(wall.start, otherWall.end) < 1 ||
                this.distance(wall.end, otherWall.start) < 1 ||
                this.distance(wall.end, otherWall.end) < 1
            );
        });
    }

    drawAngleBetweenWalls(wall1, wall2, sharedPoint) {
        const angle = this.calculateWallAngle(wall1, wall2, sharedPoint);
        
        // Skip drawing if angle calculation failed
        if (angle === null) {
            console.warn('Invalid angle between walls');
            return;
        }
        
        // Calculate vectors for both walls from the shared point
        let vec1Start, vec2Start;
        
        // For wall1
        if (this.distance(sharedPoint, wall1.start) < 1) {
            vec1Start = {
                x: wall1.end.x - wall1.start.x,
                y: wall1.end.y - wall1.start.y
            };
        } else {
            vec1Start = {
                x: wall1.start.x - wall1.end.x,
                y: wall1.start.y - wall1.end.y
            };
        }
        
        // For wall2
        if (this.distance(sharedPoint, wall2.start) < 1) {
            vec2Start = {
                x: wall2.end.x - wall2.start.x,
                y: wall2.end.y - wall2.start.y
            };
        } else {
            vec2Start = {
                x: wall2.start.x - wall2.end.x,
                y: wall2.start.y - wall2.end.y
            };
        }

        // Calculate angles for arc drawing
        const angle1 = Math.atan2(vec1Start.y, vec1Start.x);
        const angle2 = Math.atan2(vec2Start.y, vec2Start.x);
        
        // Determine the radius and offset for the angle display
        const radius = 30;
        
        // Calculate midpoint for text placement, ensuring it's inside the room
        const midAngle = (angle1 + angle2) / 2;
        const textX = sharedPoint.x + radius * Math.cos(midAngle);
        const textY = sharedPoint.y + radius * Math.sin(midAngle);
        
        // Draw the angle arc
        this.ctx.beginPath();
        this.ctx.arc(sharedPoint.x, sharedPoint.y, radius, 
            Math.min(angle1, angle2), Math.max(angle1, angle2));
        this.ctx.strokeStyle = '#2196F3';
        this.ctx.stroke();
        
        // Draw background for text
        const text = `${angle}°`;
        this.ctx.font = '14px Arial';
        const textWidth = this.ctx.measureText(text).width;
        const padding = 4;
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(
            textX - textWidth/2 - padding,
            textY - 8 - padding,
            textWidth + padding * 2,
            16 + padding * 2
        );
        
        // Draw the angle text
        this.ctx.fillStyle = '#2196F3';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, textX, textY);
    }

    updateDoorPreview(point) {
        const doorConfig = this.store.state.doors.currentConfig;
        
        // Reset door preview state
        this.doorPreview = null;
        this.doorMagnetWall = null;
        this.doorMagnetPoint = null;

        // Find suitable walls for door placement
        for (const wall of this.walls) {
            // Find connected walls at both ends to calculate internal dimensions
            const startConnections = this.findWallsConnectedToPoint(wall.start);
            const endConnections = this.findWallsConnectedToPoint(wall.end);

            // Calculate internal points accounting for wall thickness
            const internalPoints = this.calculateInternalPoints(wall, startConnections, endConnections);
            if (!internalPoints) continue;

            const { internalStart, internalEnd } = internalPoints;

            // Calculate internal wall length
            const internalLength = Math.sqrt(
                Math.pow(internalEnd.x - internalStart.x, 2) + 
                Math.pow(internalEnd.y - internalStart.y, 2)
            );

            // Skip if internal wall length is too short for the door
            if (internalLength < doorConfig.width) continue;

            // Calculate distance from point to wall
            const magnetDistance = this.distanceToLine(point, wall.start, wall.end);
            if (magnetDistance < 20) { // Magnetization threshold
                // Calculate the projection point on the wall
                const projection = this.projectPointOnLine(point, wall.start, wall.end);
                
                // Calculate wall direction vector
                const wallDx = wall.end.x - wall.start.x;
                const wallDy = wall.end.y - wall.start.y;
                const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);
                const wallUnitX = wallDx / wallLength;
                const wallUnitY = wallDy / wallLength;

                // Calculate distance from internal start to projection
                const distanceFromInternalStart = Math.sqrt(
                    Math.pow(projection.x - internalStart.x, 2) + 
                    Math.pow(projection.y - internalStart.y, 2)
                );

                // Move projection point back by half door width to center the door
                const doorCenter = {
                    x: projection.x - (doorConfig.width / 2) * wallUnitX,
                    y: projection.y - (doorConfig.width / 2) * wallUnitY
                };

                // Calculate distances for centered door position
                const centeredDistanceFromStart = Math.sqrt(
                    Math.pow(doorCenter.x - internalStart.x, 2) + 
                    Math.pow(doorCenter.y - internalStart.y, 2)
                );
                
                // Calculate distance from door end to internal wall end
                const distanceFromEnd = internalLength - (centeredDistanceFromStart + doorConfig.width);

                // Check if door can fit at this position (with minimum margins)
                const minMargin = 10; // Minimum margin from wall ends
                if (centeredDistanceFromStart >= minMargin && distanceFromEnd >= minMargin) {
                    this.doorMagnetWall = wall;
                    this.doorMagnetPoint = doorCenter;
                    
                    // Calculate wall angle
                    const wallAngle = Math.atan2(wallDy, wallDx);

                    // Create door preview aligned with the wall
                    this.doorPreview = {
                        x: doorCenter.x,
                        y: doorCenter.y,
                        width: doorConfig.width,
                        thickness: wall.thickness,
                        angle: wallAngle,
                        wall: wall,
                        leftSegment: centeredDistanceFromStart,
                        rightSegment: distanceFromEnd,
                        internalStart,
                        internalEnd
                    };
                    break;
                }
            }
        }
    }

    drawDoorPreview() {
        if (!this.doorPreview) return;

        const { x, y, width, thickness, angle = 0, wall, leftSegment, rightSegment } = this.doorPreview;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        // Draw door rectangle
        this.ctx.fillStyle = '#000000';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.rect(0, -thickness/2, width, thickness);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw opening arc and connecting line
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#000000';
        
        const openAngle = this.store.state.doors.currentConfig.openAngle * (Math.PI / 180);
        if (this.store.state.doors.currentConfig.openDirection === 'left') {
            // Draw arc from left edge
            this.ctx.arc(0, 0, width, 0, openAngle);
            // Add perpendicular line from left edge (hinge side) to arc height
            const arcEndY = width * Math.sin(openAngle);
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(0, arcEndY);
        } else {
            // Draw arc from right edge
            this.ctx.arc(width, 0, width, Math.PI, Math.PI - openAngle, true);
            // Add perpendicular line from right edge (hinge side) to arc height
            const arcEndY = width * Math.sin(Math.PI - openAngle);
            this.ctx.moveTo(width, 0);
            this.ctx.lineTo(width, arcEndY);
        }
        
        this.ctx.stroke();

        // Draw dimensions
        if (this.doorMagnetWall) {
            wall.hideDimension = true;
            this.drawDoorSegmentDimensions(leftSegment, rightSegment, width, thickness);
        }

        this.ctx.restore();
    }

    handleClick(point) {
        console.log('Handle click called with point:', point);
        console.log('Current tool:', this.store.state.project.currentTool);
        
        if (this.store.state.project.currentTool === 'wall') {
            this.handleWallClick(point);
        } else if (this.store.state.project.currentTool === 'door' && this.doorPreview) {
            console.log('Door preview exists:', this.doorPreview);
            // Add the door if we have a valid preview
            const { x, y, width, thickness, angle, wall, leftSegment, rightSegment } = this.doorPreview;
            
            console.log('Adding door with config:', {
                x, y, width, thickness, angle, wallId: wall.id,
                leftSegment, rightSegment,
                openDirection: this.store.state.doors.currentConfig.openDirection,
                openAngle: this.store.state.doors.currentConfig.openAngle
            });

            this.store.commit('doors/addDoor', {
                x,
                y,
                width,
                thickness,
                angle,
                wallId: wall.id,
                leftSegment,
                rightSegment,
                openDirection: this.store.state.doors.currentConfig.openDirection,
                openAngle: this.store.state.doors.currentConfig.openAngle
            });

            // Reset preview after placing the door
            this.doorPreview = null;
            this.doorMagnetWall = null;
            this.doorMagnetPoint = null;
            
            // Redraw the canvas
            this.draw();
            console.log('Door added and canvas redrawn');
        } else {
            console.log('Click not handled - Tool:', this.store.state.project.currentTool, 'Door preview:', !!this.doorPreview);
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
        });
    }
}