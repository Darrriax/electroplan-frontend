import {ref} from 'vue';

/**
 * Компонент для роботи з перетягуванням кутів і стін.
 */
export function useRoomDrag(corners, svgRef, viewScale, viewX, viewY) {
    const activeWall = ref(null);
    const activeCorner = ref(null);
    const dragStart = ref({
        x: 0,
        y: 0,
        originalX1: 0,
        originalY1: 0,
        originalX2: 0,
        originalY2: 0,
        moveAxis: null
    });

    /**
     * Обробник для початку перетягування кута.
     */
    const handleCornerMouseDown = (e, index) => {
        e.stopPropagation();
        activeCorner.value = index;

        const rect = svgRef.value.getBoundingClientRect();
        const scale = 1 / viewScale.value;
        dragStart.value = {
            x: (e.clientX - rect.left - viewX.value) * scale,
            y: (e.clientY - rect.top - viewY.value) * scale,
            originalX1: corners.value[index].x,
            originalY1: corners.value[index].y
        };
    };

    /**
     * Обробник для початку перетягування стіни.
     */
    const handleWallMouseDown = (e, index) => {
        e.stopPropagation();
        activeWall.value = index;

        const rect = svgRef.value.getBoundingClientRect();
        const scale = 1 / viewScale.value;
        const nextIndex = (index + 1) % corners.value.length;

        const dx = corners.value[nextIndex].x - corners.value[index].x;
        const dy = corners.value[nextIndex].y - corners.value[index].y;
        const isHorizontal = Math.abs(dx) > Math.abs(dy);

        dragStart.value = {
            x: (e.clientX - rect.left - viewX.value) * scale,
            y: (e.clientY - rect.top - viewY.value) * scale,
            originalX1: corners.value[index].x,
            originalY1: corners.value[index].y,
            originalX2: corners.value[nextIndex].x,
            originalY2: corners.value[nextIndex].y,
            moveAxis: isHorizontal ? 'y' : 'x'
        };
    };

    /**
     * Обробник для руху стін або кутів.
     */
    const handleDragMove = (e) => {
        if (activeCorner.value !== null) {
            const rect = svgRef.value.getBoundingClientRect();
            const scale = 1 / viewScale.value;
            let currentX = (e.clientX - rect.left - viewX.value) * scale;
            let currentY = (e.clientY - rect.top - viewY.value) * scale;

            if (e.shiftKey) {
                const currentIndex = activeCorner.value;
                const prevIndex = (currentIndex - 1 + corners.value.length) % corners.value.length;
                const nextIndex = (currentIndex + 1) % corners.value.length;

                const prevCorner = {...corners.value[prevIndex]};
                const nextCorner = {...corners.value[nextIndex]};

                const options = [
                    {x: nextCorner.x, y: prevCorner.y},
                    {x: prevCorner.x, y: nextCorner.y}
                ];

                let minDist = Infinity;
                options.forEach(opt => {
                    const dist = Math.hypot(currentX - opt.x, currentY - opt.y);
                    if (dist < minDist) {
                        minDist = dist;
                        currentX = opt.x;
                        currentY = opt.y;
                    }
                });
            }

            corners.value[activeCorner.value].x = currentX;
            corners.value[activeCorner.value].y = currentY;
        } else if (activeWall.value !== null) {
            const rect = svgRef.value.getBoundingClientRect();
            const scale = 1 / viewScale.value;
            const currentX = (e.clientX - rect.left - viewX.value) * scale;
            const currentY = (e.clientY - rect.top - viewY.value) * scale;

            const wallIndex = activeWall.value;
            const nextIndex = (wallIndex + 1) % corners.value.length;
            const updatedCorners = [...corners.value];

            if (dragStart.value.moveAxis === 'y') {
                const deltaY = currentY - dragStart.value.y;
                updatedCorners[wallIndex].y = dragStart.value.originalY1 + deltaY;
                updatedCorners[nextIndex].y = dragStart.value.originalY2 + deltaY;
            } else {
                const deltaX = currentX - dragStart.value.x;
                updatedCorners[wallIndex].x = dragStart.value.originalX1 + deltaX;
                updatedCorners[nextIndex].x = dragStart.value.originalX2 + deltaX;
            }

            corners.value = updatedCorners;
        }
    };

    /**
     * Скидання стану після перетягування.
     */
    const resetDragState = () => {
        activeWall.value = null;
        activeCorner.value = null;
        dragStart.value = {
            x: 0,
            y: 0,
            originalX1: 0,
            originalY1: 0,
            originalX2: 0,
            originalY2: 0,
            moveAxis: null
        };
    };

    return {
        activeWall,
        activeCorner,
        handleWallMouseDown,
        handleCornerMouseDown,
        handleDragMove,
        resetDragState
    };
}