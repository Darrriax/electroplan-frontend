export function handleMouseMove(e, context) {
    const { canvas, currentTool, isDrawing, startPoint, wallManager, previewRect } = context;
    if (!canvas) return;

    const pointer = canvas.getPointer(e.e);

    if (currentTool === 'wall') {
        if (!isDrawing) {
            previewRect?.updatePosition(pointer.x, pointer.y);
            wallManager?.updateDrawing(pointer, pointer);
        }

        if (isDrawing && wallManager?.activeWall) {
            wallManager.updateDrawing(pointer, startPoint);
        }
    }
}

export function handleMouseDown(e, context) {
    const { canvas, currentTool, wallManager, grid, previewRect } = context;
    if (currentTool === 'wall' && e.e.button === 0) {
        const startPoint = canvas.getPointer(e.e);
        grid.showSnapLines(startPoint);
        previewRect?.setVisible(false);
        wallManager.startDrawing(startPoint);
        return startPoint;
    }
    return null;
}

export function handleMouseUp(context) {
    const { grid, wallManager, currentTool, previewRect } = context;
    grid.clearSnapLines();
    wallManager?.finishDrawing();
    previewRect?.setVisible(currentTool === 'wall');
}