// doors.js - Door functionality and default values

// Default door dimensions in centimeters
export const DEFAULT_DOOR_WIDTH = 80;  // Standard door width
export const DEFAULT_DOOR_HEIGHT = 210; // Standard door height
export const DEFAULT_DOOR_THICKNESS = 5; // Standard door thickness

// Door types and configurations
export const DOOR_TYPES = {
    SINGLE: 'single',
    DOUBLE: 'double',
    SLIDING: 'sliding'
};

// Opening directions
export const OPENING_DIRECTIONS = {
    LEFT: 'left',
    RIGHT: 'right'
};

// Opening orientations
export const OPENING_ORIENTATIONS = {
    INWARD: 'inward',
    OUTWARD: 'outward'
};

// Default door configuration
export const DEFAULT_DOOR_CONFIG = {
    type: DOOR_TYPES.SINGLE,
    width: DEFAULT_DOOR_WIDTH,
    height: DEFAULT_DOOR_HEIGHT,
    thickness: DEFAULT_DOOR_THICKNESS,
    openDirection: OPENING_DIRECTIONS.LEFT,
    openOrientation: OPENING_ORIENTATIONS.INWARD,
    openAngle: 80 // Default opening angle in degrees
};

// Validation functions
export const validateDoorDimensions = (width, height, wallHeight = 280) => {
    const minWidth = 60;  // Minimum door width
    const maxWidth = 200; // Maximum door width
    const minHeight = 180; // Minimum door height
    const maxHeight = wallHeight / 10; // Maximum door height (convert wall height from mm to cm)

    return {
        isValid: width >= minWidth && width <= maxWidth && height >= minHeight && height <= maxHeight,
        errors: {
            width: width < minWidth ? 'Width too small' : width > maxWidth ? 'Width too large' : null,
            height: height < minHeight ? 'Height too small' : 
                   height > maxHeight ? `Height too large (max ${Math.floor(maxHeight)}cm based on wall height)` : null
        }
    };
};

// Helper functions for door placement
export const calculateDoorOffset = (wallThickness) => {
    return wallThickness / 2; // Center of the wall
};

export const calculateDoorEndpoints = (wall, doorWidth, distanceFromStart) => {
    const wallLength = Math.sqrt(
        Math.pow(wall.end.x - wall.start.x, 2) + 
        Math.pow(wall.end.y - wall.start.y, 2)
    );

    // Normalize wall direction
    const dirX = (wall.end.x - wall.start.x) / wallLength;
    const dirY = (wall.end.y - wall.start.y) / wallLength;

    // Calculate door start and end points
    const doorStart = {
        x: wall.start.x + dirX * distanceFromStart,
        y: wall.start.y + dirY * distanceFromStart
    };

    const doorEnd = {
        x: doorStart.x + dirX * doorWidth,
        y: doorStart.y + dirY * doorWidth
    };

    return { doorStart, doorEnd };
};

// Calculate door opening arc points based on orientation and direction
export const calculateDoorOpeningPoints = (doorStart, doorEnd, openDirection, openOrientation, openAngle = 80) => {
    // Calculate door vector and length
    const doorVecX = doorEnd.x - doorStart.x;
    const doorVecY = doorEnd.y - doorStart.y;
    const doorLength = Math.sqrt(doorVecX * doorVecX + doorVecY * doorVecY);

    // Normalize door vector
    const doorDirX = doorVecX / doorLength;
    const doorDirY = doorVecY / doorLength;

    // Calculate perpendicular vector (rotate 90 degrees)
    // For inward/outward orientation, we'll use this to determine which side of the wall the arc appears
    const perpX = -doorDirY;
    const perpY = doorDirX;

    // Convert angle to radians
    const angleRad = (openAngle * Math.PI) / 180;

    // Determine the center point of rotation (door hinge position)
    const hingePoint = openDirection === OPENING_DIRECTIONS.LEFT ? doorStart : doorEnd;

    // Determine if we should flip the perpendicular vector based on orientation
    const orientationMultiplier = openOrientation === OPENING_ORIENTATIONS.OUTWARD ? -1 : 1;

    // Calculate arc control points
    const arcPoints = [];
    const numPoints = 20; // Number of points to create smooth arc
    
    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const currentAngle = t * angleRad;
        const cos = Math.cos(currentAngle);
        const sin = Math.sin(currentAngle);

        // If left-opening, we need to flip the calculation
        const isLeft = openDirection === OPENING_DIRECTIONS.LEFT;
        const directionMultiplier = isLeft ? -1 : 1;

        // Calculate rotated point
        const rotatedX = doorLength * (cos * doorDirX + directionMultiplier * orientationMultiplier * sin * perpX);
        const rotatedY = doorLength * (cos * doorDirY + directionMultiplier * orientationMultiplier * sin * perpY);

        arcPoints.push({
            x: hingePoint.x + (isLeft ? 0 : -rotatedX),
            y: hingePoint.y + (isLeft ? 0 : -rotatedY)
        });
    }

    return {
        hingePoint,
        arcPoints
    };
}; 