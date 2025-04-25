<template>
  <projectLayout>
    <div class="controls">
      <label>
        Товщина стін (см):
        <input type="number" v-model.number="wallThickness" min="0"/>
      </label>
      <label>
        Одиниці виміру:
        <select v-model="unit">
          <option value="m">Метри</option>
          <option value="cm">Сантиметри</option>
          <option value="mm">Міліметри</option>
        </select>
      </label>
      <button @click="centerRoom">Центрувати</button>
    </div>

    <div class="svg-wrapper">
      <svg
          ref="svgRef"
          :width="svgWidth"
          :height="svgHeight"
          @click="handleSvgClick"
          @mousedown="handleMouseDown"
          @mouseup="handleMouseUp"
          @mousemove="handleMouseMove"
          @wheel.prevent="handleWheel"
          class="svg-style"
      >
        <g :transform="`translate(${viewX} ${viewY}) scale(${viewScale})`">
          <line
              v-for="(wall, index) in walls"
              :key="'wall-' + index"
              :x1="wall.x"
              :y1="wall.y"
              :x2="wall.x + wall.dx"
              :y2="wall.y + wall.dy"
              :stroke-width="wallThickness"
              :stroke="activeWallIndex === index ? '#FFEB3B' : '#777'"
              :class="{ 'active-wall': activeWallIndex === index }"
              pointer-events="stroke"
              @mousedown="(e) => handleWallMouseDown(e, index)"
              @mousemove="handleWallMouseMove"
              @mouseup="handleWallMouseUp"
              @click="(e) => handleWallClick(e, index)"
              style="cursor: move"
          />

          <circle
              v-for="(corner, index) in corners"
              :key="'corner-' + index"
              :cx="corner.x"
              :cy="corner.y"
              r="5"
              fill="lime"
              stroke="darkgreen"
              @mousedown="(e) => handleCornerMouseDown(e, index)"
              style="cursor: pointer"
          />

          <path
              v-for="marker in angleMarkers"
              :key="'angle-marker-' + marker.index"
              :d="`M ${marker.center.x + Math.cos(marker.startAngle) * marker.radius}
                  ${marker.center.y + Math.sin(marker.startAngle) * marker.radius}
                  A ${marker.radius} ${marker.radius} 0 ${marker.largeArc} ${marker.sweepFlag}
                  ${marker.center.x + Math.cos(marker.endAngle) * marker.radius}
                  ${marker.center.y + Math.sin(marker.endAngle) * marker.radius}
                  L ${marker.center.x} ${marker.center.y} Z`"
              fill="rgba(50, 205, 50, 0.15)"
              stroke="rgba(50, 205, 50, 0.3)"
          />

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

          <foreignObject
              v-if="showGear"
              :x="gearPosition.x"
              :y="gearPosition.y"
              width="36"
              height="36"
              style="overflow: visible; pointer-events: auto"
          >
            <div class="gear-icon-wrapper" @click.stop="toggleMenu">
              <font-awesome-icon icon="fa-solid fa-gear"/>
            </div>
          </foreignObject>

          <foreignObject
              v-if="showMenu"
              :x="gearPosition.x"
              :y="gearPosition.y"
              width="180"
              height="100"
              style="pointer-events: auto"
          >
            <WallActionMenu @split="splitWall" @add-inner="addInnerWall"/>
          </foreignObject>
        </g>
      </svg>
    </div>
  </projectLayout>
</template>

<script setup>
import {ref, onMounted, onUnmounted} from 'vue'
import projectLayout from '../../UI/layouts/projectLayout.vue'
import WallActionMenu from '../../UI/elements/SmallActionMenu.vue'

import {useWalls} from '../../composables/useWalls'
import {useRoomDrag} from '../../composables/useRoomDrag'
import {useWallSplit} from '../../composables/useWallSplit'
import {usePanAndZoom} from '../../composables/usePanAndZoom'
import {useCenterRoom} from '../../composables/useCenterRoom'

const unit = ref('cm')
const wallThickness = ref(12)

const corners = ref([
  {x: 0, y: 0},
  {x: 350, y: 0},
  {x: 350, y: 350},
  {x: 0, y: 350}
])

const svgRef = ref(null)

const {
  viewX,
  viewY,
  viewScale,
  svgWidth,
  svgHeight,
  handleMouseDown,
  handleMouseMove: panMouseMove,
  handleMouseUp: panMouseUp,
  handleWheel
} = usePanAndZoom()

const {walls, angles, internalLines, angleMarkers} = useWalls(corners, wallThickness, unit)

const {
  handleWallMouseDown,
  handleCornerMouseDown,
  handleDragMove,
  resetDragState
} = useRoomDrag(corners, svgRef, viewScale, viewX, viewY)

const {
  showGear,
  gearPosition,
  showMenu,
  activeWallIndex,
  handleWallClick,
  handleWallMouseMove,
  handleWallMouseUp,
  handleSvgClick,
  toggleMenu,
  splitWall,
  addInnerWall
} = useWallSplit(corners, viewScale, svgRef, viewX, viewY)

const {centerRoom} = useCenterRoom(corners, svgRef, viewX, viewY, viewScale)

const handleMouseMove = (e) => {
  panMouseMove(e)
  handleDragMove(e)
}

const handleMouseUp = () => {
  panMouseUp(svgRef)
  resetDragState()
}

onMounted(() => {
  centerRoom()
  window.addEventListener('resize', centerRoom)
})

onUnmounted(() => {
  window.removeEventListener('resize', centerRoom)
})
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

.svg-style {
  position: relative;
  background: #eeeeee;
}

.svg-wrapper ::v-deep svg text {
  user-select: none;
  pointer-events: none;
}

.gear-icon-wrapper {
  background: rgba(255, 255, 255, 0.2);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, opacity 0.2s, transform 0.2s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

.gear-icon-wrapper:hover {
  background: white;
  opacity: 1;
  transform: scale(1.02);
}

.active-wall {
  stroke: #b0b000;
  filter: url(#inner-glow);
}
</style>