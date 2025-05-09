<!-- src/components/sidebar/SidebarToolsMenu.vue -->
<template>
  <div class="sidebar-tools" :class="{ 'sidebar-open': isMenuOpen }">
    <div class="tools-container">
      <button
          v-for="tool in currentTools"
          :key="tool.id"
          class="tool-button"
          :class="{ 'active': isToolActive(tool.id) }"
          @click="selectTool(tool.id)">
        <i :class="tool.icon"></i>
        <span>{{ tool.name }}</span>
      </button>
    </div>
  </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex';

export default {
  name: "SidebarToolsMenu",
  computed: {
    ...mapState('editorTools', {
      isMenuOpen: state => state.isMenuOpen,
      activeMode: state => state.activeMode,
      activeTool: state => state.activeTool,
      tools: state => state.tools,
    }),

    currentTools() {
      return this.tools[this.activeMode] || [];
    },

    currentModeName() {
      const modeNames = {
        originalPlan: 'Оригінальний план',
        powerSockets: 'Розетки',
        light: 'Освітлення',
        switches: 'Вимикачі'
      };
      return modeNames[this.activeMode] || 'Інструменти';
    }
  },
  methods: {
    ...mapMutations('editorTools', ['setActiveTool']),

    isToolActive(toolId) {
      return this.activeTool[this.activeMode] === toolId;
    },

    selectTool(toolId) {
      this.setActiveTool({ mode: this.activeMode, toolId });
    }
  }
}
</script>

<style scoped>
.sidebar-tools {
  position: fixed;
  top: 112px; /* Adjust based on your navbar height */
  left: -250px;
  width: 250px;
  height: auto; /* Auto height based on content */
  background-color: #f5f5f5;
  border-right: 1px solid #ddd;
  transition: left 0.3s ease;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  z-index: 100;
  overflow-y: auto;
  padding: 15px;
  font-size: 14px;
}

.sidebar-open {
  left: 0;
}

.tools-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tool-button {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-button:hover {
  background-color: #f0f0f0;
}

.tool-button.active {
  background-color: #ffe2b2;
  border-color: #ffa500;
}

.tool-button i {
  margin-right: 10px;
  font-size: 16px;
}
</style>