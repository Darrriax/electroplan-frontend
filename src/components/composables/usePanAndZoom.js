import { ref, onMounted, onUnmounted } from 'vue'

export function usePanAndZoom() {
    const viewX = ref(0)
    const viewY = ref(0)
    const viewScale = ref(1)
    const isPanning = ref(false)
    const panStart = ref({ x: 0, y: 0 })

    const svgWidth = ref(window.innerWidth)
    const svgHeight = ref(window.innerHeight - 110)

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

    const handleResize = () => {
        svgWidth.value = window.innerWidth
        svgHeight.value = window.innerHeight - 110
    }

    onMounted(() => {
        window.addEventListener('resize', handleResize)
        handleResize()
    })

    onUnmounted(() => {
        window.removeEventListener('resize', handleResize)
    })

    return {
        viewX,
        viewY,
        viewScale,
        svgWidth,
        svgHeight,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel
    }
}