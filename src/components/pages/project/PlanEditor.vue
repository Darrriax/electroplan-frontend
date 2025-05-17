<template>
  <project-layout @undo="undoAction" @redo="redoAction">
    <div class="plan-editor">
      <ToolSidebar
          :tools="editorTools"
          :visible="isMenuOpen"
          :current-tool="currentTool"
          @tool-selected="setCurrentTool"
      />
      <div class="editor-content">
        <WallSettingsCard
            v-if="isWallToolActive"
            :thickness="wallThickness"
            :unit="unit"
            @update:thickness="updateWallThickness"
            class="wall-settings"
        />
        <DoorSettingsCard v-if="isDoorToolActive" />
        <WindowSettingsCard v-if="isWindowToolActive" />
        <SocketSettingsCard v-if="isSocketToolActive" />
        <div class="editor-canvas-container">
          <canvas ref="canvas" class="editor-canvas" @contextmenu="onContextMenu" @wheel="onWheel" @click="handleCanvasClick"></canvas>
        </div>
      </div>
    </div>
  </project-layout>
</template>

<script>
import ProjectLayout from '../../UI/layouts/ProjectLayout.vue';
import WallDrawingManager from '../../../utils/wallDrawing.js';
import ObjectManager from '../../../utils/drawing/ObjectManager.js';
import { mapState, mapGetters, mapActions } from 'vuex';
import ToolSidebar from "../../UI/elements/ToolSidebar.vue";
import WallSettingsCard from "../../UI/settings/WallSettingsCard.vue";
import DoorSettingsCard from "../../UI/settings/DoorSettingsCard.vue";
import WindowSettingsCard from "../../UI/settings/WindowSettingsCard.vue";
import SocketSettingsCard from "../../UI/settings/SocketSettingsCard.vue";

