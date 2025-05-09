<template>
  <sidebar-menu :visible="visible">
    <div
        v-for="tool in tools"
        :key="tool.name"
        class="tool-item"
        :class="{ 'selected-tool': currentTool === tool.name }"
        @click="selectTool(tool)"
    >
      <i :class="tool.icon"></i>
      <span class="tool-label">{{ tool.label }}</span>
    </div>
  </sidebar-menu>
</template>

<script>
import SidebarMenu from '../elements/SidebarMenu.vue';

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
          ['name', 'label', 'icon'].every(prop => prop in tool))
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