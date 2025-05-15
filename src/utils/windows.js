// windows.js - Window functionality and default values

// Default window dimensions in centimeters
export const DEFAULT_WINDOW_WIDTH = 100;
export const DEFAULT_WINDOW_HEIGHT = 120;
export const DEFAULT_WINDOW_THICKNESS = 2;
export const DEFAULT_WINDOW_HEIGHT_FROM_FLOOR = 90;

// Default window configuration
export const DEFAULT_WINDOW_CONFIG = {
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT,
    thickness: DEFAULT_WINDOW_THICKNESS,
    heightFromFloor: DEFAULT_WINDOW_HEIGHT_FROM_FLOOR
};

// Validation functions
export const validateWindowDimensions = (width, height, heightFromFloor, wallHeight = 280) => {
    const minWidth = 40;  // Minimum window width
    const maxWidth = 300; // Maximum window width
    const minHeight = 40; // Minimum window height
    const maxHeight = wallHeight - heightFromFloor; // Maximum window height is limited by wall height and height from floor

    return {
        isValid: width >= minWidth && width <= maxWidth && 
                height >= minHeight && height <= maxHeight &&
                heightFromFloor >= 0 && // Allow height from floor to be zero
                (heightFromFloor + height) <= wallHeight, // Total height must not exceed wall height
        errors: {
            width: width < minWidth ? 'Width too small' : width > maxWidth ? 'Width too large' : null,
            height: height < minHeight ? 'Height too small' : 
                   height > maxHeight ? `Height too large (max ${maxHeight}cm with current floor height)` : null,
            heightFromFloor: heightFromFloor < 0 ? 'Height from floor cannot be negative' : 
                           (heightFromFloor + height) > wallHeight ? 'Window extends beyond wall height' : null
        }
    };
}; 