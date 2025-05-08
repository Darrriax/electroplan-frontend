<template>
  <project-layout>
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
          <canvas ref="canvas" class="editor-canvas"></canvas>
        </div>
      </div>
    </div>
  </project-layout>
</template>

<script>
import ProjectLayout from '../../UI/layouts/ProjectLayout.vue';
import WallDrawingManager from '../../../utils/wallDrawing.js';
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
      drawingManager: null,
      editorTools: [
        { id: 'wall', name: 'wall', label: 'Walls', icon: 'mdi mdi-wall' },
        { id: 'door', name: 'door', label: 'Doors', icon: 'mdi mdi-door' },
        { id: 'window', name: 'window', label: 'Windows', icon: 'mdi mdi-window-closed-variant' },
        { id: 'balcony', name: 'balcony', label: 'Balcony', icon: 'mdi mdi-balcony' }
      ]
    };
  },
  computed: {
    ...mapState('project', ['unit']),
    ...mapGetters({
      isMenuOpen: 'project/isMenuOpen',
      currentTool: 'project/getCurrentTool',
      wallThickness: 'walls/defaultThickness'
    }),
    isWallToolActive() {
      return this.currentTool === 'wall';
    }
  },
  methods: {
    ...mapActions({
      setToolAction: 'project/setTool',
      updateThickness: 'walls/updateDefaultThickness'
    }),
    setCurrentTool(tool) {
      this.setToolAction(tool);
    },
    updateWallThickness(thickness) {
      this.updateThickness(thickness);
    },
    initializeCanvas() {
      if (!this.$refs.canvas) return;

      // Create new drawing manager instance
      this.drawingManager = new WallDrawingManager(this.$refs.canvas, this.$store);

      // Load any existing data
      this.drawingManager.loadFromStore();
    },
    resizeCanvas() {
      if (!this.drawingManager) return;
      this.drawingManager.resizeCanvas();
    }
  },
  mounted() {
    this.initializeCanvas();

    // Handle window resize
    window.addEventListener('resize', this.resizeCanvas);

    // Set initial tool
    if (!this.currentTool) {
      this.setCurrentTool('wall');
    }
  },
  beforeUnmount() { // Updated from beforeDestroy which is deprecated in Vue 3
    // Clean up event listeners
    window.removeEventListener('resize', this.resizeCanvas);

    // Clean up drawing manager
    if (this.drawingManager) {
      this.drawingManager.cleanup();
    }
  },
  watch: {
    // Watch for changes in the store that would affect the canvas
    'wallThickness': {
      handler() {
        if (this.drawingManager) {
          this.drawingManager.draw();
        }
      }
    },
    'currentTool': {
      handler() {
        if (this.drawingManager) {
          this.drawingManager.draw();
        }
      }
    }
  }
};
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