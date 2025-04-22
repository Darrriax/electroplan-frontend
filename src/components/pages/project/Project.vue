<template>
  <projectLayout>

    <!--    ToDo: project-canvas
    1. Connect walls
    Done: 2. Fix room expansion when dragging top and left walls
    3. Add room corners
    4. Add inner walls
    5. Add different types of walls
    6. Add measure units (mm, sm, m)-->


    <div class="controls">
      <label>Товщина стін (см):
        <input type="number" v-model.number="wallThickness" min="0"/>
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
              :x="roomX"
              :y="roomY"
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

          <!-- Кути кімнати -->
          <circle
              v-for="(corner, index) in corners"
              :key="'corner-' + index"
              :cx="corner.x"
              :cy="corner.y"
              r="5"
              fill="lime"
              stroke="darkgreen"
              stroke-width="1"
              @mousedown="(e) => handleCornerMouseDown(e, index)"
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
import {ref, computed, onUnmounted} from 'vue'
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
const panStart = ref({x: 0, y: 0})

// Перетягування
const activeWall = ref(null)
const activeCorner = ref(null)
const dragStart = ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  roomX: 0,
  roomY: 0
})

const svgRef = ref(null)
const svgWidth = ref(window.innerWidth)
const svgHeight = ref(window.innerHeight - 110)

const handleResize = () => {
  svgWidth.value = window.innerWidth
  svgHeight.value = window.innerHeight - 110
}

window.addEventListener('resize', handleResize)
onUnmounted(() => window.removeEventListener('resize', handleResize))

const corners = computed(() => [
  // Top-left
  {x: roomX.value, y: roomY.value},
  // Top-right
  {x: roomX.value + roomWidth.value, y: roomY.value},
  // Bottom-right
  {x: roomX.value + roomWidth.value, y: roomY.value + roomHeight.value},
  // Bottom-left
  {x: roomX.value, y: roomY.value + roomHeight.value}
])

const walls = computed(() => {
  const wt = wallThickness.value
  return [
    // Top wall
    {x: roomX.value, y: roomY.value - wt, width: roomWidth.value, height: wt},
    // Right wall
    {x: roomX.value + roomWidth.value, y: roomY.value, width: wt, height: roomHeight.value},
    // Bottom wall
    {x: roomX.value, y: roomY.value + roomHeight.value, width: roomWidth.value, height: wt},
    // Left wall
    {x: roomX.value - wt, y: roomY.value, width: wt, height: roomHeight.value}
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
      x1: roomX.value,
      y1: roomY.value - wt - offset,
      x2: roomX.value + roomWidth.value,
      y2: roomY.value - wt - offset,
      textX: roomX.value + roomWidth.value / 2,
      textY: roomY.value - wt - offset - textOffset,
      displayedLength: getDisplayedLength(roomWidth.value),
      textAnchor: 'middle'
    },
    // Right
    {
      x1: roomX.value + roomWidth.value + wt + offset,
      y1: roomY.value,
      x2: roomX.value + roomWidth.value + wt + offset,
      y2: roomY.value + roomHeight.value,
      textX: roomX.value + roomWidth.value + wt + offset + textOffset,
      textY: roomY.value + roomHeight.value / 2,
      displayedLength: getDisplayedLength(roomHeight.value),
      textAnchor: 'start',
      rotation: 90
    },
    // Bottom
    {
      x1: roomX.value,
      y1: roomY.value + roomHeight.value + wt + offset,
      x2: roomX.value + roomWidth.value,
      y2: roomY.value + roomHeight.value + wt + offset,
      textX: roomX.value + roomWidth.value / 2,
      textY: roomY.value + roomHeight.value + wt + offset + textOffset,
      displayedLength: getDisplayedLength(roomWidth.value),
      textAnchor: 'middle'
    },
    // Left
    {
      x1: roomX.value - wt - offset,
      y1: roomY.value,
      x2: roomX.value - wt - offset,
      y2: roomY.value + roomHeight.value,
      textX: roomX.value - wt - offset - textOffset,
      textY: roomY.value + roomHeight.value / 2,
      displayedLength: getDisplayedLength(roomHeight.value),
      textAnchor: 'end',
      rotation: -90
    }
  ]
})

