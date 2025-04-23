import { ref } from 'vue'

export function usePanAndZoom() {
    const viewX = ref(0)
    const viewY = ref(0)
    const viewScale = ref(1)
    const isPanning = ref(false)
    const panStart = ref({ x: 0, y: 0 })

    const handleMouseDown = (e, svgRef) => {
        if (e.target.tagName === 'rect' || e.target.tagName === 'circle') return
        isPanning.value = true
        panStart.value = { x: e.clientX - viewX.value, y: e.clientY - viewY.value }
        svgRef.value.style.cursor = 'grabbing'
    }

    const handleMouseMove = (e) => {
        if (isPanning.value) {
            viewX.value = e.clientX - panStart.value.x
            viewY.value = e.clientY - panStart.value.y
        }
    }

    const handleMouseUp = (svgRef) => {
        isPanning.value = false
        svgRef.value.style.cursor = 'grab'
    }

    const handleWheel = (e) => {
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        viewScale.value = Math.min(Math.max(0.1, viewScale.value * delta), 5)
    }

    return {
        viewX,
        viewY,
        viewScale,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel
    }
}