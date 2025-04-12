<template>
  <AppLoader v-if="loadingStatus"/>
  <div class="main-wrap">
    <div class="sidebar_container">
    </div>
    <div class="min-vh-100 content displayFlexColumn">
      <navigation/>
      <slot/>
    </div>
  </div>
</template>

<script>
import isLoading from "../../../mixins/isLoading";
import AppLoader from "../loaders/AppLoader.vue";
import Navigation from "../elements/Navigation.vue";

export default {
  name: "layout",
  components: {
    Navigation,
    AppLoader,
  },
  mixins: [
    isLoading
  ]
}
</script>

<style scoped>

</style>