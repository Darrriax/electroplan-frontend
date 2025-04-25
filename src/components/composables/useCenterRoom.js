export function useCenterRoom(corners, svgRef, viewX, viewY, viewScale) {
    const centerRoom = () => {
        if (!corners.value.length) return

        const xs = corners.value.map(c => c.x)
        const ys = corners.value.map(c => c.y)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)

        const centerX = (minX + maxX) / 2
        const centerY = (minY + maxY) / 2

        const svgWidth = svgRef.value.clientWidth
        const svgHeight = svgRef.value.clientHeight

        viewX.value = (svgWidth / 2) - centerX * viewScale.value
        viewY.value = (svgHeight / 2) - centerY * viewScale.value
    }

    return {centerRoom}
}