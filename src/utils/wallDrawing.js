// wallDrawing.js - Core drawing functionality for walls
import WallConnectionManager from './wallConnection.js';
import CanvasTransformManager from './CanvasTransformManager.js';

// Constants
const GRID_SIZE = 10; // Grid size in pixels
const ROOM_COLORS = [
    'rgba(255, 255, 255, 0.3)', // Semi-transparent white
];
const WALL_FILL_COLOR = 'rgba(220, 220, 220, 0.8)'; // Light gray fill for walls
const WALL_STROKE_COLOR = '#333'; // Dark gray stroke for walls
const TEMP_WALL_FILL_COLOR = 'rgba(200, 220, 255, 0.6)'; // Light blue for temp walls
const TEMP_WALL_STROKE_COLOR = '#3366cc'; // Blue stroke for temp walls

// Alignment constants
const ALIGNMENT_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]; // Angles for alignment in degrees
const ALIGNMENT_TOLERANCE = 5; // Degrees of tolerance for alignment
const ALIGNMENT_LINE_LENGTH = 1000; // Length of alignment guide lines
const ALIGNMENT_SNAP_THRESHOLD = 5; // Degrees of tolerance for alignment

// Add new constants for control points
const CONTROL_POINT_VISUAL_SIZE = {
    END: 6,      // Visual size of end points
    MIDDLE: 8    // Visual size of middle point
};

const CONTROL_POINT_HIT_AREA = {
    END: 15,     // Hit area for end points (larger than visual)
    MIDDLE: 20   // Hit area for middle point (larger than visual)
};

export default class WallDrawingManager {
    constructor(canvas, store) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.store = store;

        // Create managers
        this.connectionManager = new WallConnectionManager();
        this.transformManager = new CanvasTransformManager(canvas);

        // Wall drawing state
        this.isDrawing = false;
        this.startPoint = null;
        this.currentPoint = null;
        this.magnetPoint = null;
        this.magnetPointWall = null;
        this.walls = [];
        this.rooms = [];
        this.selectedWall = null;
        this.alignmentGuides = null;
        this.angleDisplay = null;
        this.dragState = null;

        // Canvas state
        this.virtualWidth = 10000;  // Large virtual canvas width
        this.virtualHeight = 10000; // Large virtual canvas height
        this.minZoom = 0.1;        // Minimum zoom level
        this.maxZoom = 5;          // Maximum zoom level
        this.zoomFactor = 0.1;     // How much to zoom per step

        // Binding methods
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onWheel = this.onWheel.bind(this);

