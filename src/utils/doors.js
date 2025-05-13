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

// Default door configuration
export const DEFAULT_DOOR_CONFIG = {
    type: DOOR_TYPES.SINGLE,
    width: DEFAULT_DOOR_WIDTH,
    height: DEFAULT_DOOR_HEIGHT,
    thickness: DEFAULT_DOOR_THICKNESS,
    openDirection: 'left', // or 'right'
    openAngle: 80 // Default opening angle in degrees
};

// Validation functions
export const validateDoorDimensions = (width, height) => {
    const minWidth = 60;  // Minimum door width
    const maxWidth = 200; // Maximum door width
    const minHeight = 180; // Minimum door height
    const maxHeight = 300; // Maximum door height

    return {
        isValid: width >= minWidth && width <= maxWidth && height >= minHeight && height <= maxHeight,
        errors: {
            width: width < minWidth ? 'Width too small' : width > maxWidth ? 'Width too large' : null,
            height: height < minHeight ? 'Height too small' : height > maxHeight ? 'Height too large' : null
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