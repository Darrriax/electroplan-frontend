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
        <div class="editor-canvas-container">
          <canvas ref="canvas" class="editor-canvas" @contextmenu="onContextMenu" @wheel="onWheel"></canvas>
        </div>
      </div>
    </div>
  </project-layout>
</template>

<script>
import ProjectLayout from '../../UI/layouts/ProjectLayout.vue';
import WallDrawingManager from '../../../utils/wallDrawing.js';
import ObjectManagerFactory from '../../../utils/ObjectManagerFactory';
import { mapState, mapGetters, mapActions } from 'vuex';
import ToolSidebar from "../../UI/elements/ToolSidebar.vue";
import WallSettingsCard from "../../UI/settings/WallSettingsCard.vue";

export default {
  name: 'PlanEditor',
  components: {
    ProjectLayout,
    ToolSidebar,
    WallSettingsCard
  },
  data() {
    return {
      wallManager: null,
      objectManager: null,
      canvas: null,
      ctx: null,
      mousePosition: { x: 0, y: 0 },
      canvasWidth: 0,
      canvasHeight: 0,
      resizeObserver: null
    };
  },
  computed: {
    ...mapState('project', ['unit']),
    ...mapGetters({
      isMenuOpen: 'project/isMenuOpen',
      currentTool: 'project/getCurrentTool',
      currentMode: 'project/getCurrentMode',
      editorTools: 'project/getCurrentModeTools',
      wallThickness: 'walls/defaultThickness',
      wallHeight: 'walls/defaultHeight'
    }),
    isWallToolActive() {
      return this.currentTool === 'wall';
    }
  },
  watch: {
    currentTool(newTool) {
      if (this.objectManager) {
        this.objectManager.setTool(newTool);
        this.redraw();
      }
    }
  },
  mounted() {
    // Initialize canvas after component is mounted
    this.$nextTick(() => {
      this.initializeCanvas();
      
      // Set up resize observer
      this.resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.target === this.canvas.parentElement) {
            this.resizeCanvas();
          }
        }
      });
      
      this.resizeObserver.observe(this.canvas.parentElement);
    });

    // Add keyboard shortcuts
    window.addEventListener('keydown', this.handleKeyboard);

    // Set initial tool
    if (!this.currentTool) {
      this.setCurrentTool('wall');
    }
  },
  methods: {
    ...mapActions({
      setToolAction: 'project/setTool',
      updateThickness: 'walls/updateDefaultThickness',
      updateHeight: 'walls/updateDefaultHeight'
    }),
    initializeCanvas() {
      this.canvas = this.$refs.canvas;
      if (!this.canvas) return;

      // Set canvas size
      const container = this.canvas.parentElement;
      this.canvasWidth = container.clientWidth;
      this.canvasHeight = container.clientHeight;
      
      // Set canvas dimensions
      this.canvas.width = this.canvasWidth;
      this.canvas.height = this.canvasHeight;

      // Get context
      this.ctx = this.canvas.getContext('2d');
      
      // Initialize managers with both canvas and store
      this.wallManager = new WallDrawingManager(this.canvas, this.$store);
      this.objectManager = new ObjectManagerFactory(this.$store);
      
      // Set up event listeners
      this.canvas.addEventListener('mousemove', this.onMouseMove);
      this.canvas.addEventListener('click', this.onClick);
      
      // Initial draw
      this.redraw();
    },
    resizeCanvas() {
      if (!this.canvas) return;

      const container = this.canvas.parentElement;
      this.canvasWidth = container.clientWidth;
      this.canvasHeight = container.clientHeight;
      
      this.canvas.width = this.canvasWidth;
      this.canvas.height = this.canvasHeight;

      // Update wall manager canvas size
      if (this.wallManager) {
        this.wallManager.canvas = this.canvas;
        this.wallManager.ctx = this.canvas.getContext('2d');
      }

      this.redraw();
    },
    setCurrentTool(tool) {
      this.setToolAction(tool);
    },
    updateWallThickness(thickness) {
      this.updateThickness(thickness);
    },
    updateWallHeight(height) {
      this.updateHeight(height);
    },
    onMouseMove(e) {
      if (!this.canvas) return;

      const rect = this.canvas.getBoundingClientRect();
      this.mousePosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      // Update preview based on current tool
      if (this.currentTool === 'wall' && this.wallManager) {
        this.wallManager.onMouseMove(e); // Pass the entire event
      } else if (this.objectManager) {
        // Update object manager transform state
        this.objectManager.updateTransform(
          this.wallManager.panOffset,
          this.wallManager.zoom
        );
        this.objectManager.updatePreview(this.mousePosition);
      }
      
      this.redraw();
    },
    onClick(e) {
      if (!this.canvas) return;

      if (this.currentTool === 'wall' && this.wallManager) {
        this.wallManager.onClick(e); // Pass the entire event
      } else if (this.objectManager && this.objectManager.isValidPlacement()) {
        const newObject = this.objectManager.createObject();
        if (newObject) {
          // Add object to appropriate store module based on type
          switch(newObject.type) {
            case 'door':
            case 'window':
              this.$store.dispatch('project/addElement', newObject);
              break;
            case 'socket':
            case 'panel':
              this.$store.dispatch('electrical/addElement', newObject);
              break;
            case 'ceiling-light':
            case 'wall-light':
              this.$store.dispatch('lighting/addElement', newObject);
              break;
            case 'single-switch':
            case 'double-switch':
              this.$store.dispatch('switches/addElement', newObject);
              break;
          }
        }
      }
      
      this.redraw();
    },
    redraw() {
      if (!this.ctx || !this.canvas) return;

      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      
      // Let wall manager handle its own drawing
      if (this.wallManager) {
        this.wallManager.draw();
      }
      
      // Draw object preview if not in wall mode
      if (this.currentTool !== 'wall' && this.objectManager) {
        // Update object manager transform state before drawing
        this.objectManager.updateTransform(
          this.wallManager.panOffset,
          this.wallManager.zoom
        );
        this.objectManager.drawPreview(this.ctx);
      }
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
      if (this.wallManager) {
        this.wallManager.undo();
        this.redraw();
      }
    },
    redoAction() {
      if (this.wallManager) {
        this.wallManager.redo();
        this.redraw();
      }
    },
    onContextMenu(event) {
      event.preventDefault(); // Prevent the default context menu
      this.setCurrentTool(null); // Deselect the current tool
    },
    onWheel(event) {
      event.preventDefault();
      if (this.wallManager) {
        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        this.wallManager.zoom = Math.min(Math.max(0.1, this.wallManager.zoom * delta), 5);
        // Update object manager transform state after zoom change
        if (this.objectManager) {
          this.objectManager.updateTransform(
            this.wallManager.panOffset,
            this.wallManager.zoom
          );
        }
        this.redraw();
      }
    },
    beforeUnmount() {
      // Clean up event listeners
      window.removeEventListener('keydown', this.handleKeyboard);
      
      if (this.canvas) {
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('click', this.onClick);
      }

      // Clean up resize observer
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
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