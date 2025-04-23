import {computed} from 'vue'

export function useWalls(corners, wallThickness, unit) {
    const walls = computed(() => {
        const wt = wallThickness.value
        const wallSegments = []

        for (let i = 0; i < corners.value.length; i++) {
            const start = corners.value[i]
            const end = corners.value[(i + 1) % corners.value.length]
            const dx = end.x - start.x
            const dy = end.y - start.y
            const len = Math.hypot(dx, dy)
            const nx = -dy / len
            const ny = dx / len

            const offsetX = -nx * wt / 2
            const offsetY = -ny * wt / 2

            wallSegments.push({
                x: start.x + offsetX,
                y: start.y + offsetY,
                dx: dx,
                dy: dy
            })
        }

        return wallSegments
    })

    const getDisplayedLength = (lengthCm) => {
        switch(unit.value) {
            case 'm': return (lengthCm / 100).toFixed(2)
            case 'mm': return (lengthCm * 10).toFixed(0)
            default: return lengthCm.toFixed(0)
        }
    }

    // В useWalls.js оновлюємо angles computed
    const angles = computed(() => {
        const angleData = []
        const pts = corners.value

        for (let i = 0; i < pts.length; i++) {
            const prev = pts[(i - 1 + pts.length) % pts.length]
            const curr = pts[i]
            const next = pts[(i + 1) % pts.length]

            // Вектори стін
            const vec1 = { x: prev.x - curr.x, y: prev.y - curr.y }
            const vec2 = { x: next.x - curr.x, y: next.y - curr.y }

            // Обчислення кута
            const dot = vec1.x * vec2.x + vec1.y * vec2.y
            const len1 = Math.hypot(vec1.x, vec1.y)
            const len2 = Math.hypot(vec2.x, vec2.y)
            const angle = (Math.acos(dot / (len1 * len2)) * (180 / Math.PI))

            // Напрямки для позиціонування тексту
            const dir1 = { x: vec1.x/len1, y: vec1.y/len1 }
            const dir2 = { x: vec2.x/len2, y: vec2.y/len2 }
            const bisector = {
                x: (dir1.x + dir2.x) * 0.5,
                y: (dir1.y + dir2.y) * 0.5
            }
            const bisectorLength = Math.hypot(bisector.x, bisector.y)

            // Позиція тексту (20px від вершини кута)
            const textPos = {
                x: curr.x + bisector.x/bisectorLength * 25,
                y: curr.y + bisector.y/bisectorLength * 25
            }

            angleData.push({
                index: i,
                value: angle.toFixed(1),
                position: textPos,
                prev: prev,
                next: next
            })
        }

        return angleData
    })

    const angleMarkers = computed(() => {
        const markers = []
        const pts = corners.value
        const radius = 35

        for (let i = 0; i < pts.length; i++) {
            const prev = pts[(i - 1 + pts.length) % pts.length]
            const curr = pts[i]
            const next = pts[(i + 1) % pts.length]

            // Вектори ВІД поточного кута до сусідніх
            const vec1 = { x: prev.x - curr.x, y: prev.y - curr.y }
            const vec2 = { x: next.x - curr.x, y: next.y - curr.y }

            // Кути напрямків векторів
            const angle1 = Math.atan2(vec1.y, vec1.x)
            const angle2 = Math.atan2(vec2.y, vec2.x)

            // Корекція для внутрішніх кутів
            let angleDiff = angle2 - angle1
            if (angleDiff < 0) angleDiff += 2 * Math.PI

            // Визначаємо параметри дуги
            const largeArc = angleDiff > Math.PI ? 0 : 1
            const sweepFlag = 0

            markers.push({
                index: i,
                center: curr,
                startAngle: angle1,
                endAngle: angle2,
                radius: radius,
                largeArc: largeArc,
                sweepFlag: sweepFlag
            })
        }
        return markers
    })

    const internalLines = computed(() => {
        const lines = []
        const wt = wallThickness.value
        const pts = corners.value

        for (let i = 0; i < pts.length; i++) {
            const start = pts[i]
            const end = pts[(i + 1) % pts.length]

            // Вектор стіни
            const dx = end.x - start.x
            const dy = end.y - start.y
            const length = Math.hypot(dx, dy)

            if (length === 0) continue

            // Нормалізований перпендикуляр
            const nx = -dy / length
            const ny = dx / length

            // Зсув для внутрішньої лінії
            const offset = wt / 2
            const offsetX = nx * offset
            const offsetY = ny * offset

            // Внутрішні точки
            const innerStart = {
                x: start.x + offsetX,
                y: start.y + offsetY
            }
            const innerEnd = {
                x: end.x + offsetX,
                y: end.y + offsetY
            }

            // Довжина внутрішньої стіни
            const internalLength = Math.hypot(innerEnd.x - innerStart.x, innerEnd.y - innerStart.y)

            // Параметри для тексту
            const centerX = (innerStart.x + innerEnd.x) / 2
            const centerY = (innerStart.y + innerEnd.y) / 2
            const rotation = Math.atan2(innerEnd.y - innerStart.y, innerEnd.x - innerStart.x) * (180 / Math.PI)

            lines.push({
                x1: innerStart.x,
                y1: innerStart.y,
                x2: innerEnd.x,
                y2: innerEnd.y,
                textX: centerX + nx * 8,
                textY: centerY + ny * 8,
                displayedLength: getDisplayedLength(internalLength),
                rotation: rotation
            })
        }

        return lines
    })

    return {walls, angles, internalLines, angleMarkers}
}