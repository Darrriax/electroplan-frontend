<template>
  <AppLoader v-if="loadingStatus"/>
  <div class="project-wrap">
    <div class="sidebar_container"></div>
    <div
        class="min-vh-100 displayFlexColumn"
        :class="{'project-content': isProjectPage}"
    >
      <navigation class="navigation"/>
      <projectNavbar v-if="isProjectPage" class="project-navbar"/>
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
  setup() {
    const route = useRoute();
    const isProjectPage = computed(() => route.path.startsWith('/project'));
    return { isProjectPage };
  }
}
</script>