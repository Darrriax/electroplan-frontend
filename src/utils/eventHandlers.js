// eventHandlers.js

export function createCanvasEventHandlers({ getCanvasState, onDrawingStart, onDrawingEnd }) {
    const state = {
        isDragging: false,
        lastPosition: null
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

            switch(currentTool) {
                case 'wall':
                    handleWallToolDown(pointer, context);
                    break;
                // Add other tool cases here
            }

            onDrawingStart?.(pointer);
            return pointer;
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
    const { wallManager, previewRect, isDrawing, startPoint } = context;

    if (!state.isDragging) {
        previewRect?.updatePosition(pointer.x, pointer.y);
        wallManager?.updateDrawing(pointer, pointer);
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
    const { grid, wallManager, previewRect } = context;

    grid.showSnapLines(pointer);
    previewRect?.setVisible(false);
    wallManager.startDrawing(pointer);
}

function handleWallToolUp(context) {
    const { grid, wallManager, previewRect, currentTool } = context;

    grid.clearSnapLines();
    wallManager?.finishDrawing();
    previewRect?.setVisible(currentTool === 'wall');
}