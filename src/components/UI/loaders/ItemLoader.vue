<template>
  <div class="item-loader">
  </div>
</template>

<script>
export default {
  props: {
    height: {type: [String, Number]},
    width: {type: [String, Number]},
    borderRadius: {type: [String, Number]},
  }
}
</script>

<style scoped>
/* ------------------- ITEM-LOADER -----------------------*/
.item-loader {
  height: v-bind(height);
  width: v-bind(width);
  border-radius: v-bind(borderRadius);
  background-image: linear-gradient(
      to right,
      #d6d7d8 0%,
      #e2e3e4 10%,
      #d6d7d8 20%,
      #d6d7d8 100%
  );
  background-size: 200% 100%;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1),
  0 2px 4px -2px rgb(0 0 0 / 0.1);
  animation: bgAnimate 1.2s linear infinite;
}

@keyframes bgAnimate {
  0% {
    background-position: 50% 0;
  }

  100% {
    background-position: -150% 0;
  }
}
</style>