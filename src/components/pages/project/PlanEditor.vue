<template>
  <project-layout @undo="undoAction" @redo="redoAction">
    <div class="plan-editor">
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading project...</div>
      </div>

      <div class="save-button" @click="saveProject">
        <i class="fas fa-save"></i>
        <span>Save Project</span>
      </div>

      <ToolSidebar
          v-if="!loading"
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
            @hover-change="redraw"
            class="settings"
        />
        <SwitchSettingsCard
            v-if="isSwitchToolActive"
            :floor-height="switchFloorHeight"
            :unit="unit"
            @update:floor-height="updateSwitchFloorHeight"
            @hover-change="redraw"
            class="switch-settings"
        />
        <div class="editor-canvas-container">
          <canvas ref="canvas" class="editor-canvas" @contextmenu="onContextMenu" @wheel="onWheel"></canvas>
          
          />
        </div>
      </div>
    </div>
    <message :label="message" />
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
import WallEdgeObject from '../../../utils/objectManagers/WallEdgeObject';
import WallEdgeObjectRenderer from '../../../utils/WallEdgeObjectRenderer';
import CeilingObject from '../../../utils/objectManagers/CeilingObject';
import CeilingObjectRenderer from '../../../utils/CeilingObjectRenderer';
import NotificationToast from '../../UI/elements/NotificationToast.vue';
import Message from "../../UI/elements/Message.vue";
import { ProjectApi } from '../../../api/api';

