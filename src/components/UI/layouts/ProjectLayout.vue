<template>
  <AppLoader v-if="loadingStatus"/>
  <div class="project-wrap">
    <div class="sidebar_container"></div>
    <div class="min-vh-100 displayFlexColumn project-content">
      <navigation class="navigation"/>
      <projectNavbar class="project-navbar" @undo="handleUndo" @redo="handleRedo"/>
      <slot/>
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