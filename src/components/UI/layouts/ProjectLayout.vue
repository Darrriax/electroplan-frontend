<template>
  <AppLoader v-if="loadingStatus"/>
  <div class="project-wrap">
    <div class="sidebar_container"></div>
    <div class="min-vh-100 displayFlexColumn">
      <div class="navigation">
        <navigation/>
      </div>
      <div class="project-navbar">
        <projectNavbar @undo="handleUndo" @redo="handleRedo"/>
      </div>
      <div class="project-content">
      <slot/>
      </div>
    </div>
  </div>
</template>

<script>
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import isLoading from "../../../mixins/isLoading";
import AppLoader from "../loaders/AppLoader.vue";
import Navigation from "../elements/Navigation.vue";
import ProjectNavbar from "../elements/ProjectNavbar.vue";

export default {
  name: "projectLayout",
  components: {
    Navigation,
    AppLoader,
    ProjectNavbar
  },
  mixins: [isLoading],
  methods: {
    handleUndo() {
      // Emit the event up to be caught by the page component (PlanEditor)
      this.$emit('undo');
    },
    handleRedo() {
      // Emit the event up to be caught by the page component (PlanEditor)
      this.$emit('redo');
    }
  }
}
</script>

<style scoped>
.project-wrap {
  display: flex;
  min-height: 100vh;
}

.displayFlexColumn {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.navigation, .project-navbar {
  flex-shrink: 0;
}
</style>