export default {
  name: 'PlanEditor',
  props: {
    id: {
      type: String,
      required: false,
      default: null
    }
  },
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
    NotificationToast,
    Message,
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
      windowWidth: 1200,
      windowHeight: 1200,
      windowFloorHeight: 900,
      panelWidth: 300,
      panelHeight: 210,
      panelFloorHeight: 1200,
      socketFloorHeight: 300,
      lightFloorHeight: 2200,
      switchFloorHeight: 900,
      objectRenderer: null,
      wallEdgeObjectManager: null,
      wallEdgeObjectRenderer: null,
      ceilingObjectManager: null,
      ceilingObjectRenderer: null,
      projectData: null,
      loading: true,
      isCanvasInitialized: false
    };
  },
  computed: {
    ...mapState('project', ['unit']),
    ...mapState('canvas', ['transform']),
    ...mapGetters({
      isMenuOpen: 'project/isMenuOpen',
      currentTool: 'project/getCurrentTool',
      currentMode: 'project/getCurrentMode',
      editorTools: 'project/getCurrentModeTools',
      wallThickness: 'walls/defaultThickness',
      wallHeight: 'walls/defaultHeight'
    }),
    ...mapGetters('reports', {
      message: 'getMessage',
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
    },
    transform: {
      handler(newTransform) {
        if (this.objectRenderer) {
          this.objectRenderer.updateTransform(
            newTransform.panOffset,
            newTransform.zoom
          );
          this.redraw();
        }
      },
      deep: true
    },
    // Watch for changes in walls
    '$store.state.walls.walls': {
      handler(newWalls) {
        // Ensure walls are synced with project module
        this.$store.dispatch('walls/notifyProjectModule');
        if (this.objectRenderer) {
          this.objectRenderer.redrawAll(this.$store.state);
          this.redraw();
        }
      },
      deep: true,
      immediate: true
    },
    // Watch for changes in windows
    '$store.state.windows.windows': {
      handler(newWindows) {
        // Ensure windows are synced with project module
        this.$store.dispatch('windows/notifyProjectModule');
        if (this.objectRenderer) {
          this.objectRenderer.redrawAll(this.$store.state);
          this.redraw();
        }
      },
      deep: true,
      immediate: true
    },
    // Watch for changes in doors
    '$store.state.doors.doors': {
      handler(newDoors) {
        // Ensure doors are synced with project module
        this.$store.dispatch('doors/notifyProjectModule');
        if (this.objectRenderer) {
          this.objectRenderer.redrawAll(this.$store.state);
          this.redraw();
        }
      },
      deep: true,
      immediate: true
    },
    // Watch for changes in rooms
    '$store.state.rooms.rooms': {
      handler(newRooms) {
        // Ensure rooms are synced with project module
        this.$store.dispatch('rooms/notifyProjectModule');
        if (this.objectRenderer) {
          this.objectRenderer.redrawAll(this.$store.state);
          this.redraw();
        }
      },
      deep: true,
      immediate: true
    },
    // Watch for changes in sockets
    '$store.state.sockets.sockets': {
      handler(newSockets) {
        // Ensure sockets are synced with project module
        this.$store.dispatch('sockets/notifyProjectModule');
        if (this.objectRenderer) {
          this.objectRenderer.redrawAll(this.$store.state);
          this.redraw();
        }
      },
      deep: true,
      immediate: true
    },
    // Watch for changes in panels
    '$store.state.panels.panels': {
      handler(newPanels) {
        // Ensure panels are synced with project module
        this.$store.dispatch('panels/notifyProjectModule');
        if (this.objectRenderer) {
          this.objectRenderer.redrawAll(this.$store.state);
          this.redraw();
        }
      },
      deep: true,
      immediate: true
    },
    // Watch for changes in lights (both ceiling and wall)
    '$store.state.lights.ceilingLights': {
      handler() {
        // Ensure lights are synced with project module
        this.$store.dispatch('lights/notifyProjectModule');
        if (this.objectRenderer) {
          this.objectRenderer.redrawAll(this.$store.state);
          this.redraw();
        }
      },
      deep: true,
      immediate: true
    },
    '$store.state.lights.wallLights': {
      handler() {
        // Ensure lights are synced with project module
        this.$store.dispatch('lights/notifyProjectModule');
        if (this.objectRenderer) {
          this.objectRenderer.redrawAll(this.$store.state);
          this.redraw();
        }
      },
      deep: true,
      immediate: true
    },
    // Watch for changes in switches
    '$store.state.switches.switches': {
      handler(newSwitches) {
        // Ensure switches are synced with project module
        this.$store.dispatch('switches/notifyProjectModule');
        if (this.objectRenderer) {
          this.objectRenderer.redrawAll(this.$store.state);
          this.redraw();
        }
      },
      deep: true,
      immediate: true
    },
    isCanvasInitialized: {
      immediate: true,
      handler(isInitialized) {
        if (isInitialized && this.objectRenderer) {
          this.$nextTick(() => {
            this.objectRenderer.redrawAll(this.$store.state);
            this.redraw();
          });
        }
      }
    }
  },
  async created() {
    try {
      if (!this.id) {
        // Reset all modules before initializing new project
        await this.$store.dispatch('project/resetAll');
        // Initialize new project
        await this.$store.dispatch('project/initializeProjectData', {
          name: 'Untitled Project',
          customer: '',
          data: {
            walls: [],
            doors: [],
            windows: [],
            rooms: [],
            panels: [],
            sockets: [],
            switches: { switches: [] },
            lights: {
              ceilingLights: [],
              wallLights: [],
              lightGroups: []
            },
            scale: 1,
            unit: 'cm'
          }
        });
      }
      // For existing projects, data is already loaded by the router
    } catch (error) {
      console.error('Failed to initialize project:', error);
      this.$store.dispatch('reports/setMessage', 'Failed to initialize project');
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.initializeCanvas();
      this.loading = false;
    });
  },
  activated() {
    // When returning to this component, reload walls from store
    if (this.wallManager) {
      this.wallManager.loadFromStore();
      this.redraw();
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
      
      // Initialize renderers
      this.objectRenderer = new ObjectCanvasRenderer(this.$store, this.ctx);
      this.wallEdgeObjectManager = new WallEdgeObject(this.$store);
      this.wallEdgeObjectRenderer = new WallEdgeObjectRenderer(this.$store);
      this.ceilingObjectManager = new CeilingObject(this.$store);
      this.ceilingObjectRenderer = new CeilingObjectRenderer(this.$store);
      
      // Set up event listeners
      this.canvas.addEventListener('mousemove', this.onMouseMove);
      this.canvas.addEventListener('click', this.handleCanvasClick);
      
      // Set up resize observer
      this.resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.target === this.canvas.parentElement) {
            this.resizeCanvas();
          }
        }
      });
      
      this.resizeObserver.observe(this.canvas.parentElement);

      // Add keyboard shortcuts
      window.addEventListener('keydown', this.handleKeyboard);

      // Set initial tool if none selected
      if (!this.currentTool) {
        this.setCurrentTool('wall');
      }

      // Load existing walls from store and force a complete redraw
      this.wallManager.loadFromStore();
      
      // Force a complete redraw of all elements
      this.$nextTick(() => {
        if (this.objectRenderer) {
          this.objectRenderer.redrawAll(this.$store.state);
          this.redraw();
        }
      });
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

      // Update object renderer transform and redraw objects
      if (this.objectRenderer) {
        this.objectRenderer.updateTransform(this.wallManager.panOffset, this.wallManager.zoom);
        this.objectRenderer.redrawAll(this.$store.state);
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
    handleCanvasClick(event) {
        if (!this.currentTool) return;

        const rect = this.canvas.getBoundingClientRect();
        const screenPoint = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };

        // Convert screen coordinates to world coordinates
        const mousePoint = {
            x: (screenPoint.x - this.wallManager.panOffset.x) / this.wallManager.zoom,
            y: (screenPoint.y - this.wallManager.panOffset.y) / this.wallManager.zoom
        };

        switch (this.currentTool) {
            case 'wall':
                this.wallManager.onClick(event);
                break;
            case 'door':
            case 'window':
                if (this.objectManager && this.objectManager.isValidPlacement()) {
                    const newObject = this.objectManager.createObject();
                    if (newObject) {
                        if (newObject.type === 'door') {
                            this.$store.dispatch('doors/addDoor', newObject);
                        } else if (newObject.type === 'window') {
                            this.$store.dispatch('windows/addWindow', newObject);
                        }
                        // Reinitialize the preview for continuous placement
                        this.objectManager.setTool(newObject.type);
                    }
                }
                break;
            case 'socket':
                this.handleSocketCreation(mousePoint);
                break;
            case 'panel':
                this.handlePanelCreation(mousePoint);
                break;
            case 'ceiling-light':
                this.handleCeilingLightCreation(mousePoint);
                break;
            case 'wall-light':
                this.handleWallLightCreation(mousePoint);
                break;
            case 'single-switch':
            case 'double-switch':
                this.handleSwitchCreation(mousePoint);
                break;
        }
    },
    redraw() {
      if (!this.ctx || !this.canvas) return;

      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      
      // Let wall manager handle its own drawing
      if (this.wallManager) {
        this.wallManager.draw();
      }

      // Update object renderer with current transform and redraw all objects
      if (this.objectRenderer && this.wallManager) {
        this.objectRenderer.updateTransform(
          this.wallManager.panOffset,
          this.wallManager.zoom
        );
        
        // Force a complete redraw of all objects
        this.objectRenderer.redrawAll(this.$store.state);

        // Explicitly redraw doors and windows
        const doors = this.$store.state.doors.doors || [];
        const windows = this.$store.state.windows.windows || [];
        const walls = this.$store.state.walls.walls || [];

        // Redraw doors
        doors.forEach(door => {
          const wall = walls.find(w => w.id === door.wallId);
          if (wall) {
            this.objectRenderer.drawDoor(this.ctx, door, wall);
          }
        });

        // Redraw windows
        windows.forEach(window => {
          const wall = walls.find(w => w.id === window.wallId);
          if (wall) {
            this.objectRenderer.drawWindow(this.ctx, window, wall);
          }
        });
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

      // Draw wall edge objects
      if (this.wallEdgeObjectRenderer) {
        this.wallEdgeObjectRenderer.updateTransform(this.wallManager.panOffset, this.wallManager.zoom);
        this.wallEdgeObjectRenderer.drawObjects(this.ctx);
      }

      // Draw ceiling objects
      if (this.ceilingObjectRenderer) {
        this.ceilingObjectRenderer.updateTransform(this.wallManager.panOffset, this.wallManager.zoom);
        this.ceilingObjectRenderer.drawObjects(this.ctx);
      }

      // Draw wall edge object preview
      if (this.wallEdgeObjectManager?.preview) {
        this.wallEdgeObjectManager.updateTransform(this.wallManager.panOffset, this.wallManager.zoom);
        this.wallEdgeObjectManager.drawPreview(this.ctx, this.wallEdgeObjectManager.preview);
      }

      // Draw ceiling object preview
      if (this.ceilingObjectManager?.preview) {
        this.ceilingObjectManager.updateTransform(this.wallManager.panOffset, this.wallManager.zoom);
        this.ceilingObjectManager.drawPreview(this.ctx, this.ceilingObjectManager.preview);
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
        // Let the wall manager handle the zoom
        this.wallManager.onWheel(event);
        
        // Update object manager transform state after zoom change
        if (this.objectManager) {
          this.objectManager.updateTransform(
            this.wallManager.panOffset,
            this.wallManager.zoom
          );
        }
        
        // Update object renderer with new transform
        if (this.objectRenderer) {
          this.objectRenderer.updateTransform(
            this.wallManager.panOffset,
            this.wallManager.zoom
          );
          this.objectRenderer.redrawAll(this.$store.state);
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
      // Store the width in component state (in mm)
      this.windowWidth = width;
      // Update the Vuex store
      this.$store.dispatch('windows/updateDefaultWidth', width);
      
      if (this.objectManager && this.isWindowToolActive) {
        // Update the object manager with new width
        this.objectManager.setTool('window'); // Reinitialize the preview
        this.objectManager.updateTransform(this.wallManager.panOffset, this.wallManager.zoom);
        this.objectManager.updateDimensions({ length: width }); // Use length instead of width for WallCenteredObject
        this.objectManager.updatePreview(this.mousePosition);
        this.redraw();
      }
    },
    updateWindowHeight(height) {
      // Store the height in component state (in mm)
      this.windowHeight = height;
      // Update the Vuex store
      this.$store.dispatch('windows/updateDefaultHeight', height);
      
      if (this.objectManager && this.isWindowToolActive) {
        // Update the object manager with new height
        this.objectManager.setTool('window'); // Reinitialize the preview
        this.objectManager.updateTransform(this.wallManager.panOffset, this.wallManager.zoom);
        this.objectManager.updateDimensions({ height });
        this.objectManager.updatePreview(this.mousePosition);
        this.redraw();
      }
    },
    updateWindowFloorHeight(height) {
      // Store the floor height in component state (in mm)
      this.windowFloorHeight = height;
      // Update the Vuex store
      this.$store.dispatch('windows/updateDefaultFloorHeight', height);
      
      if (this.objectManager && this.isWindowToolActive) {
        // Update the object manager with new floor height
        this.objectManager.setTool('window'); // Reinitialize the preview
        this.objectManager.updateTransform(this.wallManager.panOffset, this.wallManager.zoom);
        this.objectManager.updateDimensions({ floorHeight: height });
        this.objectManager.updatePreview(this.mousePosition);
        this.redraw();
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
    handleSocketCreation(mousePoint) {
        if (!this.wallEdgeObjectManager.preview) {
            this.wallEdgeObjectManager.preview = this.wallEdgeObjectManager.initializePreview('socket');
            // Set floor height from store
            this.wallEdgeObjectManager.preview.dimensions.floorHeight = this.socketFloorHeight;
        }

        const distance = this.wallEdgeObjectManager.updatePreview(mousePoint);

        if (distance < Infinity) {
            // Check if placement is valid
            const validationResult = this.wallEdgeObjectManager.isValidPlacement();
            
            if (validationResult.valid) {
                const socket = this.wallEdgeObjectManager.createObject(this.wallEdgeObjectManager.preview);
                if (socket) {
                    // Ensure floor height is included
                    socket.dimensions.floorHeight = this.socketFloorHeight;
                    this.$store.dispatch('sockets/addSocket', socket);
                    this.wallEdgeObjectManager.preview = null;
                }
            } else {
                // Show error message
                this.$store.dispatch('reports/showMessage', 'Error: ' + validationResult.error);
            }
        }
    },
    handlePanelCreation(mousePoint) {
        if (!this.wallEdgeObjectManager.preview) {
            this.wallEdgeObjectManager.preview = this.wallEdgeObjectManager.initializePreview('panel');
            // Set floor height from store
            this.wallEdgeObjectManager.preview.dimensions.floorHeight = this.panelFloorHeight;
        }

        const distance = this.wallEdgeObjectManager.updatePreview(mousePoint);

        if (distance < Infinity) {
            // Check if placement is valid
            const validationResult = this.wallEdgeObjectManager.isValidPlacement();
            
            if (validationResult.valid) {
                const panel = this.wallEdgeObjectManager.createObject(this.wallEdgeObjectManager.preview);
                if (panel) {
                    // Ensure floor height is included
                    panel.dimensions.floorHeight = this.panelFloorHeight;
                    this.$store.dispatch('panels/addPanel', panel);
                    this.wallEdgeObjectManager.preview = null;
                }
            } else {
                // Show error message
                this.$store.dispatch('reports/showMessage', 'Error: ' + validationResult.error);
            }
        }
    },

    handleCeilingLightCreation(mousePoint) {
        if (!this.ceilingObjectManager.preview) {
            this.ceilingObjectManager.preview = this.ceilingObjectManager.initializePreview('ceiling-light');
        }

        const distance = this.ceilingObjectManager.updatePreview(mousePoint);

        if (distance < Infinity) {
            const light = this.ceilingObjectManager.createObject(this.ceilingObjectManager.preview);
            if (light) {
                this.$store.dispatch('lights/addCeilingLight', light);
                this.ceilingObjectManager.preview = null;
            }
        }
    },

    handleWallLightCreation(mousePoint) {
        if (!this.wallEdgeObjectManager.preview) {
            this.wallEdgeObjectManager.preview = this.wallEdgeObjectManager.initializePreview('wall-light');
            // Set floor height from store
            this.wallEdgeObjectManager.preview.dimensions.floorHeight = this.lightFloorHeight;
        }

        const distance = this.wallEdgeObjectManager.updatePreview(mousePoint);

        if (distance < Infinity) {
            const light = this.wallEdgeObjectManager.createObject(this.wallEdgeObjectManager.preview);
            if (light) {
                // Ensure floor height is included
                light.dimensions.floorHeight = this.lightFloorHeight;
                this.$store.dispatch('lights/addWallLight', light);
                this.wallEdgeObjectManager.preview = null;
            }
        }
    },

    handleSwitchCreation(mousePoint) {
        if (!this.wallEdgeObjectManager.preview) {
            this.wallEdgeObjectManager.preview = this.wallEdgeObjectManager.initializePreview(this.currentTool);
            // Set floor height from store
            this.wallEdgeObjectManager.preview.dimensions.floorHeight = this.switchFloorHeight;
        }

        const distance = this.wallEdgeObjectManager.updatePreview(mousePoint);

        if (distance < Infinity) {
            // Check if placement is valid
            const validationResult = this.wallEdgeObjectManager.isValidPlacement();
            
            if (validationResult.valid) {
                const switchObj = this.wallEdgeObjectManager.createObject(this.wallEdgeObjectManager.preview);
                if (switchObj) {
                    // Ensure floor height is included
                    switchObj.dimensions.floorHeight = this.switchFloorHeight;
                    this.$store.dispatch('switches/addSwitch', switchObj);
                    this.wallEdgeObjectManager.preview = null;
                }
            } else {
                // Show error message
                this.$store.dispatch('reports/showMessage', 'Error: ' + validationResult.error);
            }
        }
    },
    beforeUnmount() {
      // Clean up event listeners
      window.removeEventListener('keydown', this.handleKeyboard);
      
      if (this.canvas) {
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('click', this.handleCanvasClick);
      }

      // Clean up resize observer
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
    },
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const screenPoint = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };

        // Convert screen coordinates to world coordinates
        const mousePoint = {
            x: (screenPoint.x - this.wallManager.panOffset.x) / this.wallManager.zoom,
            y: (screenPoint.y - this.wallManager.panOffset.y) / this.wallManager.zoom
        };

        switch (this.currentTool) {
            case 'wall':
                this.wallManager.handleMouseMove(mousePoint);
                break;
            case 'door':
            case 'window':
                this.objectManager.handleMouseMove(mousePoint);
                break;
            case 'socket':
            case 'panel':
            case 'wall-light':
            case 'single-switch':
            case 'double-switch':
                if (this.wallEdgeObjectManager) {
                    this.wallEdgeObjectManager.updateTransform(this.wallManager.panOffset, this.wallManager.zoom);
                    this.wallEdgeObjectManager.updatePreview(mousePoint);
                }
                break;
            case 'ceiling-light':
                if (this.ceilingObjectManager) {
                    this.ceilingObjectManager.updateTransform(this.wallManager.panOffset, this.wallManager.zoom);
                    this.ceilingObjectManager.updatePreview(mousePoint);
                }
                break;
        }

        this.redraw();
    },
    async saveProject() {
      try {
        const savedProject = await this.$store.dispatch('project/saveProject');
        // After successful save, redirect to the project's edit page with its ID
        if (!this.id) {
          this.$router.replace(`/plan-editor/${savedProject.id}`);
        }
      } catch (error) {
        console.error('Failed to save project:', error);
        this.$store.dispatch('reports/setMessage', 'Failed to save project');
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

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 1000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: 1rem;
  font-size: 1.2rem;
  color: #333;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.save-button {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: background-color 0.2s;
}

.save-button:hover {
  background-color: #45a049;
}

.save-button i {
  font-size: 16px;
}
</style>