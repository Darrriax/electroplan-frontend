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
    const { wallManager, isDrawing, startPoint } = context;

    if (isDrawing && wallManager?.activeWall) {
        state.isDragging = true;
        wallManager.updateDrawing(pointer, startPoint);
    } else {
        state.isDragging = false;
    }

    state.lastPosition = pointer;
}

function handleWallToolDown(pointer, context) {
    const { wallManager } = context;
    wallManager.startDrawing(pointer);
}

function handleWallToolUp(context) {
    const { wallManager } = context;
    wallManager?.finishDrawing();
}