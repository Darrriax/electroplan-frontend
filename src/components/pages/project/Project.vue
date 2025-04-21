<template>
  <projectLayout>

<!--    ToDo: project-canvas
1. Connect walls
2. Fix room expansion when dragging top and left walls
3. Add room corners
4. Add inner walls
5. Add different types of walls
6. Add measure units (mm, sm, m)-->


    <div class="controls">
      <label>Товщина стін (см):
        <input type="number" v-model.number="wallThickness" min="0" />
      </label>
    </div>
    <div class="svg-wrapper">
      <svg
          ref="svgRef"
          :width="svgWidth"
          :height="svgHeight"
          @mousedown="handleMouseDown"
          @mouseup="handleMouseUp"
          @mousemove="handleMouseMove"
          @wheel.prevent="handleWheel"
          style="cursor: grab"
      >
        <g :transform="`translate(${viewX} ${viewY}) scale(${viewScale})`">
          <!-- Внутрішній простір кімнати -->
          <rect
              x="0"
              y="0"
              :width="roomWidth"
              :height="roomHeight"
              fill="white"
              stroke="black"
          />
          <!-- Стіни -->
          <rect
              v-for="(wall, index) in walls"
              :key="'wall-' + index"
              :x="wall.x"
              :y="wall.y"
              :width="wall.width"
              :height="wall.height"
              :fill="activeWall === index ? '#ff0' : '#777'"
              @mousedown="(e) => handleWallMouseDown(e, index)"
              style="cursor: pointer"
          />
          <!-- Зовнішні розміри -->
          <line
              v-for="(line, index) in externalLines"
              :key="'line-' + index"
              :x1="line.x1"
              :y1="line.y1"
              :x2="line.x2"
              :y2="line.y2"
              stroke="orange"
              stroke-width="1"
          />
          <text
              v-for="(line, index) in externalLines"
              :key="'text-' + index"
              :x="line.textX"
              :y="line.textY"
              :text-anchor="line.textAnchor"
              fill="orange"
              font-size="12"
              dominant-baseline="central"
              :transform="line.rotation ? `rotate(${line.rotation}, ${line.textX}, ${line.textY})` : ''"
          >
            {{ line.displayedLength }} {{ unit }}
          </text>
        </g>
      </svg>
    </div>
  </projectLayout>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import projectLayout from "../../UI/layouts/projectLayout.vue"

const unit = ref('cm')
const wallThickness = ref(12)
const roomWidth = ref(350)
const roomHeight = ref(350)
const roomX = ref(0)
const roomY = ref(0)

// Налаштування виду
const viewX = ref(0)
const viewY = ref(0)
const viewScale = ref(1)
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })

// Перетягування стін
const activeWall = ref(null)
const dragStart = ref({ x: 0, y: 0, width: 0, height: 0 })

const svgRef = ref(null)
const svgWidth = ref(window.innerWidth)
const svgHeight = ref(window.innerHeight - 110)

const handleResize = () => {
  svgWidth.value = window.innerWidth
  svgHeight.value = window.innerHeight - 110
}

window.addEventListener('resize', handleResize)
onUnmounted(() => window.removeEventListener('resize', handleResize))

const walls = computed(() => {
  const wt = wallThickness.value
  return [
    // Top wall
    { x: 0, y: -wt, width: roomWidth.value, height: wt },
    // Right wall
    { x: roomWidth.value, y: 0, width: wt, height: roomHeight.value },
    // Bottom wall
    { x: 0, y: roomHeight.value, width: roomWidth.value, height: wt },
    // Left wall
    { x: -wt, y: 0, width: wt, height: roomHeight.value }
  ]
})

