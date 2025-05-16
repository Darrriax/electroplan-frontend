<template>
  <sidebar-menu :visible="visible">
    <div
      v-for="tool in currentTools"
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
import SidebarMenu from './SidebarMenu.vue';
import { mapGetters } from 'vuex';

export default {
  name: 'ToolSidebar',
  components: {
    SidebarMenu
  },
  props: {
    currentTool: {
      type: String,
      default: null
    },
    visible: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    ...mapGetters('project', ['currentTools'])
  },
  methods: {
    selectTool(tool) {
      this.$emit('tool-selected', tool.name);
    }
  }
};
</script>

<style scoped>
.tool-item {
  display: flex;
  align-items: center;
  padding: 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.tool-item:hover {
  background-color: #f5f5f5;
}

.tool-label {
  margin-left: 10px;
}

.selected-tool {
  background-color: #e3f2fd;
}

.selected-tool:hover {
  background-color: #bbdefb;
}
</style>