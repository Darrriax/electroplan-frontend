<template>
  <sidebar-menu :visible="visible">
    <div class="tool-group">
      <div v-for="tool in tools" :key="tool.name" class="tool-button" :class="{ 'active': currentTool === tool.name }" @click="selectTool(tool)">
        <!-- SVG icons for all tools -->
        <svg v-if="tool.name === 'wall'" class="tool-icon wall-icon">
          <use href="#wall-icon" />
        </svg>
        <svg v-else-if="tool.name === 'door'" class="tool-icon door-icon">
          <use href="#door-icon" />
        </svg>
        <svg v-else-if="tool.name === 'window'" class="tool-icon window-icon">
          <use href="#window-icon" />
        </svg>
        <svg v-else-if="tool.name === 'socket'" class="tool-icon socket-icon">
          <use href="#socket-icon" />
        </svg>
        <svg v-else-if="tool.name === 'panel'" class="tool-icon panel-icon">
          <use href="#panel-icon" />
        </svg>
        <svg v-else-if="tool.name === 'single-switch'" class="tool-icon single-switch-icon">
          <use href="#single-switch-icon" />
        </svg>
        <svg v-else-if="tool.name === 'double-switch'" class="tool-icon double-switch-icon">
          <use href="#double-switch-icon" />
        </svg>
        <svg v-else-if="tool.name === 'ceiling-light'" class="tool-icon ceiling-light-icon">
          <use href="#ceiling-light-icon" />
        </svg>
        <svg v-else-if="tool.name === 'wall-light'" class="tool-icon wall-light-icon">
          <use href="#wall-light-icon" />
        </svg>
        <span>{{ tool.label }}</span>
      </div>
    </div>
  </sidebar-menu>
</template>

<script>
import SidebarMenu from './SidebarMenu.vue';

export default {
  name: 'ToolSidebar',
  components: {
    SidebarMenu
  },
  props: {
    tools: {
      type: Array,
      required: true,
      validator: value => value.every(tool =>
          ['name', 'label'].every(prop => prop in tool))
    },
    currentTool: {
      type: String,
      default: null
    },
    visible: {
      type: Boolean,
      default: true
    }
  },
  methods: {
    selectTool(tool) {
      this.$emit('tool-selected', tool.name);
    }
  }
};
</script>

<style scoped>
/* Tool button styles are now handled by SidebarMenu's :deep() selectors */
</style>