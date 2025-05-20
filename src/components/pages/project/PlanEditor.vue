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
            class="settings"
        />
        <DoorSettingsCard
            v-if="isDoorToolActive"
            :width="doorWidth"
            :height="doorHeight"
            :unit="unit"
            @update:width="updateDoorWidth"
            @update:height="updateDoorHeight"
            @update:opening-direction="updateDoorOpeningDirection"
            @update:opening-side="updateDoorOpeningSide"
            class="settings"
        />
        <WindowSettingsCard
            v-if="isWindowToolActive"
            :width="windowWidth"
            :height="windowHeight"
            :floor-height="windowFloorHeight"
            :unit="unit"
            @update:width="updateWindowWidth"
            @update:height="updateWindowHeight"
            @update:floor-height="updateWindowFloorHeight"
            class="settings"
        />
        <PanelSettingsCard
            v-if="isPanelToolActive"
            :width="panelWidth"
            :height="panelHeight"
            :floor-height="panelFloorHeight"
            :unit="unit"
            @update:width="updatePanelWidth"
            @update:height="updatePanelHeight"
            @update:floor-height="updatePanelFloorHeight"
            class="settings"
        />
        <SocketSettingsCard
            v-if="isSocketToolActive"
            :floor-height="socketFloorHeight"
            :unit="unit"
            @update:floor-height="updateSocketFloorHeight"
            class="settings"
        />
        <LightPanelCard
            v-if="isCeilingLightToolActive || isWallLightToolActive"
            :floor-height="lightFloorHeight"
            :unit="unit"
            :is-wall-light="isWallLightToolActive"
            @update:floor-height="updateLightFloorHeight"
            class="settings"
        />
        <SwitchSettingsCard
            v-if="isSwitchToolActive"
            :floor-height="switchFloorHeight"
            :unit="unit"
            @update:floor-height="updateSwitchFloorHeight"
            class="switch-settings"
        />
        <div class="editor-canvas-container">
          <canvas ref="canvas" class="editor-canvas" @contextmenu="onContextMenu" @wheel="onWheel"></canvas>
          
          />
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
import DoorSettingsCard from "../../UI/settings/DoorSettingsCard.vue";
import WindowSettingsCard from "../../UI/settings/WindowSettingsCard.vue";
import PanelSettingsCard from "../../UI/settings/PanelSettingsCard.vue";
import SocketSettingsCard from "../../UI/settings/SocketSettingsCard.vue";
import LightPanelCard from "../../UI/settings/LightPanelCard.vue";
import SwitchSettingsCard from "../../UI/settings/SwitchSettingsCard.vue";
import ObjectCanvasRenderer from '../../../utils/ObjectCanvasRenderer';

