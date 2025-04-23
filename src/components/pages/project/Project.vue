<template>
  <projectLayout>

    <!--    ToDo: project-canvas
    1. Connect walls
    Done: 2. Fix room expansion when dragging top and left walls
    Done: 3. Add room corners
    4. Add inner walls
    5. Add different types of walls
    Done: 6. Add measure units (mm, sm, m)-->


    <div class="controls">
      <label>Товщина стін (см):
        <input type="number" v-model.number="wallThickness" min="0"/>
      </label>
      <label>Одиниці виміру:
        <select v-model="unit">
          <option value="m">Метри</option>
          <option value="cm">Сантиметри</option>
          <option value="mm">Міліметри</option>
        </select>
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
          <!-- Стіни -->
          <line
              v-for="(wall, index) in walls"
              :key="'wall-' + index"
              :x1="wall.x"
              :y1="wall.y"
              :x2="wall.x + wall.dx"
              :y2="wall.y + wall.dy"
              :stroke-width="wallThickness"
              :stroke="activeWall === index ? '#ff0' : '#777'"
              @mousedown="(e) => handleWallMouseDown(e, index)"
              style="cursor: move"
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
          <path
              v-for="marker in angleMarkers"
              :key="'angle-marker-' + marker.index"
              :d="`M ${marker.center.x + Math.cos(marker.startAngle)*marker.radius}
          ${marker.center.y + Math.sin(marker.startAngle)*marker.radius}
          A ${marker.radius} ${marker.radius} 0 ${marker.largeArc} ${marker.sweepFlag}
          ${marker.center.x + Math.cos(marker.endAngle)*marker.radius}
          ${marker.center.y + Math.sin(marker.endAngle)*marker.radius}
          L ${marker.center.x} ${marker.center.y} Z`"
              fill="rgba(50, 205, 50, 0.15)"
              stroke="rgba(50, 205, 50, 0.3)"
              stroke-width="1"
          />
          <!-- Вивід значень кутів -->
          <text
              v-for="angle in angles"
              :key="'angle-' + angle.index"
              :x="angle.position.x"
              :y="angle.position.y"
              font-size="12"
              fill="#5CE75C"
              text-anchor="middle"
              dominant-baseline="middle"
          >
            {{ angle.value }}°
          </text>

          <line
              v-for="(line, index) in internalLines"
              :key="'internal-line-' + index"
              :x1="line.x1"
              :y1="line.y1"
              :x2="line.x2"
              :y2="line.y2"
              stroke="orange"
              stroke-width="1"
              stroke-dasharray="4 2"
          />
          <text
              v-for="(line, index) in internalLines"
              :key="'internal-text-' + index"
              :x="line.textX"
              :y="line.textY"
              fill="orange"
              font-size="12"
              dominant-baseline="central"
              text-anchor="middle"
              :transform="`rotate(${line.rotation}, ${line.textX}, ${line.textY})`"
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
import {usePanAndZoom} from '../../composables/usePanAndZoom'
import {useWalls} from '../../composables/useWalls'
import {useRoomDrag} from '../../composables/useRoomDrag'

const unit = ref('cm')
const wallThickness = ref(12)

const corners = ref([
  {x: 0, y: 0},
  {x: 350, y: 0},
  {x: 350, y: 350},
  {x: 0, y: 350}
])

const svgRef = ref(null)
const svgWidth = ref(window.innerWidth)
const svgHeight = ref(window.innerHeight - 110)

// Панорамування та масштабування
const {
  viewX,
  viewY,
  viewScale,
  handleMouseDown: panHandleMouseDown,
  handleMouseMove: panHandleMouseMove,
  handleMouseUp: panHandleMouseUp,
  handleWheel
} = usePanAndZoom()

// Стіни та розміри
const {walls, angles, angleMarkers, internalLines} = useWalls(
    corners,
    wallThickness,
    unit,
)

// Перетягування елементів
const {
  activeWall,
  activeCorner,
  handleWallMouseDown,
  handleCornerMouseDown,
  handleDragMove,
  resetDragState
} = useRoomDrag(
    corners,
    svgRef,
    viewScale,
    viewX,
    viewY
)

// Об'єднання обробників подій
const handleMouseDown = (e) => {
  panHandleMouseDown(e, svgRef)
}

const handleMouseMove = (e) => {
  panHandleMouseMove(e)
  handleDragMove(e)
}

const handleMouseUp = () => {
  panHandleMouseUp(svgRef)
  resetDragState()
}

// Ресайз вікна
const handleResize = () => {
  svgWidth.value = window.innerWidth
  svgHeight.value = window.innerHeight - 110
}

window.addEventListener('resize', handleResize)
onUnmounted(() => window.removeEventListener('resize', handleResize))
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