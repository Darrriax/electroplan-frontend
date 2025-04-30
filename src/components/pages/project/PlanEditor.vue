<template>
  <project-layout>
    <div class="plan-editor">
      <!-- Бокове меню інструментів -->
      <SidebarMenu :visible="isMenuOpen">
        <div
            v-for="tool in tools"
            :key="tool.name"
            class="tool-item"
            :class="{ 'selected-tool': currentTool === tool.name }"
            @click="selectTool(tool.name)"
        >
          <i :class="tool.icon"></i> {{ tool.label }}
        </div>
      </SidebarMenu>

      <!-- Панель налаштувань стіни -->
      <WallSettingsPanel
          v-if="currentTool === 'wall'"
          :thickness="wallThickness"
          :unit="unit"
          @update:thickness="val => $store.dispatch('walls/updateDefaultThickness', val)"
      />

      <!-- Полотно для редагування плану -->
      <div class="editor-canvas">
        <canvas ref="canvas"></canvas>
      </div>
    </div>
  </project-layout>
</template>

<script>
import ProjectLayout from '../../UI/layouts/ProjectLayout.vue';
import SidebarMenu from '../../UI/elements/SidebarMenu.vue';
import WallSettingsPanel from '../../UI/settings/WallSettingsPanel.vue';
import canvasMixin from '../../../mixins/canvasMixin';
import {handleMouseMove, handleMouseDown, handleMouseUp} from '../../../utils/eventHandlers.js';

export default {
  components: {ProjectLayout, SidebarMenu, WallSettingsPanel},
  mixins: [canvasMixin],

  data() {
    return {
      currentTool: null,
      isDrawing: false,
      startPoint: null,

      tools: [
        {name: 'wall', label: 'Стіна', icon: 'fas fa-wall'},
        {name: 'balcony', label: 'Балкон', icon: 'fas fa-umbrella-beach'},
        {name: 'window', label: 'Вікно', icon: 'fas fa-window-maximize'},
        {name: 'door', label: 'Двері', icon: 'fas fa-door-open'}
      ]
    };
  },

  computed: {
    wallThickness() {
      return this.$store.getters['walls/defaultThickness']
    },
    isMenuOpen() {
      return this.$store.state.project.menuOpen;
    },
    unit() {
      return this.$store.getters['project/unit'];
    }
  },

  watch: {
    wallThickness(newVal) {
      this.previewRect?.updateSize(newVal / 10)
      this.wallManager?.updateAllWallsThickness(newVal)
      this.wallManager?.updateWallThickness(newVal)
    },
    currentTool(newTool) {
      this.previewRect?.setVisible(newTool === 'wall');
    }
  },

  mounted() {
    this.initCanvas();
    document.addEventListener('contextmenu', this.handleContextMenu);

    this.canvas.on('mouse:move', this.handleMouseMove);
    this.canvas.on('mouse:down', this.handleMouseDown);
    this.canvas.on('mouse:up', this.handleMouseUp);
  },

  beforeDestroy() {
    document.removeEventListener('contextmenu', this.handleContextMenu);
    this.canvas.off('mouse:move', this.handleMouseMove);
    this.canvas.off('mouse:down', this.handleMouseDown);
    this.canvas.off('mouse:up', this.handleMouseUp);
  },

  methods: {
    selectTool(tool) {
      this.currentTool = tool;
      this.previewRect?.setVisible(tool === 'wall');
    },
    handleMouseMove(e) {
      handleMouseMove(e, {
        canvas: this.canvas,
        currentTool: this.currentTool,
        isDrawing: this.isDrawing,
        startPoint: this.startPoint,
        wallManager: this.wallManager,
        previewRect: this.previewRect
      });
    },
    handleMouseDown(e) {
      const startPoint = handleMouseDown(e, {
        canvas: this.canvas,
        currentTool: this.currentTool,
        wallManager: this.wallManager,
        grid: this.grid,
        previewRect: this.previewRect
      });

      if (startPoint) {
        this.isDrawing = true;
        this.startPoint = startPoint;
      }
    },
    handleMouseUp() {
      handleMouseUp({
        grid: this.grid,
        wallManager: this.wallManager,
        currentTool: this.currentTool,
        previewRect: this.previewRect
      });

      this.isDrawing = false;
    },
    handleContextMenu(e) {
      e.preventDefault();
      this.currentTool = null;
      this.previewRect?.setVisible(false);
    }
  }
};
</script>