export default {
  name: 'PlanEditor',
  components: {
    ProjectLayout,
    ToolSidebar,
    WallSettingsCard,
    DoorSettingsCard,
    WindowSettingsCard,
    SocketSettingsCard
  },
  data() {
    return {
      drawingManager: null,
      objectManager: null,
      lastMouseX: null,
      lastMouseY: null,
      editorTools: [
        { id: 'wall', name: 'wall', label: 'Walls', icon: 'mdi mdi-wall' },
        { id: 'door', name: 'door', label: 'Doors', icon: 'mdi mdi-door' },
        { id: 'window', name: 'window', label: 'Windows', icon: 'mdi mdi-window-closed-variant' }
      ]
    };
  },
  computed: {
    ...mapState('project', ['unit', 'activeMode']),
    ...mapGetters({
      isMenuOpen: 'project/isMenuOpen',
      currentTool: 'project/getCurrentTool',
      wallThickness: 'walls/defaultThickness',
      wallHeight: 'walls/defaultHeight',
      currentTools: 'project/currentTools'
    }),
    isWallToolActive() {
      return this.currentTool === 'wall';
    },
    isDoorToolActive() {
      return this.currentTool === 'door';
    },
    isWindowToolActive() {
      return this.currentTool === 'window';
    },
    isSocketToolActive() {
      return ['standard-socket', 'waterproof-socket', 'switchboard'].includes(this.currentTool);
    }
  },
  mounted() {
    this.initializeCanvas();

    // Handle window resize
    window.addEventListener('resize', this.resizeCanvas);

    // Add keyboard shortcuts
    window.addEventListener('keydown', this.handleKeyboard);

    // Add mouse move handler directly to canvas
    this.$refs.canvas.addEventListener('mousemove', this.handleCanvasMouseMove);

    // Set initial tool
    if (!this.currentTool) {
      this.setCurrentTool('wall');
    }

    // Initial draw
    this.drawAll();
  },
  methods: {
    ...mapActions({
      setToolAction: 'project/setTool',
      updateThickness: 'walls/updateDefaultThickness',
      updateHeight: 'walls/updateDefaultHeight'
    }),
    setCurrentTool(tool) {
      this.setToolAction(tool);
    },
    updateWallThickness(thickness) {
      this.updateThickness(thickness);
    },
    updateWallHeight(height) {
      this.updateHeight(height);
    },
    initializeCanvas() {
      if (!this.$refs.canvas) return;

      // Create new drawing manager instance
      this.drawingManager = new WallDrawingManager(this.$refs.canvas, this.$store);
      this.objectManager = new ObjectManager(this.$refs.canvas.getContext('2d'), this.$store);

      // Load any existing data
      this.drawingManager.loadFromStore();
      
      // Initial draw
      this.drawAll();
    },
    resizeCanvas() {
      if (!this.drawingManager) return;
      this.drawingManager.resizeCanvas();
      this.drawAll();
    },
    handleKeyboard(event) {
      // Undo: Ctrl/Cmd + Z
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        this.undoAction();
      }
      // Redo: Ctrl/Cmd + Shift + Z
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        this.redoAction();
      }
    },
    undoAction() {
      if (this.drawingManager) {
        this.drawingManager.undo();
        this.drawAll();
      }
    },
    redoAction() {
      if (this.drawingManager) {
        this.drawingManager.redo();
        this.drawAll();
      }
    },
    onContextMenu(event) {
      event.preventDefault();
      this.setCurrentTool(null);
    },
    onWheel(event) {
      event.preventDefault();
      if (this.drawingManager) {
        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        this.drawingManager.zoom = Math.min(Math.max(0.1, this.drawingManager.zoom * delta), 5);
        
        // Update object manager transform
        if (this.objectManager) {
          this.objectManager.updateTransform(this.drawingManager.panOffset, this.drawingManager.zoom);
        }
        
        this.drawAll();
      }
    },
    handleCanvasClick(e) {
      if (!this.drawingManager) return;

      // Only handle left-click (button 0)
      if (e.button !== 0) return;

      const point = this.drawingManager.getMousePos(e);
      
      if (this.isSocketToolActive) {
        if (this.objectManager) {
          this.objectManager.handleClick(e);
          this.drawAll();
        }
      } else {
        this.drawingManager.handleClick(point);
      }
    },
    handleCanvasMouseMove(e) {
      if (!this.drawingManager) return;

      // Update transforms for both managers
      if (this.objectManager) {
        this.objectManager.updateTransform(this.drawingManager.panOffset, this.drawingManager.zoom);
      }

      // Only update object preview if socket tool is active
      if (this.isSocketToolActive && this.objectManager) {
        this.objectManager.updateObjectPreview(e, this.drawingManager.walls);
      }

      // Always redraw everything to keep objects visible
      this.drawAll();
    },
    drawAll() {
      if (!this.drawingManager) return;

      // Clear the canvas
      const ctx = this.drawingManager.ctx;
      const canvas = ctx.canvas;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Draw walls and other elements
      this.drawingManager.draw();

      // Always draw objects, regardless of tool state
      if (this.objectManager) {
        this.objectManager.draw();
      }
    }
  },
  beforeUnmount() {
    // Clean up event listeners
    window.removeEventListener('resize', this.resizeCanvas);
    window.removeEventListener('keydown', this.handleKeyboard);
    if (this.$refs.canvas) {
      this.$refs.canvas.removeEventListener('mousemove', this.handleCanvasMouseMove);
    }

    // Clean up drawing manager
    if (this.drawingManager) {
      this.drawingManager.cleanup();
    }
  },
  watch: {
    wallThickness: {
      handler() {
        this.drawAll();
      }
    },
    currentTool: {
      handler(newTool) {
        // Clear any preview when tool changes
        if (this.objectManager) {
          this.objectManager.clearPreview();
        }
        
        // Always redraw to ensure objects remain visible
        this.drawAll();
      }
    }
  }
}
</script>

<style scoped>
.plan-editor {
  display: flex;
  height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
}

.editor-canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background-color: #f8f8f8;
  height: 100%;
}

.editor-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.wall-settings {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
}
</style>