const externalLines = computed(() => {
  const wt = wallThickness.value
  const offset = 6
  const textOffset = 6

  const getDisplayedLength = (lengthCm) => {
    if (unit.value === 'm') return (lengthCm / 100).toFixed(2)
    if (unit.value === 'mm') return (lengthCm * 10).toFixed(0)
    return lengthCm.toFixed(0)
  }

  return [
    // Top
    {
      x1: 0,
      y1: -wt - offset,
      x2: roomWidth.value,
      y2: -wt - offset,
      textX: roomWidth.value / 2,
      textY: -wt - offset - textOffset,
      displayedLength: getDisplayedLength(roomWidth.value),
      textAnchor: 'middle'
    },
    // Right
    {
      x1: roomWidth.value + wt + offset,
      y1: 0,
      x2: roomWidth.value + wt + offset,
      y2: roomHeight.value,
      textX: roomWidth.value + wt + offset + textOffset,
      textY: roomHeight.value / 2,
      displayedLength: getDisplayedLength(roomHeight.value),
      textAnchor: 'start',
      rotation: 90
    },
    // Bottom
    {
      x1: 0,
      y1: roomHeight.value + wt + offset,
      x2: roomWidth.value,
      y2: roomHeight.value + wt + offset,
      textX: roomWidth.value / 2,
      textY: roomHeight.value + wt + offset + textOffset,
      displayedLength: getDisplayedLength(roomWidth.value),
      textAnchor: 'middle'
    },
    // Left
    {
      x1: -wt - offset,
      y1: 0,
      x2: -wt - offset,
      y2: roomHeight.value,
      textX: -wt - offset - textOffset,
      textY: roomHeight.value / 2,
      displayedLength: getDisplayedLength(roomHeight.value),
      textAnchor: 'end',
      rotation: -90
    }
  ]
})

const handleWallMouseDown = (e, index) => {
  e.stopPropagation()
  activeWall.value = index
  const rect = svgRef.value.getBoundingClientRect()
  const scale = 1/viewScale.value
  const x = (e.clientX - rect.left - viewX.value) * scale
  const y = (e.clientY - rect.top - viewY.value) * scale
  dragStart.value = { x, y, width: roomWidth.value, height: roomHeight.value }
}

const handleMouseDown = (e) => {
  if (e.target.tagName === 'rect') return
  isPanning.value = true
  panStart.value = { x: e.clientX - viewX.value, y: e.clientY - viewY.value }
  svgRef.value.style.cursor = 'grabbing'
}

const handleMouseMove = (e) => {
  if (isPanning.value) {
    viewX.value = e.clientX - panStart.value.x
    viewY.value = e.clientY - panStart.value.y
    return
  }

  if (activeWall.value === null) return

  const rect = svgRef.value.getBoundingClientRect()
  const scale = 1/viewScale.value
  const currentX = (e.clientX - rect.left - viewX.value) * scale
  const currentY = (e.clientY - rect.top - viewY.value) * scale

  switch(activeWall.value) {
    case 0: // Top
      roomHeight.value = Math.max(10, dragStart.value.height + (dragStart.value.y - currentY))
      break
    case 1: // Right
      roomWidth.value = Math.max(10, currentX)
      break
    case 2: // Bottom
      roomHeight.value = Math.max(10, currentY)
      break
    case 3: // Left
      roomWidth.value = Math.max(10, dragStart.value.width + (dragStart.value.x - currentX))
      break
  }
}

const handleMouseUp = () => {
  isPanning.value = false
  activeWall.value = null
  svgRef.value.style.cursor = 'grab'
}

const handleWheel = (e) => {
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  viewScale.value = Math.min(Math.max(0.1, viewScale.value * delta), 5)
}
</script>

<style scoped>
.controls {
  padding: 10px;
  background: #f0f0f0;
  margin-bottom: 10px;
}

.svg-wrapper {
  width: 100vw;
  height: calc(100vh - 110px);
  overflow: hidden;
}

svg {
  background: #f8f8f8;
}

rect {
  stroke-width: 1;
  stroke: #333;
  transition: fill 0.2s;
}
</style>