export default {
  name: 'PlanEditor',
  components: {
    ProjectLayout,
    ToolSidebar,
    WallSettingsCard,
    DoorSettingsCard,
    WindowSettingsCard,
    PanelSettingsCard,
    SocketSettingsCard,
    LightPanelCard,
    SwitchSettingsCard,
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
      resizeObserver: null,
      doorWidth: 800,
      doorHeight: 2100,
      windowWidth: 1000,
      windowHeight: 1200,
      windowFloorHeight: 1000,
      panelWidth: 300,
      panelHeight: 210,
      panelFloorHeight: 1200,
      socketFloorHeight: 300,
      lightFloorHeight: 2200, // default for wall light
      switchFloorHeight: 900,
      objectRenderer: null,
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
    },
    isDoorToolActive() {
      return this.currentTool === 'door';
    },
    isWindowToolActive() {
      return this.currentTool === 'window';
    },
    isPanelToolActive() {
      return this.currentTool === 'panel';
    },
    isSocketToolActive() {
      return this.currentTool === 'socket';
    },
    isCeilingLightToolActive() {
      return this.currentTool === 'ceiling-light';
    },
    isWallLightToolActive() {
      return this.currentTool === 'wall-light';
    },
    isSwitchToolActive() {
      return this.currentTool === 'single-switch' || this.currentTool === 'double-switch';
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

      this.objectRenderer = new ObjectCanvasRenderer(this.$store, this.ctx);
      this.objectRenderer.redrawAll(this.$store.state);
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
        this.wallManager.onClick(e);
      } else if (this.objectManager && this.objectManager.isValidPlacement()) {
        const newObject = this.objectManager.createObject();
        if (newObject) {
          switch (newObject.type) {
            case 'door':
              this.$store.dispatch('doors/addDoor', newObject);
              break;
            case 'window':
              this.$store.dispatch('windows/addWindow', newObject);
              break;
            case 'socket':
              this.$store.dispatch('electrical/addSocket', newObject);
              break;
            case 'panel':
              this.$store.dispatch('electrical/addPanel', newObject);
              break;
            case 'ceiling-light':
              this.$store.dispatch('lighting/addCeilingLight', newObject);
              break;
            case 'wall-light':
              this.$store.dispatch('lighting/addWallLight', newObject);
              break;
            case 'single-switch':
              this.$store.dispatch('switches/addSingleSwitch', newObject);
              break;
            case 'double-switch':
              this.$store.dispatch('switches/addDoubleSwitch', newObject);
              break;
            default:
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

      // Update object renderer with current transform
      if (this.objectRenderer && this.wallManager) {
        this.objectRenderer.updateTransform(
          this.wallManager.panOffset,
          this.wallManager.zoom
        );
        this.objectRenderer.redrawAll(this.$store.state);
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
    updateDoorWidth(width) {
      this.doorWidth = width;
      if (this.objectManager && this.isDoorToolActive) {
        // Update the object manager with new width
        this.objectManager.setTool('door'); // Reinitialize the preview
        this.objectManager.updateTransform(this.wallManager.panOffset, this.wallManager.zoom);
        this.objectManager.updatePreview(this.mousePosition);
        this.redraw();
      }
    },
    updateDoorHeight(height) {
      this.doorHeight = height;
      if (this.objectManager && this.isDoorToolActive) {
        // Update the object manager with new height
        this.objectManager.setTool('door'); // Reinitialize the preview
        this.objectManager.updateTransform(this.wallManager.panOffset, this.wallManager.zoom);
        this.objectManager.updatePreview(this.mousePosition);
        this.redraw();
      }
    },
    updateDoorOpeningDirection(direction) {
      if (this.objectManager && this.isDoorToolActive) {
        // Update the object manager with new direction
        this.objectManager.setTool('door'); // Reinitialize the preview
        this.objectManager.updateTransform(this.wallManager.panOffset, this.wallManager.zoom);
        this.objectManager.updatePreview(this.mousePosition);
        this.redraw();
      }
    },
    updateDoorOpeningSide(side) {
      if (this.objectManager && this.isDoorToolActive) {
        // Update the object manager with new side
        this.objectManager.setTool('door'); // Reinitialize the preview
        this.objectManager.updateTransform(this.wallManager.panOffset, this.wallManager.zoom);
        this.objectManager.updatePreview(this.mousePosition);
        this.redraw();
      }
    },
    updateWindowWidth(width) {
      this.windowWidth = width;
      if (this.objectManager) {
        this.objectManager.updateDimensions({ width });
      }
    },
    updateWindowHeight(height) {
      this.windowHeight = height;
      if (this.objectManager) {
        this.objectManager.updateDimensions({ height });
      }
    },
    updateWindowFloorHeight(height) {
      this.windowFloorHeight = height;
      if (this.objectManager) {
        this.objectManager.updateWindowProperties({ floorHeight: height });
      }
    },
    updatePanelWidth(width) {
      this.panelWidth = width;
      if (this.objectManager) {
        this.objectManager.updateDimensions({ width });
        this.objectManager.updatePreview(this.mousePosition);
        this.redraw();
      }
    },
    updatePanelHeight(height) {
      this.panelHeight = height;
      if (this.objectManager) {
        this.objectManager.updateDimensions({ height });
        this.objectManager.updatePreview(this.mousePosition);
        this.redraw();
      }
    },
    updatePanelFloorHeight(height) {
      this.panelFloorHeight = height;
      if (this.objectManager) {
        this.objectManager.updateDimensions({ floorHeight: height });
        this.objectManager.updatePreview(this.mousePosition);
        this.redraw();
      }
    },
    updateSocketFloorHeight(height) {
      this.socketFloorHeight = height;
      if (this.objectManager && this.isSocketToolActive) {
        this.objectManager.updateDimensions({ floorHeight: height });
        this.objectManager.updatePreview(this.mousePosition);
        this.redraw();
      }
    },
    updateLightFloorHeight(height) {
      this.lightFloorHeight = height;
      if (this.objectManager && this.isWallLightToolActive) {
        this.objectManager.updateDimensions({ floorHeight: height });
        this.objectManager.updatePreview(this.mousePosition);
        this.redraw();
      }
    },
    updateSwitchFloorHeight(height) {
      this.switchFloorHeight = height;
      if (this.objectManager && this.isSwitchToolActive) {
        this.objectManager.updateDimensions({ floorHeight: height });
        this.objectManager.updatePreview(this.mousePosition);
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

.settings {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.switch-settings {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
}
</style>