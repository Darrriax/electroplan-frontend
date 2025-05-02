<template>
  <project-layout>
    <div class="plan-editor">
      <ToolSidebar
          :tools="editorTools"
          :visible="isMenuOpen"
          :current-tool="currentTool"
          @tool-selected="setCurrentTool"
      />

      <WallSettingsPanel
          v-if="isWallToolActive"
          :thickness="wallThickness"
          :unit="unit"
          @update:thickness="updateWallThickness"
      />

      <div class="editor-canvas">
        <canvas ref="canvas"></canvas>
      </div>
    </div>
  </project-layout>
</template>

<script>
import ProjectLayout from '../../UI/layouts/ProjectLayout.vue';
import ToolSidebar from '../../UI/elements/ToolSidebar.vue';
import WallSettingsPanel from '../../UI/settings/WallSettingsPanel.vue';
import canvasMixin from '../../../mixins/canvasMixin';
import { createCanvasEventHandlers } from '../../../utils/eventHandlers.js';
import {mapState} from "vuex";

// Constants for better maintainability
const EDITOR_TOOLS = [
  { name: 'wall', label: 'Стіна', icon: 'fas fa-wall' },
  { name: 'balcony', label: 'Балкон', icon: 'fas fa-umbrella-beach' },
  { name: 'window', label: 'Вікно', icon: 'fas fa-window-maximize' },
  { name: 'door', label: 'Двері', icon: 'fas fa-door-open' }
];

export default {
  components: {
    ProjectLayout,
    ToolSidebar,
    WallSettingsPanel
  },
  mixins: [canvasMixin],

  data() {
    return {
      currentTool: null,
      isDrawing: false,
      startPoint: null,
      editorTools: EDITOR_TOOLS
    };
  },

  computed: {
    ...mapState('walls', {
      defaultThickness: state => state.defaultThickness,
      unit: state => state.unit
    }),
    ...mapState('project', {
      isMenuOpen: state => state.menuOpen,
    }),
    isWallToolActive() {
      return this.currentTool === 'wall';
    }
  },

  watch: {
    wallThickness: 'handleWallThicknessChange',
    currentTool: 'handleToolChange'
  },

  mounted() {
    this.initializeCanvas();
    this.setupEventListeners();
  },

  beforeDestroy() {
    this.cleanupEventListeners();
  },

  methods: {
    setCurrentTool(tool) {
      this.currentTool = tool;
    },

    updateWallThickness(thickness) {
      this.$store.dispatch('walls/updateDefaultThickness', thickness);
    },

    handleWallThicknessChange(newThickness) {
      this.previewRect?.updateSize(newThickness / 10);
      this.wallManager?.updateWallThickness(newThickness);
    },

    handleToolChange(newTool) {
      this.previewRect?.setVisible(newTool === 'wall');
    },

    initializeCanvas() {
      this.initCanvas();
      this.canvasEventHandlers = createCanvasEventHandlers({
        getCanvasState: () => ({
          canvas: this.canvas,
          currentTool: this.currentTool,
          isDrawing: this.isDrawing,
          startPoint: this.startPoint,
          wallManager: this.wallManager,
          previewRect: this.previewRect,
          grid: this.grid
        }),
        onDrawingStart: (point) => {
          this.isDrawing = true;
          this.startPoint = point;
        },
        onDrawingEnd: () => {
          this.isDrawing = false;
        }
      });
    },

    setupEventListeners() {
      document.addEventListener('contextmenu', this.preventContextMenuDefault);
      this.canvas.on({
        'mouse:move': this.handleCanvasMouseMove,
        'mouse:down': this.handleCanvasMouseDown,
        'mouse:up': this.handleCanvasMouseUp
      });
    },

    cleanupEventListeners() {
      document.removeEventListener('contextmenu', this.preventContextMenuDefault);
      this.canvas.off({
        'mouse:move': this.handleCanvasMouseMove,
        'mouse:down': this.handleCanvasMouseDown,
        'mouse:up': this.handleCanvasMouseUp
      });
    },

    handleCanvasMouseMove(event) {
      this.canvasEventHandlers.handleMouseMove(event);
    },

    handleCanvasMouseDown(event) {
      this.canvasEventHandlers.handleMouseDown(event);
    },

    handleCanvasMouseUp(event) {
      this.canvasEventHandlers.handleMouseUp(event);
    },

    preventContextMenuDefault(event) {
      event.preventDefault();
      this.currentTool = null;
      this.previewRect?.setVisible(false);
    }
  }
};
</script>