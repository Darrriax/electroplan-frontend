<template>
  <div class="app-theme">
    <div class="app-container">
      <AppLoader v-if="loadingStatus"/>
      <slot/>
    </div>
  </div>
</template>

<script>
import isLoading from "../../../mixins/isLoading";
import AppLoader from "../loaders/AppLoader.vue";

export default {
  name: "authLayout",
  components: {AppLoader},
  mixins: [
    isLoading
  ]
}
</script>