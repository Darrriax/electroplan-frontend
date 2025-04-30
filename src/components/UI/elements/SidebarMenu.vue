<template>
  <div
      class="sidebar-menu"
      :style="{
      transform: `translateX(${visible ? 0 : '-100%'})`,
      maxHeight: visible ? `${contentHeight}px` : '0'
    }"
  >
    <div ref="content">
      <slot />
    </div>
  </div>
</template>

<script setup>
import {ref, watch, onMounted, nextTick} from 'vue'

const props = defineProps({
  visible: Boolean
})

const content = ref(null)
const contentHeight = ref(0)

const updateHeight = async () => {
  await nextTick()
  if (content.value) {
    contentHeight.value = content.value.scrollHeight + 10 // + padding
  }
}

onMounted(updateHeight)
watch(() => props.visible, updateHeight)
</script>

<style scoped>
.sidebar-menu {
  position: fixed;
  top: 105px;
  left: 0;
  width: 160px;
  background: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  border-bottom-right-radius: 10px;
  z-index: 100;
  height: 100%;
  transition: transform 0.3s ease-in-out,
  max-height 0.3s ease-in-out;

  /* Початкові значення */
  transform: translateX(-100%);
  max-height: 0;
}

.sidebar-menu > div {
  overflow-y: auto;
  max-height: calc(100vh - 140px);
}
</style>