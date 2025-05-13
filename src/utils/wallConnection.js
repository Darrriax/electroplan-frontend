// wallConnection.js - Wall connection and joining functionality

// Constants brought over from the main file
const WALL_FILL_COLOR = 'rgba(220, 220, 220, 0.8)'; // Light gray fill for walls
const WALL_STROKE_COLOR = '#333'; // Dark gray stroke for walls

class WallConnectionManager {
    constructor() {
        // Empty constructor since this is a utility class
    }

    // Check if two walls share a connection point
    isWallsConnected(wall1, wall2) {
        // Check if walls share endpoints
        return (
            this.pointsAreEqual(wall1.start, wall2.start) ||
            this.pointsAreEqual(wall1.start, wall2.end) ||
            this.pointsAreEqual(wall1.end, wall2.start) ||
            this.pointsAreEqual(wall1.end, wall2.end)
        );
    }

    // Calculate extended endpoints for walls to create proper miter joins
    calculateExtendedEndpoints(wall, connectedWalls) {
        const result = {
            startConnections: [],
            endConnections: []
        };

        // Process start point connections
        const startConnections = connectedWalls.filter(otherWall =>
            this.pointsAreEqual(wall.start, otherWall.start) ||
            this.pointsAreEqual(wall.start, otherWall.end)
        );

        startConnections.forEach(connectedWall => {
            // Determine which end of the connected wall matches
            const isConnectedStart = this.pointsAreEqual(wall.start, connectedWall.start);

            // Calculate vectors with consistent direction (always pointing away from junction)
            const wallVector = {
                x: wall.end.x - wall.start.x,
                y: wall.end.y - wall.start.y
            };

            const connectedVector = isConnectedStart ?
                { x: connectedWall.end.x - connectedWall.start.x, y: connectedWall.end.y - connectedWall.start.y } :
                { x: connectedWall.start.x - connectedWall.end.x, y: connectedWall.start.y - connectedWall.end.y };

            result.startConnections.push({
                wall: connectedWall,
                wallVector,
                connectedVector
            });
        });

        // Process end point connections
        const endConnections = connectedWalls.filter(otherWall =>
            this.pointsAreEqual(wall.end, otherWall.start) ||
            this.pointsAreEqual(wall.end, otherWall.end)
        );

        endConnections.forEach(connectedWall => {
            // Determine which end of the connected wall matches
            const isConnectedStart = this.pointsAreEqual(wall.end, connectedWall.start);

            // Calculate vectors with consistent direction (always pointing away from junction)
            const wallVector = {
                x: wall.start.x - wall.end.x,
                y: wall.start.y - wall.end.y
            };

            const connectedVector = isConnectedStart ?
                { x: connectedWall.end.x - connectedWall.start.x, y: connectedWall.end.y - connectedWall.start.y } :
                { x: connectedWall.start.x - connectedWall.end.x, y: connectedWall.start.y - connectedWall.end.y };

            result.endConnections.push({
                wall: connectedWall,
                wallVector,
                connectedVector
            });
        });

        return result;
    }

    // Connect walls together
    connectWalls(newWall, connection, isEnd = false) {
        const connectionPoint = connection.point;
        const oldWall = connection.wall;

        // Determine which end of the new wall to connect
        const newWallPoint = isEnd ? 'end' : 'start';

        if (connection.isEnd === true) {
            // Connect to the end of the old wall
            // Important: Don't modify the old wall's endpoints unnecessarily
            // Just ensure the connection point matches exactly
            if (!this.pointsAreEqual(oldWall.end, connectionPoint)) {
                oldWall.end = { ...connectionPoint };
            }
            newWall[newWallPoint] = { ...connectionPoint };
        } else if (connection.isEnd === false) {
            // Connect to the start of the old wall
            // Important: Don't modify the old wall's endpoints unnecessarily
            if (!this.pointsAreEqual(oldWall.start, connectionPoint)) {
                oldWall.start = { ...connectionPoint };
            }
            newWall[newWallPoint] = { ...connectionPoint };
        } else {
            // Connect to the middle of the old wall - split the old wall
            const newWallId = Date.now().toString() + '_split';
            const splitWall = {
                id: newWallId,
                start: { ...connectionPoint },
                end: { ...oldWall.end },
                thickness: oldWall.thickness
            };

            // Adjust the original wall
            oldWall.end = { ...connectionPoint };

            // Add the new split wall
            return splitWall; // Return the new wall segment
        }

        return null; // No new wall segment created
    }

    // Draw wall with connections
    // Виправлена функція для малювання стіни з з'єднаннями
    drawWallWithConnections(ctx, wall, connectedWalls, drawnConnections) {
        // Обчислення вектора стіни та нормалі
        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < 0.001) return; // Пропустити малювання, якщо довжина занадто мала

