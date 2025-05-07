// utils/eventHandlers.js

export function createCanvasEventHandlers({ getCanvasState, onDrawingStart, onDrawingEnd }) {
    const state = {
        isDragging: false,
        lastPosition: null,
        currentSnapPoint: null
    };

    return {
        handleMouseMove: (e) => {
            const context = getCanvasState();
            const { canvas, currentTool, isDrawing } = context;
            if (!canvas || !currentTool) return;

            const pointer = canvas.getPointer(e.e);

            switch(currentTool) {
                case 'wall':
                    handleWallToolMove(pointer, context, state);
                    break;
                // Add other tool cases here
            }
        },

        handleMouseDown: (e) => {
            const context = getCanvasState();
            const { currentTool, canvas } = context;

            if (e.e.button !== 0 || !currentTool || !canvas) return null;

            const pointer = canvas.getPointer(e.e);
            let actualStartPoint = pointer;

            switch(currentTool) {
                case 'wall':
                    actualStartPoint = handleWallToolDown(pointer, context);
                    break;
                // Add other tool cases here
            }

            onDrawingStart?.(actualStartPoint);
            return actualStartPoint;  // Return the potentially snapped point
        },

        handleMouseUp: () => {
            const context = getCanvasState();
            const { currentTool } = context;

            switch(currentTool) {
                case 'wall':
                    handleWallToolUp(context);
                    break;
                // Add other tool cases here
            }

            onDrawingEnd?.();
        }
    };
}

// Wall-specific handlers
function handleWallToolMove(pointer, context, state) {
    const { wallManager, previewRect, isDrawing, startPoint, snapManager } = context;

    if (!state.isDragging) {
        // Update preview rectangle position with snapping
        const snappedPosition = previewRect?.updatePosition(pointer.x, pointer.y);

        // If we're not drawing yet, we still want to show snap indicators
        if (snappedPosition && snapManager && !isDrawing) {
            const snapPoint = snapManager.findNearestSnapPoint(pointer);
            if (snapPoint) {
                snapManager.showSnapPointMarker(snapPoint);
            } else {
                snapManager.clearSnapPointMarker();
            }
        }
    }

    if (isDrawing && wallManager?.activeWall) {
        state.isDragging = true;
        wallManager.updateDrawing(pointer, startPoint);
    } else {
        state.isDragging = false;
    }

    state.lastPosition = pointer;
}

function handleWallToolDown(pointer, context) {
    const { grid, wallManager, previewRect, snapManager } = context;

    grid.showSnapLines(pointer);
    previewRect?.setVisible(false);

    // Start drawing with potentially snapped point
    const actualStartPoint = wallManager.startDrawing(pointer);

    // Return the actual start point (which might be snapped)
    return actualStartPoint;
}

function handleWallToolUp(context) {
    const { grid, wallManager, wallDimensions, previewRect, currentTool, roomManager } = context;

    grid.clearSnapLines();
    wallManager?.finishDrawing().then(() => {
        // After wall is created, check for room formation
        if (roomManager) {
            roomManager.updateRooms();
        }
    });

    wallDimensions?.drawForAll();
    previewRect?.setVisible(currentTool === 'wall');
}