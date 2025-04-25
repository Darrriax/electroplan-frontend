import { ref } from 'vue';


/**
 * Компонент для роботи зі стінами: поділ, рух, взаємодія з меню.
 */
export function useWallSplit(corners, viewScale, svgRef, viewX, viewY) {
    const showGear = ref(false);
    const gearPosition = ref({ x: 0, y: 0 });
    const showMenu = ref(false);
    const activeWallIndex = ref(null);
    const splitPoint = ref({ x: 0, y: 0 });
    const isDragging = ref(false);
    const dragStart = ref({ x: 0, y: 0 });
    const wasDragged = ref(false)

    /**
     * Обробник для кліку по стіні.
     */
    const handleWallClick = (e, index) => {
        e.stopPropagation()
        if (!wasDragged.value) {
            // Показуємо шестерню лише якщо не було drag
            const rect = svgRef.value.getBoundingClientRect()
            const scale = 1 / viewScale.value
            const mouseX = (e.clientX - rect.left - viewX.value) * scale
            const mouseY = (e.clientY - rect.top - viewY.value) * scale

            activeWallIndex.value = index
            const start = corners.value[index]
            const end = corners.value[(index + 1) % corners.value.length]
            splitPoint.value = getNearestPointOnWall(start, end, { x: mouseX, y: mouseY })

            gearPosition.value = { x: splitPoint.value.x - 18, y: splitPoint.value.y - 18 }
            showGear.value = true
            showMenu.value = false
        }
    };

    /**
     * Обробник для початку руху стіни.
     */
    const handleWallMouseDown = (e, index) => {
        e.stopPropagation()
        isDragging.value = true
        wasDragged.value = false // reset

        const rect = svgRef.value.getBoundingClientRect()
        const scale = 1 / viewScale.value
        dragStart.value = {
            x: (e.clientX - rect.left - viewX.value) * scale,
            y: (e.clientY - rect.top - viewY.value) * scale,
        }
        activeWallIndex.value = index
    }

    /**
     * Обробник для руху стіни.
     */
    const handleWallMouseMove = (e) => {
        if (isDragging.value && activeWallIndex.value !== null) {
            wasDragged.value = true // значить це перетягування

            const rect = svgRef.value.getBoundingClientRect()
            const scale = 1 / viewScale.value
            const mouseX = (e.clientX - rect.left - viewX.value) * scale
            const mouseY = (e.clientY - rect.top - viewY.value) * scale

            const deltaX = mouseX - dragStart.value.x
            const deltaY = mouseY - dragStart.value.y

            const wallIndex = activeWallIndex.value
            const nextIndex = (wallIndex + 1) % corners.value.length

            corners.value[wallIndex].x += deltaX
            corners.value[wallIndex].y += deltaY
            corners.value[nextIndex].x += deltaX
            corners.value[nextIndex].y += deltaY

            dragStart.value = { x: mouseX, y: mouseY }
        }
    }

    /**
     * Обробник для завершення руху стіни.
     */
    const handleWallMouseUp = () => {
        isDragging.value = false;
    };

    /**
     * Функція для поділу стіни.
     */
    const splitWall = () => {
        if (activeWallIndex.value === null) return;

        const index = activeWallIndex.value;
        const newCorners = [...corners.value];

        newCorners.splice(index + 1, 0, {
            x: splitPoint.value.x,
            y: splitPoint.value.y
        });

        corners.value = newCorners;
        showGear.value = false;
        showMenu.value = false;
        activeWallIndex.value = null;
    };

    /**
     * Функція для знаходження найближчої точки на стіні.
     */
    const getNearestPointOnWall = (start, end, point) => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSquared = dx * dx + dy * dy;

        if (lengthSquared === 0) return start;

        const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
        const clampedT = Math.max(0, Math.min(1, t));

        return {
            x: start.x + clampedT * dx,
            y: start.y + clampedT * dy
        };
    };

    return {
        showGear,
        gearPosition,
        showMenu,
        handleWallClick,
        handleWallMouseDown,
        handleWallMouseMove,
        handleWallMouseUp,
        toggleMenu: () => showMenu.value = !showMenu.value,
        splitWall,
        addInnerWall: () => console.log('Add inner wall'),
        activeWallIndex
    };
}