        // Обчислення нормального вектора (перпендикулярно до стіни)
        const nx = -dy / length;
        const ny = dx / length;

        // Обчислення половини товщини
        const halfThick = wall.thickness / 2;

        // Базові точки прямокутника - без деформації
        let p1 = { x: wall.start.x + nx * halfThick, y: wall.start.y + ny * halfThick };
        let p2 = { x: wall.end.x + nx * halfThick, y: wall.end.y + ny * halfThick };
        let p3 = { x: wall.end.x - nx * halfThick, y: wall.end.y - ny * halfThick };
        let p4 = { x: wall.start.x - nx * halfThick, y: wall.start.y - ny * halfThick };

        // Малювання стіни як простого прямокутника без деформації кутів
        ctx.fillStyle = WALL_FILL_COLOR;
        ctx.strokeStyle = WALL_STROKE_COLOR;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
    }

// Спрощений метод calculateMiterPoints (більше не використовується для деформації кутів)
    calculateMiterPoints(point, connections, thickness) {
        // Просто повертаємо null, щоб не застосовувати деформацію кутів
        return null;
    }

    // Try to merge collinear walls
    tryMergeWalls(existingWall, newWall, connectionIsEnd) {
        // Check if walls are on the same line (collinear)
        if (!this.areWallsCollinear(existingWall, newWall)) {
            return false;
        }

        // Determine which wall points to keep based on which extend the line the furthest
        if (connectionIsEnd === true) {
            // Existing wall's end connects to new wall's start
            if (!this.pointsAreEqual(existingWall.end, newWall.start)) {
                return false; // Can't merge if connection points don't match
            }

            // Check if newWall extends existingWall in the same direction
            const existingVector = this.normalizeVector({
                x: existingWall.end.x - existingWall.start.x,
                y: existingWall.end.y - existingWall.start.y
            });

            const newVector = this.normalizeVector({
                x: newWall.end.x - newWall.start.x,
                y: newWall.end.y - newWall.start.y
            });

            // Check if they have the same direction (dot product > 0)
            if (existingVector.x * newVector.x + existingVector.y * newVector.y > 0) {
                // Same direction - extend the wall without changing its orientation
                existingWall.end = { ...newWall.end };
                return true;
            }
        } else if (connectionIsEnd === false) {
            // Existing wall's start connects to new wall's start
            if (!this.pointsAreEqual(existingWall.start, newWall.start)) {
                return false; // Can't merge if connection points don't match
            }

            // Check if newWall extends existingWall in the same direction
            const existingVector = this.normalizeVector({
                x: existingWall.start.x - existingWall.end.x,
                y: existingWall.start.y - existingWall.end.y
            });

            const newVector = this.normalizeVector({
                x: newWall.end.x - newWall.start.x,
                y: newWall.end.y - newWall.start.y
            });

            // Check if they have the same direction (dot product > 0)
            if (existingVector.x * newVector.x + existingVector.y * newVector.y > 0) {
                // Same direction - extend the wall without changing its orientation
                existingWall.start = { ...newWall.end };
                return true;
            }
        }

        return false;
    }

    // Normalize a vector to unit length
    normalizeVector(vector) {
        const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        if (length < 0.001) return { x: 0, y: 0 };
        return {
            x: vector.x / length,
            y: vector.y / length
        };
    }

    // Check if two walls are collinear (on the same line)
    areWallsCollinear(wall1, wall2) {
        // Calculate slopes
        const dx1 = wall1.end.x - wall1.start.x;
        const dy1 = wall1.end.y - wall1.start.y;
        const dx2 = wall2.end.x - wall2.start.x;
        const dy2 = wall2.end.y - wall2.start.y;

        // Handle vertical lines
        if (Math.abs(dx1) < 0.001 && Math.abs(dx2) < 0.001) {
            return true; // Both walls are vertical
        }

        // Handle horizontal lines
        if (Math.abs(dy1) < 0.001 && Math.abs(dy2) < 0.001) {
            return true; // Both walls are horizontal
        }

        // Compare slopes for non-horizontal/vertical lines
        if (Math.abs(dx1) > 0.001 && Math.abs(dx2) > 0.001) {
            const slope1 = dy1 / dx1;
            const slope2 = dy2 / dx2;

            // Check if slopes are approximately equal
            return Math.abs(slope1 - slope2) < 0.01;
        }

        return false; // Not collinear
    }

    // Helper to check if two points are essentially the same
    pointsAreEqual(p1, p2) {
        const tolerance = 0.001;
        return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
    }
}

export default WallConnectionManager;