        // Initialize
        this.setupCanvas();
        this.attachEvents();
    }

    // Getters for transform state (used by other components)
    get panOffset() {
        return this.transformManager.panOffset;
    }

    get zoom() {
        return this.transformManager.zoom;
    }

    set zoom(value) {
        this.transformManager.zoom = value;
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
        
        // Store physical canvas dimensions
        this.physicalWidth = this.canvas.width;
        this.physicalHeight = this.canvas.height;
        
        this.draw(); // Redraw everything when resizing
    }

    attachEvents() {
        this.canvas.addEventListener('mousedown', this.onMouseDown);
        this.canvas.addEventListener('mousemove', this.onMouseMove);
        this.canvas.addEventListener('mouseup', this.onMouseUp);
        this.canvas.addEventListener('wheel', this.onWheel);
    }

    removeEvents() {
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mouseup', this.onMouseUp);
    }

    // Event handlers
    onMouseDown(e) {
        if (!this.store.state.project.currentTool) {
            // Handle panning with left mouse button
            if (e.button === 0) {
                const point = this.transformManager.getMousePos(e, false);
            
                // Check if clicking on a wall or control point
            if (this.selectedWall) {
                const controlPoints = this.getWallControlPoints(this.selectedWall);
                    
                    // Check if clicking on control points with different hit areas
                    if (this.isNearPoint(point, controlPoints.start, CONTROL_POINT_HIT_AREA.END)) {
                        this.dragState = { 
                            type: 'start', 
                            wall: this.selectedWall,
                            originalPoint: { ...controlPoints.start }
                        };
                    return;
                    }
                    if (this.isNearPoint(point, controlPoints.middle, CONTROL_POINT_HIT_AREA.MIDDLE)) {
                        this.dragState = { 
                            type: 'middle', 
                            wall: this.selectedWall,
                            originalPoint: { ...controlPoints.middle }
                        };
                    return;
                    }
                    if (this.isNearPoint(point, controlPoints.end, CONTROL_POINT_HIT_AREA.END)) {
                        this.dragState = { 
                            type: 'end', 
                            wall: this.selectedWall,
                            originalPoint: { ...controlPoints.end }
                        };
                    return;
                }
            }

                // Check if clicking on a wall
            const clickedWall = this.getWallAtPoint(point);
            if (clickedWall) {
                this.selectedWall = clickedWall;
                this.draw();
                return;
            } else {
                    // If clicking on empty space, clear selection
                this.selectedWall = null;
                this.draw();
            }

                this.transformManager.startPan(e);
                return;
            }
        } else if (e.button === 2) { // Right mouse button
            this.transformManager.startPan(e);
            return;
        }

        if (this.store.state.project.currentTool !== 'wall') return;

        const point = this.transformManager.getMousePos(e);
        this.isDrawing = true;

        // If we have a magnet point, use it as the start point
        this.startPoint = this.magnetPoint || point;

        // Initialize alignment guides
        this.calculateAlignmentGuides(this.startPoint);
    }

    onMouseMove(e) {
        // Handle wall dragging
        if (this.dragState && this.selectedWall) {
            const point = this.transformManager.getMousePos(e, false);
            
            switch (this.dragState.type) {
                case 'start':
                    this.moveWallStart(this.selectedWall, point);
                    break;
                case 'end':
                    this.moveWallEnd(this.selectedWall, point);
                    break;
                case 'middle':
                    this.moveEntireWall(this.selectedWall, point);
                    break;
            }
            
            // Detect rooms after any wall movement
            this.detectRooms();
            this.draw();
            return;
        }

        // Handle panning
        if (this.transformManager.updatePan(e)) {
            this.draw();
            return;
        }

        const mousePos = this.transformManager.getMousePos(e);
        this.currentPoint = {
            x: mousePos.x,
            y: mousePos.y
        };

        // Check if we should snap to existing walls
        this.magnetPoint = null;
        this.magnetPointWall = null;

        // Only check for magnet points if we're using the wall tool
        if (this.store.state.project.currentTool === 'wall') {
            // Get wall thickness for magnetization calculations
            const wallThickness = this.store.getters['walls/defaultThickness'] / 100;

            // Check if we need to snap to existing walls
            for (const wall of this.walls) {
                // Check if point is near wall start or end
                if (this.distance(this.currentPoint, wall.start) < 10 / this.zoom) {
                    this.magnetPoint = { ...wall.start };
                    this.magnetPointWall = wall;
                    this.magnetIsEnd = false;
                    break;
                }
                if (this.distance(this.currentPoint, wall.end) < 10 / this.zoom) {
                    this.magnetPoint = { ...wall.end };
                    this.magnetPointWall = wall;
                    this.magnetIsEnd = true;
                    break;
                }

                // Check if point is near wall edges
                const snapPoint = this.getPointOnWall(this.currentPoint, wall);
                if (snapPoint) {
                    this.magnetPoint = snapPoint;
                    this.magnetPointWall = wall;
                    this.magnetIsEnd = null;
                    break;
                }
            }

            // Update angle display if we're drawing
            if (this.isDrawing && this.angleDisplay) {
                this.updateAngleDisplay(this.currentPoint);
            }
        }

        this.draw();
    }

    onMouseUp(e) {
        if (this.dragState) {
            this.dragState = null;
            // Detect rooms after finishing wall movement
            this.detectRooms();
            this.saveWallsToStore();
            return;
        }
        
        if (this.transformManager.isPanning) {
            this.transformManager.endPan();
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
            // Create a new wall with precise coordinates
            const wallThickness = this.store.getters['walls/defaultThickness'] / 10;
            const newWall = {
                id: Date.now().toString(),
                start: { 
                    x: this.startPoint.x,
                    y: this.startPoint.y
                },
                end: { 
                    x: endPoint.x,
                    y: endPoint.y
                },
                thickness: wallThickness
            };

            // Check for intersections with existing walls
            for (const existingWall of this.walls) {
                const intersection = this.findWallIntersectionPoint(newWall, existingWall);
                if (intersection) {
                    // Split the existing wall at the intersection point
                    this.splitWallAtPoint(existingWall, intersection, newWall);
                    }
                }

                this.walls.push(newWall);
            // Detect rooms after adding a new wall
            this.detectRooms();
            this.saveWallsToStore();
        }

        // Reset drawing state
        this.isDrawing = false;
        this.startPoint = null;
        this.alignmentGuides = null;
        this.angleDisplay = null;
        this.draw();
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply transformations
        this.transformManager.applyTransform();

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

        // Restore canvas state
        this.transformManager.restoreTransform();
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
                
                // Draw angles with connected walls at both ends
                const startConnections = this.findWallsConnectedToPoint(this.selectedWall.start)
                    .filter(w => w.id !== this.selectedWall.id);
                const endConnections = this.findWallsConnectedToPoint(this.selectedWall.end)
                    .filter(w => w.id !== this.selectedWall.id);

                // Draw angles at start point
                startConnections.forEach(connectedWall => {
                    this.drawWallAngle(this.selectedWall, connectedWall, this.selectedWall.start);
                });

                // Draw angles at end point
                endConnections.forEach(connectedWall => {
                    this.drawWallAngle(this.selectedWall, connectedWall, this.selectedWall.end);
                });
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
            const isDragging = this.dragState && this.dragState.wall === wall;
            
            // Draw control points with different sizes and visual feedback
            [
                { 
                    point: controlPoints.start, 
                    color: '#4CAF50', 
                    size: CONTROL_POINT_VISUAL_SIZE.END,
                    hitArea: CONTROL_POINT_HIT_AREA.END,
                    type: 'start'
                },
                { 
                    point: controlPoints.middle, 
                    color: '#2196F3', 
                    size: CONTROL_POINT_VISUAL_SIZE.MIDDLE,
                    hitArea: CONTROL_POINT_HIT_AREA.MIDDLE,
                    type: 'middle'
                },
                { 
                    point: controlPoints.end, 
                    color: '#4CAF50', 
                    size: CONTROL_POINT_VISUAL_SIZE.END,
                    hitArea: CONTROL_POINT_HIT_AREA.END,
                    type: 'end'
                }
            ].forEach(({ point, color, size, hitArea, type }) => {
                const isActive = isDragging && this.dragState.type === type;

                // Draw hit area indicator (semi-transparent)
                if (this.isPointUnderMouse(point)) {
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                    this.ctx.beginPath();
                    this.ctx.arc(point.x, point.y, hitArea, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                // Draw outer circle (white background)
                this.ctx.fillStyle = 'white';
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, size + 2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw inner circle (colored)
                this.ctx.fillStyle = isActive ? '#FF5722' : color;
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
                    this.ctx.strokeStyle = isActive ? '#FF5722' : color;
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
        // Get all wall endpoints and intersection points
        const vertices = new Map();
        const wallsByEndpoints = new Map();

        // First, find all wall intersections
        const intersectionPoints = this.findWallIntersections();

        // Create a graph representation including both endpoints and intersection points
        this.walls.forEach(wall => {
            // Add wall endpoints
            const startKey = `${wall.start.x},${wall.start.y}`;
            const endKey = `${wall.end.x},${wall.end.y}`;

            // Add intersection points for this wall
            const wallIntersections = intersectionPoints.filter(point => 
                this.isPointOnWall(point, wall) && 
                !this.isPointAtWallEnd(point, wall)
            );

            // Add all points (endpoints and intersections) to vertices map
            [startKey, endKey, ...wallIntersections.map(p => `${p.x},${p.y}`)].forEach(pointKey => {
                if (!vertices.has(pointKey)) {
                    vertices.set(pointKey, []);
            }
                if (!wallsByEndpoints.has(pointKey)) {
                    wallsByEndpoints.set(pointKey, new Set());
                }
            });

            // Connect all points along this wall
            const allPoints = [
                { key: startKey, point: wall.start },
                ...wallIntersections.map(p => ({ key: `${p.x},${p.y}`, point: p })),
                { key: endKey, point: wall.end }
            ].sort((a, b) => {
                // Sort points along the wall from start to end
                const distA = this.distance(wall.start, a.point);
                const distB = this.distance(wall.start, b.point);
                return distA - distB;
            });

            // Create connections between consecutive points
            for (let i = 0; i < allPoints.length - 1; i++) {
                const current = allPoints[i];
                const next = allPoints[i + 1];
                
                vertices.get(current.key).push({ 
                    point: next.point, 
                    key: next.key, 
                    wall,
                    isIntersection: i > 0 || i < allPoints.length - 2
                });
                vertices.get(next.key).push({ 
                    point: current.point, 
                    key: current.key, 
                    wall,
                    isIntersection: i > 0 || i < allPoints.length - 2
                });

                wallsByEndpoints.get(current.key).add(wall);
                wallsByEndpoints.get(next.key).add(wall);
            }
        });

        // Find all cycles using the enhanced graph
        const paths = [];
        for (const [startKey, neighbors] of vertices.entries()) {
            if (neighbors.length >= 1) {
                this.findCycles(startKey, startKey, vertices, [this.keyToPoint(startKey)], new Set(), paths, [], [], wallsByEndpoints);
            }
        }

        return this.filterValidRooms(paths);
    }

    findWallIntersections() {
        const intersections = new Set();
        
        // Check each pair of walls for intersections
        for (let i = 0; i < this.walls.length; i++) {
            for (let j = i + 1; j < this.walls.length; j++) {
                const wall1 = this.walls[i];
                const wall2 = this.walls[j];
                
                const intersection = this.findWallIntersectionPoint(wall1, wall2);
                if (intersection) {
                    intersections.add(intersection);
                }
            }
        }

        return Array.from(intersections);
    }

    findWallIntersectionPoint(wall1, wall2) {
        // Skip if walls share an endpoint
        if (this.distance(wall1.start, wall2.start) < 1 ||
            this.distance(wall1.start, wall2.end) < 1 ||
            this.distance(wall1.end, wall2.start) < 1 ||
            this.distance(wall1.end, wall2.end) < 1) {
            return null;
        }

        // Calculate intersection point
        const x1 = wall1.start.x, y1 = wall1.start.y;
        const x2 = wall1.end.x, y2 = wall1.end.y;
        const x3 = wall2.start.x, y3 = wall2.start.y;
        const x4 = wall2.end.x, y4 = wall2.end.y;

        const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denominator) < 0.001) return null; // Lines are parallel

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }

        return null;
    }

    isPointOnWall(point, wall) {
        const d1 = this.distance(point, wall.start);
        const d2 = this.distance(point, wall.end);
        const wallLength = this.distance(wall.start, wall.end);
        
        // Check if point lies on the wall line and between its endpoints
        return Math.abs(d1 + d2 - wallLength) < 0.1;
    }

    isPointAtWallEnd(point, wall) {
        return this.distance(point, wall.start) < 1 || 
               this.distance(point, wall.end) < 1;
    }

    findCycles(startKey, currentKey, graph, path, visited, cycles, walls, currentPath, wallsByEndpoints) {
        if (path.length > 2 && currentKey === startKey) {
            // Verify this is a valid cycle by checking wall connections
            if (this.isValidCycle(path, walls, wallsByEndpoints)) {
                cycles.push({
                    path: [...path],
                    walls: [...walls]
                });
            }
            return;
        }

        // Limit cycle size to prevent infinite loops
        if (path.length > 8) return; // Reasonable limit for most room shapes

        const neighbors = graph.get(currentKey) || [];
        for (const neighbor of neighbors) {
            const nextKey = neighbor.key;
            if (path.length > 1 && nextKey === startKey) {
                // Check if this completes a valid cycle
                path.push(this.keyToPoint(nextKey));
                walls.push(neighbor.wall);
                if (this.isValidCycle(path, walls, wallsByEndpoints)) {
                    cycles.push({
                        path: [...path],
                        walls: [...walls]
                    });
                }
            path.pop();
                walls.pop();
            } else if (!visited.has(nextKey)) {
                visited.add(nextKey);
                path.push(this.keyToPoint(nextKey));
                walls.push(neighbor.wall);
                this.findCycles(startKey, nextKey, graph, path, visited, cycles, walls, [...currentPath, currentKey], wallsByEndpoints);
                path.pop();
                walls.pop();
                visited.delete(nextKey);
            }
        }
    }

    isValidCycle(path, walls, wallsByEndpoints) {
        if (path.length < 3) return false;

        // Check if all points form a proper polygon
        for (let i = 0; i < path.length; i++) {
            const current = path[i];
            const next = path[(i + 1) % path.length];
            const currentKey = `${current.x},${current.y}`;
            const nextKey = `${next.x},${next.y}`;

            // Check if there's a wall connecting these points (either direction)
            const wallsAtCurrent = wallsByEndpoints.get(currentKey);
            const wallsAtNext = wallsByEndpoints.get(nextKey);
            
            if (!wallsAtCurrent || !wallsAtNext) return false;

            // Check if there's at least one wall connecting these points
            let hasConnection = false;
            for (const wall of wallsAtCurrent) {
                if (wallsAtNext.has(wall)) {
                    hasConnection = true;
                    break;
                }
            }
            if (!hasConnection) return false;
        }

        // Calculate area to ensure it's a proper polygon
        const area = this.calculatePolygonArea(path);
        if (area < 100) return false; // Minimum area threshold (1 square meter)

        // Check for internal walls that divide this space
        if (this.hasInternalWalls(path)) return false;

        return true;
    }

    hasInternalWalls(roomPath) {
        // Create a polygon from the room path
        const polygon = roomPath.map(point => ({ x: point.x, y: point.y }));

        // Check each wall to see if it's inside the polygon
        for (const wall of this.walls) {
            // Skip walls that are part of the room boundary
            if (this.isWallOnPolygonBoundary(wall, polygon)) continue;

            // Check if wall midpoint is inside the polygon
            const midpoint = {
                x: (wall.start.x + wall.end.x) / 2,
                y: (wall.start.y + wall.end.y) / 2
            };

            // If the midpoint is inside and the wall isn't on the boundary,
            // this is an internal wall
            if (this.isPointInPolygon(midpoint, polygon)) {
                return true;
            }
        }

        return false;
    }

    isWallOnPolygonBoundary(wall, polygon) {
        // Check if both endpoints of the wall are on the polygon boundary
        for (let i = 0; i < polygon.length; i++) {
            const start = polygon[i];
            const end = polygon[(i + 1) % polygon.length];

            // Check if wall endpoints match this polygon segment
            if ((this.distance(wall.start, start) < 1 && this.distance(wall.end, end) < 1) ||
                (this.distance(wall.start, end) < 1 && this.distance(wall.end, start) < 1)) {
                return true;
            }
        }
        return false;
    }

    isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    filterValidRooms(paths) {
        if (paths.length === 0) return [];

        const validRooms = [];
        
        for (const pathData of paths) {
            const { path } = pathData;
            
            // Skip invalid paths
            if (!path || path.length < 3) continue;

            // Check if this room is unique and valid
            let isUnique = true;
            for (const existingRoom of validRooms) {
                if (this.areRoomsEquivalent(path, existingRoom)) {
                    isUnique = false;
                    break;
                }
            }

            if (isUnique && !this.hasInternalWalls(path)) {
                validRooms.push(path);
            }
        }

        return validRooms;
    }

    areWallsParallel(wall1, wall2) {
        if (!wall1 || !wall2) return false;

        const vector1 = {
            x: wall1.end.x - wall1.start.x,
            y: wall1.end.y - wall1.start.y
        };
        const vector2 = {
            x: wall2.end.x - wall2.start.x,
            y: wall2.end.y - wall2.start.y
        };

        // Calculate angles
        const angle1 = Math.atan2(vector1.y, vector1.x);
        const angle2 = Math.atan2(vector2.y, vector2.x);

        // Check if angles are the same or opposite (parallel)
        const angleDiff = Math.abs(angle1 - angle2);
        return angleDiff < 0.1 || Math.abs(angleDiff - Math.PI) < 0.1;
    }

    removeDuplicateRooms(rooms) {
        const uniqueRooms = [];
        
        for (const room of rooms) {
            let isDuplicate = false;
            
            for (const existingRoom of uniqueRooms) {
                if (this.areRoomsEquivalent(room, existingRoom)) {
                    isDuplicate = true;
                    break;
                }
            }
            
            if (!isDuplicate) {
                uniqueRooms.push(room);
            }
        }
        
        return uniqueRooms;
    }

    areRoomsEquivalent(room1, room2) {
        if (room1.length !== room2.length) return false;
        
        const area1 = this.calculatePolygonArea(room1);
        const area2 = this.calculatePolygonArea(room2);
        
        // If areas are significantly different, rooms are not equivalent
        if (Math.abs(area1 - area2) > 1) return false;
        
        // Check if all points in room1 have corresponding points in room2
        const maxDistance = 1; // Maximum distance for points to be considered the same
        let matchedPoints = 0;
        
        for (const point1 of room1) {
            for (const point2 of room2) {
                if (this.distance(point1, point2) < maxDistance) {
                    matchedPoints++;
                    break;
                }
            }
        }
        
        return matchedPoints === room1.length;
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
            // Return both actual and snapped positions
            return {
                x: x,
                y: y,
                snappedX: Math.round(x / GRID_SIZE) * GRID_SIZE,
                snappedY: Math.round(y / GRID_SIZE) * GRID_SIZE
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

    drawGrid() {
        const width = this.virtualWidth;
        const height = this.virtualHeight;

        // Calculate visible area in world coordinates
        const visibleLeft = -this.transformManager.panOffset.x / this.transformManager.zoom;
        const visibleTop = -this.transformManager.panOffset.y / this.transformManager.zoom;
        const visibleRight = (this.physicalWidth - this.transformManager.panOffset.x) / this.transformManager.zoom;
        const visibleBottom = (this.physicalHeight - this.transformManager.panOffset.y) / this.transformManager.zoom;

        // Adjust grid size based on zoom level
        let gridSize = GRID_SIZE;
        if (this.transformManager.zoom < 0.5) gridSize *= 2;
        if (this.transformManager.zoom < 0.25) gridSize *= 2;

        // Calculate grid line start and end points
        const startX = Math.floor(visibleLeft / gridSize) * gridSize;
        const endX = Math.ceil(visibleRight / gridSize) * gridSize;
        const startY = Math.floor(visibleTop / gridSize) * gridSize;
        const endY = Math.ceil(visibleBottom / gridSize) * gridSize;

        // Small grid lines
        this.ctx.strokeStyle = '#eee';
        this.ctx.lineWidth = 0.5;

        // Draw vertical small grid lines
        for (let x = startX; x <= endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }

        // Draw horizontal small grid lines
        for (let y = startY; y <= endY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }

        // Draw larger grid lines (10x size) with darker color
        const LARGE_GRID_SIZE = gridSize * 10;
        this.ctx.strokeStyle = '#aaa';
        this.ctx.lineWidth = 1;

        // Draw vertical large grid lines
        for (let x = Math.floor(startX / LARGE_GRID_SIZE) * LARGE_GRID_SIZE; x <= endX; x += LARGE_GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }

        // Draw horizontal large grid lines
        for (let y = Math.floor(startY / LARGE_GRID_SIZE) * LARGE_GRID_SIZE; y <= endY; y += LARGE_GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
    }

    drawWallDimension(wall) {
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

    drawRooms() {
        this.rooms.forEach(room => {
            if (!room.path || room.path.length < 3) return;

            // Fill the room with semi-transparent white
            this.ctx.fillStyle = 'rgba(255, 255, 255)';
            this.ctx.beginPath();
            this.ctx.moveTo(room.path[0].x, room.path[0].y);

            for (let i = 1; i < room.path.length; i++) {
                this.ctx.lineTo(room.path[i].x, room.path[i].y);
            }

            this.ctx.closePath();
            this.ctx.fill();

            // Calculate room center
            const center = this.calculatePolygonCentroid(room.path);

            // Get wall height from store (assuming it's in millimeters)
            const wallHeight = this.store.getters['walls/defaultHeight'] || 2700; // Default 2700mm if not set
            const heightInCm = Math.round(wallHeight / 10); // Convert to cm

            // Calculate internal area in square meters
            const internalArea = this.calculateInternalRoomArea(room);
            const areaInSqM = (internalArea / 10000).toFixed(2); // Convert from sq cm to sq m

            // Draw height label
            this.drawRoundedLabel(
                center.x,
                center.y - 20,
                `H=${heightInCm}`,
                '#2196F3' // Blue color for height
            );

            // Draw area label
            this.drawRoundedLabel(
                center.x,
                center.y + 20,
                `S=${areaInSqM} м²`,
                '#F44336' // Red color for area
            );
        });
    }

    // Helper method to draw rounded rectangle labels
    drawRoundedLabel(x, y, text, textColor) {
        this.ctx.save();

        // Text measurements
        this.ctx.font = 'bold 14px Arial';
        const metrics = this.ctx.measureText(text);
        const padding = 10;
        const width = metrics.width + padding * 2;
        const height = 24; // Fixed height for the rectangle
        const radius = 12; // Border radius

        // Draw rounded rectangle
        this.ctx.beginPath();
        this.ctx.moveTo(x - width/2 + radius, y - height/2);
        this.ctx.lineTo(x + width/2 - radius, y - height/2);
        this.ctx.arcTo(x + width/2, y - height/2, x + width/2, y - height/2 + radius, radius);
        this.ctx.lineTo(x + width/2, y + height/2 - radius);
        this.ctx.arcTo(x + width/2, y + height/2, x + width/2 - radius, y + height/2, radius);
        this.ctx.lineTo(x - width/2 + radius, y + height/2);
        this.ctx.arcTo(x - width/2, y + height/2, x - width/2, y + height/2 - radius, radius);
        this.ctx.lineTo(x - width/2, y - height/2 + radius);
        this.ctx.arcTo(x - width/2, y - height/2, x - width/2 + radius, y - height/2, radius);
        this.ctx.closePath();

        // Fill and stroke
        this.ctx.fillStyle = 'white';
        this.ctx.fill();
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Draw text
        this.ctx.fillStyle = textColor;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x, y);

        this.ctx.restore();
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

        const alignment = this.checkWallAlignment(this.startPoint, this.currentPoint);
        
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 3]);

        // Draw all guides dimmed first
        this.ctx.strokeStyle = 'rgba(0, 150, 255, 0.3)';

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

        // 45° diagonal guides
        this.ctx.beginPath();
        let x1 = this.startPoint.x - ALIGNMENT_LINE_LENGTH;
        let y1 = this.alignmentGuides.diagonal45.offset + x1;
        let x2 = this.startPoint.x + ALIGNMENT_LINE_LENGTH;
        let y2 = this.alignmentGuides.diagonal45.offset + x2;
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        this.ctx.beginPath();
        x1 = this.startPoint.x - ALIGNMENT_LINE_LENGTH;
        y1 = this.alignmentGuides.diagonal135.offset - x1;
        x2 = this.startPoint.x + ALIGNMENT_LINE_LENGTH;
        y2 = this.alignmentGuides.diagonal135.offset - x2;
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        // If there's an active alignment, highlight that guide
        if (alignment) {
            this.ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
            this.ctx.lineWidth = 2;

            switch (alignment.angle) {
                case 0:
                case 180:
                    // Highlight horizontal guide
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.startPoint.x - ALIGNMENT_LINE_LENGTH, this.alignmentGuides.horizontal.y);
                    this.ctx.lineTo(this.startPoint.x + ALIGNMENT_LINE_LENGTH, this.alignmentGuides.horizontal.y);
                    this.ctx.stroke();
                    break;
                case 90:
                case 270:
                    // Highlight vertical guide
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.alignmentGuides.vertical.x, this.startPoint.y - ALIGNMENT_LINE_LENGTH);
                    this.ctx.lineTo(this.alignmentGuides.vertical.x, this.startPoint.y + ALIGNMENT_LINE_LENGTH);
                    this.ctx.stroke();
                    break;
                case 45:
                case 225:
                    // Highlight 45° diagonal
                    this.ctx.beginPath();
                    x1 = this.startPoint.x - ALIGNMENT_LINE_LENGTH;
                    y1 = this.alignmentGuides.diagonal45.offset + x1;
                    x2 = this.startPoint.x + ALIGNMENT_LINE_LENGTH;
                    y2 = this.alignmentGuides.diagonal45.offset + x2;
                    this.ctx.moveTo(x1, y1);
                    this.ctx.lineTo(x2, y2);
                    this.ctx.stroke();
                    break;
                case 135:
                case 315:
                    // Highlight 135° diagonal
                    this.ctx.beginPath();
                    x1 = this.startPoint.x - ALIGNMENT_LINE_LENGTH;
                    y1 = this.alignmentGuides.diagonal135.offset - x1;
                    x2 = this.startPoint.x + ALIGNMENT_LINE_LENGTH;
                    y2 = this.alignmentGuides.diagonal135.offset - x2;
                    this.ctx.moveTo(x1, y1);
                    this.ctx.lineTo(x2, y2);
                    this.ctx.stroke();
                    break;
            }
        }

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
        const wallThickness = this.store.getters['walls/defaultThickness'] / 10;

        // Draw the temporary wall
        this.ctx.strokeStyle = 'rgba(50, 50, 200, 0.6)';
        this.ctx.lineWidth = wallThickness;

        this.ctx.beginPath();
        this.ctx.moveTo(this.startPoint.x, this.startPoint.y);
        this.ctx.lineTo(endPoint.x, endPoint.y);
        this.ctx.stroke();

        // Find connected walls at the start point
        const connectedWalls = this.findWallsConnectedToPoint(this.startPoint);
        
        // Draw angles between the temporary wall and connected walls
        connectedWalls.forEach(connectedWall => {
            this.drawConstructionAngle(this.startPoint, endPoint, connectedWall);
        });

        // Draw grid snap indicators
        if (!this.magnetPoint) {
            const snapIndicators = this.getGridSnapIndicators(endPoint);
            
            if (snapIndicators.showVertical || snapIndicators.showHorizontal) {
                this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([4, 4]);

                if (snapIndicators.showVertical) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(snapIndicators.gridX, 0);
                    this.ctx.lineTo(snapIndicators.gridX, this.canvas.height);
                    this.ctx.stroke();
                }

                if (snapIndicators.showHorizontal) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, snapIndicators.gridY);
                    this.ctx.lineTo(this.canvas.width, snapIndicators.gridY);
                    this.ctx.stroke();
                }

                this.ctx.setLineDash([]);
            }
        }

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

    // New method to draw angle during wall construction
    drawConstructionAngle(startPoint, endPoint, connectedWall) {
        // Calculate vectors
        const tempWallVector = {
            x: endPoint.x - startPoint.x,
            y: endPoint.y - startPoint.y
        };

        // Determine which end of the connected wall to use
        const isStartConnection = this.distance(connectedWall.start, startPoint) < 1;
        const connectedVector = {
            x: isStartConnection ? 
                connectedWall.end.x - connectedWall.start.x :
                connectedWall.start.x - connectedWall.end.x,
            y: isStartConnection ?
                connectedWall.end.y - connectedWall.start.y :
                connectedWall.start.y - connectedWall.end.y
        };

        // Calculate angles
        const angle1 = Math.atan2(connectedVector.y, connectedVector.x);
        const angle2 = Math.atan2(tempWallVector.y, tempWallVector.x);
        
        // Calculate the angle between the walls (in degrees)
        let angleDiff = (angle2 - angle1) * 180 / Math.PI;
        
        // Normalize angle to be between 0 and 180
        if (angleDiff < 0) angleDiff += 360;
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        // Draw arc
        const radius = 40; // Radius for the angle arc
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#E91E63'; // Pink color for the angle indicator
        this.ctx.lineWidth = 2;

        // Draw the arc
        this.ctx.beginPath();
        this.ctx.arc(startPoint.x, startPoint.y, radius, 
            Math.min(angle1, angle2), Math.max(angle1, angle2));
        this.ctx.stroke();

        // Calculate position for angle text
        const midAngle = (angle1 + angle2) / 2;
        const textRadius = radius + 15;
        const textX = startPoint.x + textRadius * Math.cos(midAngle);
        const textY = startPoint.y + textRadius * Math.sin(midAngle);

        // Draw angle text with background
        this.ctx.font = 'bold 14px Arial';
        const angleText = `${angleDiff.toFixed(1)}°`;
        const textWidth = this.ctx.measureText(angleText).width;

        // Draw text background
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(
            textX - textWidth/2 - 4,
            textY - 10,
            textWidth + 8,
            20
        );

        // Draw text
        this.ctx.fillStyle = '#E91E63';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(angleText, textX, textY);

        // Draw small dots at the angle points
        this.ctx.fillStyle = '#E91E63';
        this.ctx.beginPath();
        this.ctx.arc(startPoint.x, startPoint.y, 3, 0, Math.PI * 2);
        this.ctx.fill();
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
        // Convert walls to the format expected by store
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

        // Save walls and rooms to their respective stores
        this.store.commit('walls/setWalls', wallElements);
        this.store.commit('rooms/setRooms', roomElements);

        // Add to history
        const elements = [...wallElements, ...roomElements];
        this.store.commit('history/addToHistory', elements);
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
        // Load walls from walls module
        const wallElements = this.store.state.walls.walls || [];
        // Load rooms from rooms module
        const roomElements = this.store.state.rooms.rooms || [];

        // Reset collections
        this.walls = [];
        this.rooms = [];

        // Process walls
        wallElements.forEach(element => {
                this.walls.push({
                    id: element.id,
                    start: { x: element.start.x, y: element.start.y },
                    end: { x: element.end.x, y: element.end.y },
                    thickness: element.thickness / 10 // Convert mm to canvas units with adjusted ratio
                });
        });

        // Process rooms
        roomElements.forEach(element => {
                this.rooms.push({
                    id: element.id,
                    path: element.path,
                    area: element.area,
                    color: element.color
                });
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
        // Calculate wall orientation
        const dx = Math.abs(wall.end.x - wall.start.x);
        const dy = Math.abs(wall.end.y - wall.start.y);
        const isHorizontal = dx > dy;

        // Calculate center point of wall
        const centerX = (wall.start.x + wall.end.x) / 2;
        const centerY = (wall.start.y + wall.end.y) / 2;
        
        // Calculate movement vector
        const moveX = point.x - centerX;
        const moveY = point.y - centerY;

        // Constrain movement based on wall orientation:
        // - Horizontal walls can only move vertically
        // - Vertical walls can only move horizontally
        const movement = {
            x: isHorizontal ? 0 : moveX,
            y: isHorizontal ? moveY : 0
        };

        return movement;
    }

    findWallsConnectedToPoint(point) {
        return this.walls.filter(wall => 
            this.distance(wall.start, point) < 1 || 
            this.distance(wall.end, point) < 1
        );
    }

    // Calculate rectangle points for wall rendering
    calculateWallRectangle(start, end, thickness) {
        // Calculate wall vector
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        // Return null if wall has no length
        if (length === 0) return null;

        // Calculate normalized perpendicular vector
        const perpX = -dy / length;
        const perpY = dx / length;

        // Calculate half thickness
        const halfThickness = thickness / 2;

        // Calculate the four corners of the wall rectangle
        return [
            {
                x: start.x + perpX * halfThickness,
                y: start.y + perpY * halfThickness
            },
            {
                x: end.x + perpX * halfThickness,
                y: end.y + perpY * halfThickness
            },
            {
                x: end.x - perpX * halfThickness,
                y: end.y - perpY * halfThickness
            },
            {
                x: start.x - perpX * halfThickness,
                y: start.y - perpY * halfThickness
            }
        ];
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

    // Helper method to check if a point is near another point
    isNearPoint(point1, point2, customThreshold = null) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        const threshold = (customThreshold || 5) / this.transformManager.zoom;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
    }

    // Move the start point of a wall
    moveWallStart(wall, newPoint) {
        // Find all walls that share this point
        const connectedWalls = this.walls.filter(w => 
            w.id !== wall.id && (
                this.distance(w.start, wall.start) < 1 ||
                this.distance(w.end, wall.start) < 1
            )
        );

        // Create a shared point object to maintain connection
        const sharedPoint = {
            x: newPoint.x,
            y: newPoint.y
        };

        // Store original position for calculating movement vector
        const originalPoint = { ...wall.start };

        // Update the active wall's start point
        wall.start = sharedPoint;

        // Update all connected walls
        connectedWalls.forEach(connectedWall => {
            if (this.distance(connectedWall.start, originalPoint) < 1) {
                // If connected at start, move start point
                connectedWall.start = sharedPoint;
            } else if (this.distance(connectedWall.end, originalPoint) < 1) {
                // If connected at end, move end point
                connectedWall.end = sharedPoint;
            }

            // Update any walls connected to the other end of the connected wall
            const otherEndConnections = this.walls.filter(w =>
                w.id !== connectedWall.id && w.id !== wall.id && (
                    (this.distance(w.start, connectedWall.start) < 1 && !this.distance(connectedWall.start, sharedPoint) < 1) ||
                    (this.distance(w.start, connectedWall.end) < 1 && !this.distance(connectedWall.end, sharedPoint) < 1) ||
                    (this.distance(w.end, connectedWall.start) < 1 && !this.distance(connectedWall.start, sharedPoint) < 1) ||
                    (this.distance(w.end, connectedWall.end) < 1 && !this.distance(connectedWall.end, sharedPoint) < 1)
                )
            );

            otherEndConnections.forEach(connection => {
                // Maintain relative positions of other connected walls
                if (this.distance(connection.start, connectedWall.start) < 1) {
                    connection.start = connectedWall.start;
                }
                if (this.distance(connection.start, connectedWall.end) < 1) {
                    connection.start = connectedWall.end;
                }
                if (this.distance(connection.end, connectedWall.start) < 1) {
                    connection.end = connectedWall.start;
                }
                if (this.distance(connection.end, connectedWall.end) < 1) {
                    connection.end = connectedWall.end;
                }
            });
        });

        // Detect and update rooms after moving walls
        this.detectRooms();
    }

    // Move the end point of a wall
    moveWallEnd(wall, newPoint) {
        // Find all walls that share this point
        const connectedWalls = this.walls.filter(w => 
            w.id !== wall.id && (
                this.distance(w.start, wall.end) < 1 ||
                this.distance(w.end, wall.end) < 1
            )
        );

        // Create a shared point object to maintain connection
        const sharedPoint = {
            x: newPoint.x,
            y: newPoint.y
        };

        // Store original position for calculating movement vector
        const originalPoint = { ...wall.end };

        // Update the active wall's end point
        wall.end = sharedPoint;

        // Update all connected walls
        connectedWalls.forEach(connectedWall => {
            if (this.distance(connectedWall.start, originalPoint) < 1) {
                // If connected at start, move start point
                connectedWall.start = sharedPoint;
            } else if (this.distance(connectedWall.end, originalPoint) < 1) {
                // If connected at end, move end point
                connectedWall.end = sharedPoint;
            }

            // Update any walls connected to the other end of the connected wall
            const otherEndConnections = this.walls.filter(w =>
                w.id !== connectedWall.id && w.id !== wall.id && (
                    (this.distance(w.start, connectedWall.start) < 1 && !this.distance(connectedWall.start, sharedPoint) < 1) ||
                    (this.distance(w.start, connectedWall.end) < 1 && !this.distance(connectedWall.end, sharedPoint) < 1) ||
                    (this.distance(w.end, connectedWall.start) < 1 && !this.distance(connectedWall.start, sharedPoint) < 1) ||
                    (this.distance(w.end, connectedWall.end) < 1 && !this.distance(connectedWall.end, sharedPoint) < 1)
                )
            );

            otherEndConnections.forEach(connection => {
                // Maintain relative positions of other connected walls
                if (this.distance(connection.start, connectedWall.start) < 1) {
                    connection.start = connectedWall.start;
                }
                if (this.distance(connection.start, connectedWall.end) < 1) {
                    connection.start = connectedWall.end;
                }
                if (this.distance(connection.end, connectedWall.start) < 1) {
                    connection.end = connectedWall.start;
                }
                if (this.distance(connection.end, connectedWall.end) < 1) {
                    connection.end = connectedWall.end;
                }
            });
        });

        // Detect and update rooms after moving walls
        this.detectRooms();
    }

    // Move the entire wall
    moveEntireWall(wall, point) {
        // Apply constrained movement
        const movement = this.constrainMovement(wall, point);

        // Store original positions
        const originalStart = { ...wall.start };
        const originalEnd = { ...wall.end };

        // Find all connected walls before moving
        const connectedWalls = this.findAllConnectedWalls(wall);

        // Create new shared points for the moved positions
        const newStartPoint = {
            x: wall.start.x + movement.x,
            y: wall.start.y + movement.y
        };
        const newEndPoint = {
            x: wall.end.x + movement.x,
            y: wall.end.y + movement.y
        };

        // Update the moving wall's points
        wall.start = newStartPoint;
        wall.end = newEndPoint;

        // Update all connected walls to use the new shared points
        connectedWalls.forEach(connectedWall => {
            if (this.distance(connectedWall.start, originalStart) < 1) {
                connectedWall.start = newStartPoint;
            }
            if (this.distance(connectedWall.end, originalStart) < 1) {
                connectedWall.end = newStartPoint;
            }
            if (this.distance(connectedWall.start, originalEnd) < 1) {
                connectedWall.start = newEndPoint;
            }
            if (this.distance(connectedWall.end, originalEnd) < 1) {
                connectedWall.end = newEndPoint;
            }
        });

        // After moving, check if any walls need to be split
        const wallsToCheck = this.walls.filter(w => 
            w.id !== wall.id && !connectedWalls.includes(w)
        );

        for (const existingWall of wallsToCheck) {
            const intersection = this.findWallIntersectionPoint(wall, existingWall);
            if (intersection) {
                // Only split if this is a new intersection
                const isNewIntersection = !connectedWalls.some(w => 
                    this.distance(w.start, intersection) < 1 || 
                    this.distance(w.end, intersection) < 1
                );

                if (isNewIntersection) {
                    this.splitWallAtPoint(existingWall, intersection, wall);
                }
            }
        }

        // Update all connections again after any new splits
        const allConnectedWalls = this.findAllConnectedWalls(wall);
        this.updateSharedPoints(wall, allConnectedWalls);
    }

    // Helper method to find all walls connected at a point
    findConnectedWallsAtPoint(point) {
        return this.walls.filter(wall =>
            this.distance(wall.start, point) < 1 ||
            this.distance(wall.end, point) < 1
        );
    }

    // Add new method to check wall alignment
    checkWallAlignment(startPoint, endPoint) {
        if (!startPoint || !endPoint) return null;

        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;

        // Check alignment with predefined angles
        for (const alignmentAngle of ALIGNMENT_ANGLES) {
            if (Math.abs(angle - alignmentAngle) < ALIGNMENT_SNAP_THRESHOLD) {
                // Calculate the aligned end point
                const length = Math.sqrt(dx * dx + dy * dy);
                const alignedAngle = alignmentAngle * Math.PI / 180;
                return {
                    angle: alignmentAngle,
                    snappedPoint: {
                        x: startPoint.x + length * Math.cos(alignedAngle),
                        y: startPoint.y + length * Math.sin(alignedAngle)
                    }
                };
            }
        }

        return null;
    }

    // Add helper method to check if a point is under the mouse
    isPointUnderMouse(point) {
        if (!this.currentPoint) return false;
        return this.isNearPoint(this.currentPoint, point, Math.max(
            CONTROL_POINT_HIT_AREA.END,
            CONTROL_POINT_HIT_AREA.MIDDLE
        ));
    }

    // New method to get grid snap indicators
    getGridSnapIndicators(point) {
        const snapDistance = 5; // Pixels within which to show snap indicators
        const nearestGridX = Math.round(point.x / GRID_SIZE) * GRID_SIZE;
        const nearestGridY = Math.round(point.y / GRID_SIZE) * GRID_SIZE;
        
        return {
            showVertical: Math.abs(point.x - nearestGridX) < snapDistance / this.zoom,
            showHorizontal: Math.abs(point.y - nearestGridY) < snapDistance / this.zoom,
            gridX: nearestGridX,
            gridY: nearestGridY
        };
    }

    calculateInternalRoomArea(room) {
        if (!room.path || room.path.length < 3) return 0;

        // Get all walls that form this room's boundary
        const roomWalls = [];
        for (let i = 0; i < room.path.length; i++) {
            const point1 = room.path[i];
            const point2 = room.path[(i + 1) % room.path.length];
            
            // Find the wall that connects these points
            const wall = this.walls.find(w => 
                (this.distance(w.start, point1) < 1 && this.distance(w.end, point2) < 1) ||
                (this.distance(w.start, point2) < 1 && this.distance(w.end, point1) < 1)
            );
            
            if (wall) {
                roomWalls.push({
                    wall,
                    startPoint: point1,
                    endPoint: point2
                });
            }
        }

        // Calculate internal points considering wall thickness
        const internalPoints = [];
        for (let i = 0; i < roomWalls.length; i++) {
            const currentWallInfo = roomWalls[i];
            const nextWallInfo = roomWalls[(i + 1) % roomWalls.length];
            const prevWallInfo = roomWalls[(i - 1 + roomWalls.length) % roomWalls.length];

            const currentWall = currentWallInfo.wall;
            const nextWall = nextWallInfo.wall;
            const prevWall = prevWallInfo.wall;

            // Calculate vectors for current wall
            const isCurrentWallReversed = this.distance(currentWall.end, currentWallInfo.endPoint) < 1;
            const currentVector = {
                x: isCurrentWallReversed ? 
                    currentWall.start.x - currentWall.end.x :
                    currentWall.end.x - currentWall.start.x,
                y: isCurrentWallReversed ? 
                    currentWall.start.y - currentWall.end.y :
                    currentWall.end.y - currentWall.start.y
            };
            const currentLength = Math.sqrt(currentVector.x * currentVector.x + currentVector.y * currentVector.y);
            const currentNormal = {
                x: -currentVector.y / currentLength,
                y: currentVector.x / currentLength
            };

            // Calculate vectors for next wall
            const isNextWallReversed = this.distance(nextWall.end, nextWallInfo.endPoint) < 1;
            const nextVector = {
                x: isNextWallReversed ? 
                    nextWall.start.x - nextWall.end.x :
                    nextWall.end.x - nextWall.start.x,
                y: isNextWallReversed ? 
                    nextWall.start.y - nextWall.end.y :
                    nextWall.end.y - nextWall.start.y
            };
            const nextLength = Math.sqrt(nextVector.x * nextVector.x + nextVector.y * nextVector.y);
            const nextNormal = {
                x: -nextVector.y / nextLength,
                y: nextVector.x / nextLength
            };

            // Calculate the corner point
            const cornerPoint = currentWallInfo.endPoint;
            
            // Determine if normals point inside the room
            const center = this.calculatePolygonCentroid(room.path);
            const toCenter = {
                x: center.x - cornerPoint.x,
                y: center.y - cornerPoint.y
            };

            // Ensure normals point inside
            if (currentNormal.x * toCenter.x + currentNormal.y * toCenter.y < 0) {
                currentNormal.x = -currentNormal.x;
                currentNormal.y = -currentNormal.y;
            }
            if (nextNormal.x * toCenter.x + nextNormal.y * toCenter.y < 0) {
                nextNormal.x = -nextNormal.x;
                nextNormal.y = -nextNormal.y;
            }

            // Calculate the internal corner point
            const internalCorner = this.calculateInternalCorner(
                cornerPoint,
                currentNormal,
                currentWall.thickness / 2,
                nextNormal,
                nextWall.thickness / 2
            );

            internalPoints.push(internalCorner);
        }

        // Calculate area of the internal polygon
        let area = 0;
        for (let i = 0; i < internalPoints.length; i++) {
            const j = (i + 1) % internalPoints.length;
            area += internalPoints[i].x * internalPoints[j].y;
            area -= internalPoints[j].x * internalPoints[i].y;
        }

        return Math.abs(area) / 2;
    }

    calculateInternalCorner(corner, normal1, thickness1, normal2, thickness2) {
        // Calculate offset points along each wall
        const offset1 = {
            x: corner.x + normal1.x * thickness1,
            y: corner.y + normal1.y * thickness1
        };
        const offset2 = {
            x: corner.x + normal2.x * thickness2,
            y: corner.y + normal2.y * thickness2
        };

        // Calculate the intersection of the offset lines
        const dir1 = { x: -normal1.y, y: normal1.x };
        const dir2 = { x: -normal2.y, y: normal2.x };

        // Parametric intersection calculation
        const denominator = dir1.x * dir2.y - dir1.y * dir2.x;
        if (Math.abs(denominator) < 0.001) {
            // Lines are parallel, return midpoint
            return {
                x: (offset1.x + offset2.x) / 2,
                y: (offset1.y + offset2.y) / 2
            };
        }

        const t = ((offset2.x - offset1.x) * dir2.y - (offset2.y - offset1.y) * dir2.x) / denominator;

        return {
            x: offset1.x + dir1.x * t,
            y: offset1.y + dir1.y * t
        };
    }

    // Add new method to split a wall at a given point
    splitWallAtPoint(wall, intersectionPoint, dividingWall) {
        // Calculate the wall vector
        const wallVector = {
            x: wall.end.x - wall.start.x,
            y: wall.end.y - wall.start.y
        };
        const length = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);
        const unitVector = {
            x: wallVector.x / length,
            y: wallVector.y / length
        };

        // Calculate the dividing wall's direction vector
        const dividingWallVector = {
            x: dividingWall.end.x - dividingWall.start.x,
            y: dividingWall.end.y - dividingWall.start.y
        };
        const dividingLength = Math.sqrt(
            dividingWallVector.x * dividingWallVector.x + 
            dividingWallVector.y * dividingWallVector.y
        );
        const dividingUnitVector = {
            x: dividingWallVector.x / dividingLength,
            y: dividingWallVector.y / dividingLength
        };

        // Create two new walls that meet at the intersection point
        const wall1 = {
            id: Date.now().toString(),
            start: { ...wall.start },
            end: { 
                x: intersectionPoint.x,
                y: intersectionPoint.y
            },
            thickness: wall.thickness
        };

        const wall2 = {
            id: (Date.now() + 1).toString(),
            start: { 
                x: intersectionPoint.x,
                y: intersectionPoint.y
            },
            end: { ...wall.end },
            thickness: wall.thickness
        };

        // Find and update connections for the original wall
        const connectedWalls = this.findWallsConnectedToPoint(wall.start)
            .concat(this.findWallsConnectedToPoint(wall.end))
            .filter(w => w.id !== wall.id);

        // Update connections for the new walls
        connectedWalls.forEach(connectedWall => {
            if (this.distance(connectedWall.start, wall.start) < 1) {
                connectedWall.start = wall1.start;
            } else if (this.distance(connectedWall.end, wall.start) < 1) {
                connectedWall.end = wall1.start;
            } else if (this.distance(connectedWall.start, wall.end) < 1) {
                connectedWall.start = wall2.end;
            } else if (this.distance(connectedWall.end, wall.end) < 1) {
                connectedWall.end = wall2.end;
            }
        });

        // Remove the original wall and add the new walls
        this.walls = this.walls.filter(w => w.id !== wall.id);
        this.walls.push(wall1, wall2);

        return [wall1, wall2];
    }

    findAllConnectedWalls(wall) {
        const connectedWalls = new Set();
        const visited = new Set();
        const queue = [wall];

        while (queue.length > 0) {
            const currentWall = queue.shift();
            if (!visited.has(currentWall)) {
                visited.add(currentWall);
                connectedWalls.add(currentWall);
                const connectedPoints = this.findWallsConnectedToPoint(currentWall.start).concat(this.findWallsConnectedToPoint(currentWall.end));
                for (const connectedWall of connectedPoints) {
                    if (!visited.has(connectedWall)) {
                        queue.push(connectedWall);
                    }
                }
            }
        }

        return Array.from(connectedWalls);
    }

    updateSharedPoints(wall, connectedWalls) {
        const sharedPoints = new Map();

        for (const connectedWall of connectedWalls) {
            const startPoint = connectedWall.start;
            const endPoint = connectedWall.end;

            const startKey = `${startPoint.x},${startPoint.y}`;
            const endKey = `${endPoint.x},${endPoint.y}`;

            if (!sharedPoints.has(startKey)) {
                sharedPoints.set(startKey, { x: startPoint.x, y: startPoint.y, connectedWalls: [] });
            }
            if (!sharedPoints.has(endKey)) {
                sharedPoints.set(endKey, { x: endPoint.x, y: endPoint.y, connectedWalls: [] });
            }

            const sharedPoint = sharedPoints.get(startKey);
            sharedPoint.connectedWalls.push({ wall: connectedWall, isStart: true });

            const sharedPointEnd = sharedPoints.get(endKey);
            sharedPointEnd.connectedWalls.push({ wall: connectedWall, isStart: false });
        }

        for (const [key, sharedPoint] of sharedPoints) {
            if (sharedPoint.connectedWalls.length === 1) {
                const [wall, isStart] = sharedPoint.connectedWalls[0];
                if (isStart) {
                    wall.start = sharedPoint;
                } else {
                    wall.end = sharedPoint;
                }
            }
        }
    }

    // New method to draw angle between two walls
    drawWallAngle(wall1, wall2, sharedPoint) {
        // Calculate vectors for both walls from the shared point
        const vec1 = this.getWallVectorFromPoint(wall1, sharedPoint);
        const vec2 = this.getWallVectorFromPoint(wall2, sharedPoint);

        // Calculate angles
        const angle1 = Math.atan2(vec1.y, vec1.x);
        const angle2 = Math.atan2(vec2.y, vec2.x);

        // Calculate the angle between the walls (in degrees)
        let angleDiff = (angle2 - angle1) * 180 / Math.PI;
        
        // Normalize angle to be between 0 and 180
        if (angleDiff < 0) angleDiff += 360;
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        // Draw arc
        const radius = 30; // Radius for the angle arc
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#E91E63'; // Pink color for the angle indicator
        this.ctx.lineWidth = 2;

        // Draw the arc
        this.ctx.beginPath();
        this.ctx.arc(sharedPoint.x, sharedPoint.y, radius, 
            Math.min(angle1, angle2), Math.max(angle1, angle2));
        this.ctx.stroke();

        // Calculate position for angle text
        const midAngle = (angle1 + angle2) / 2;
        const textRadius = radius + 15;
        const textX = sharedPoint.x + textRadius * Math.cos(midAngle);
        const textY = sharedPoint.y + textRadius * Math.sin(midAngle);

        // Draw angle text with background
        this.ctx.font = 'bold 14px Arial';
        const angleText = `${angleDiff.toFixed(1)}°`;
        const textWidth = this.ctx.measureText(angleText).width;

        // Draw text background
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(
            textX - textWidth/2 - 4,
            textY - 10,
            textWidth + 8,
            20
        );

        // Draw text
        this.ctx.fillStyle = '#E91E63';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(angleText, textX, textY);

        // Draw small dots at the angle points
        this.ctx.fillStyle = '#E91E63';
        this.ctx.beginPath();
        this.ctx.arc(sharedPoint.x, sharedPoint.y, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // Helper method to get wall vector from a point
    getWallVectorFromPoint(wall, point) {
        // Determine if the point is at the start or end of the wall
        const isStart = this.distance(wall.start, point) < 1;
        
        return {
            x: isStart ? wall.end.x - wall.start.x : wall.start.x - wall.end.x,
            y: isStart ? wall.end.y - wall.start.y : wall.start.y - wall.end.y
        };
    }

    // Add a no-op onClick method to prevent errors
    onClick(e) {
        // No operation needed for wall clicks (handled by mousedown/up)
    }

    onWheel(e) {
        e.preventDefault();

        // Get mouse position before zoom
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Convert mouse position to world coordinates before zoom
        const worldX = (mouseX - this.transformManager.panOffset.x) / this.transformManager.zoom;
        const worldY = (mouseY - this.transformManager.panOffset.y) / this.transformManager.zoom;

        // Calculate new zoom level
        const zoomDelta = e.deltaY > 0 ? (1 - this.zoomFactor) : (1 + this.zoomFactor);
        const newZoom = Math.min(Math.max(this.minZoom, this.transformManager.zoom * zoomDelta), this.maxZoom);
        
        // Only proceed if zoom actually changed
        if (newZoom !== this.transformManager.zoom) {
            // Calculate new pan offset to keep the mouse point stationary
            const newPanX = mouseX - worldX * newZoom;
            const newPanY = mouseY - worldY * newZoom;

            // Update transform
            this.transformManager.zoom = newZoom;
            this.transformManager.panOffset = { x: newPanX, y: newPanY };

            // Update store with new transform
            this.store.commit('canvas/updateTransform', {
                zoom: newZoom,
                panOffset: { x: newPanX, y: newPanY }
            });

            // Redraw
            this.draw();
        }
    }
}