const handleCornerMouseDown = (e, index) => {
  e.stopPropagation()
  activeCorner.value = index
  const rect = svgRef.value.getBoundingClientRect()
  const scale = 1 / viewScale.value
  const x = (e.clientX - rect.left - viewX.value) * scale
  const y = (e.clientY - rect.top - viewY.value) * scale
  dragStart.value = {
    x,
    y,
    width: roomWidth.value,
    height: roomHeight.value,
    roomX: roomX.value,
    roomY: roomY.value
  }
}

const handleWallMouseDown = (e, index) => {
  e.stopPropagation()
  activeWall.value = index
  const rect = svgRef.value.getBoundingClientRect()
  const scale = 1 / viewScale.value
  const x = (e.clientX - rect.left - viewX.value) * scale
  const y = (e.clientY - rect.top - viewY.value) * scale
  dragStart.value = {
    x,
    y,
    width: roomWidth.value,
    height: roomHeight.value,
    roomX: roomX.value,
    roomY: roomY.value
  }
}

const handleMouseDown = (e) => {
  if (e.target.tagName === 'rect' || e.target.tagName === 'circle') return
  isPanning.value = true
  panStart.value = {x: e.clientX - viewX.value, y: e.clientY - viewY.value}
  svgRef.value.style.cursor = 'grabbing'
}

const handleMouseMove = (e) => {
  if (isPanning.value) {
    viewX.value = e.clientX - panStart.value.x
    viewY.value = e.clientY - panStart.value.y
    return
  }

  const rect = svgRef.value.getBoundingClientRect()
  const scale = 1 / viewScale.value
  const currentX = (e.clientX - rect.left - viewX.value) * scale
  const currentY = (e.clientY - rect.top - viewY.value) * scale

  if (activeCorner.value !== null) {
    const dx = currentX - dragStart.value.x
    const dy = currentY - dragStart.value.y

    switch (activeCorner.value) {
      case 0: // Top-left
        roomX.value = dragStart.value.roomX + dx
        roomY.value = dragStart.value.roomY + dy
        roomWidth.value = Math.max(10, dragStart.value.width - dx)
        roomHeight.value = Math.max(10, dragStart.value.height - dy)
        break
      case 1: // Top-right
        roomY.value = dragStart.value.roomY + dy
        roomWidth.value = Math.max(10, dragStart.value.width + dx)
        roomHeight.value = Math.max(10, dragStart.value.height - dy)
        break
      case 2: // Bottom-right
        roomWidth.value = Math.max(10, dragStart.value.width + dx)
        roomHeight.value = Math.max(10, dragStart.value.height + dy)
        break
      case 3: // Bottom-left
        roomX.value = dragStart.value.roomX + dx
        roomWidth.value = Math.max(10, dragStart.value.width - dx)
        roomHeight.value = Math.max(10, dragStart.value.height + dy)
        break
    }
    return
  }

  if (activeWall.value !== null) {
    switch (activeWall.value) {
      case 0: { // Top
        const deltaY = dragStart.value.y - currentY
        const newHeight = dragStart.value.height + deltaY
        if (newHeight >= 10) {
          roomHeight.value = newHeight
          roomY.value = dragStart.value.roomY - deltaY
        }
        break
      }
      case 1: // Right
        roomWidth.value = Math.max(10, currentX - roomX.value)
        break
      case 2: // Bottom
        roomHeight.value = Math.max(10, currentY - roomY.value)
        break
      case 3: { // Left
        const deltaX = dragStart.value.x - currentX
        const newWidth = dragStart.value.width + deltaX
        if (newWidth >= 10) {
          roomWidth.value = newWidth
          roomX.value = dragStart.value.roomX - deltaX
        }
        break
      }
    }
  }
}

const handleMouseUp = () => {
  isPanning.value = false
  activeWall.value = null
  activeCorner.value = null
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

circle:hover {
  stroke-width: 2;
}
</style>