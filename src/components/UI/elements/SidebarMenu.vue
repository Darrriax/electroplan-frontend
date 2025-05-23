<template>
  <div
    class="sidebar-menu"
    :class="{ 'hide': isRoutingActive }"
    :style="{
      transform: `translateX(${visible && !isRoutingActive ? 0 : '-100%'})`
    }"
  >
    <!-- SVG Icon Definitions -->
    <svg style="display: none;">
      <!-- Wall icon -->
      <symbol id="wall-icon" viewBox="0 0 24 24">
        <rect x="2" y="6" width="20" height="12" />
      </symbol>
      
      <!-- Door icon -->
      <symbol id="door-icon" viewBox="0 0 24 24">
        <path d="M4 2h16v20H4V2zm12 0v20 M8 12h2" />
        <circle cx="14.5" cy="12" r="1" />
      </symbol>
      
      <!-- Window icon -->
      <symbol id="window-icon" viewBox="0 0 24 24">
        <rect x="4" y="4" width="16" height="16" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </symbol>

      <!-- Socket/Outlet icon -->
      <symbol id="socket-icon" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <circle cx="8" cy="12" r="2" />
        <circle cx="16" cy="12" r="2" />
      </symbol>

      <!-- Electrical Panel icon -->
      <symbol id="panel-icon" viewBox="0 0 24 24">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="16" y2="14" />
        <line x1="8" y1="18" x2="16" y2="18" />
      </symbol>

      <!-- Single Switch icon -->
      <symbol id="single-switch-icon" viewBox="0 0 24 24">
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <line x1="12" y1="8" x2="12" y2="16" transform="rotate(-30 12 12)" />
      </symbol>

      <!-- Double Switch icon -->
      <symbol id="double-switch-icon" viewBox="0 0 24 24">
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <line x1="9" y1="8" x2="9" y2="16" transform="rotate(-30 9 12)" />
        <line x1="15" y1="8" x2="15" y2="16" transform="rotate(30 15 12)" />
      </symbol>

      <!-- Ceiling Light icon -->
      <symbol id="ceiling-light-icon" viewBox="0 0 24 24">
        <path d="M12 2v4" />
        <circle cx="12" cy="12" r="6" />
        <path d="M12 18v4" />
        <path d="M16 12h4" />
        <path d="M4 12h4" />
      </symbol>

      <!-- Wall Light icon -->
      <symbol id="wall-light-icon" viewBox="0 0 24 24">
        <rect x="2" y="6" width="6" height="12" />
        <path d="M8 12h4" />
        <path d="M12 8l6 4-6 4z" />
      </symbol>
    </svg>

    <div ref="content" class="sidebar-content">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const props = defineProps({
  visible: Boolean
})

const content = ref(null)

// Compute if we're in auto-routing mode
const isRoutingActive = computed(() => store.state.project.currentMode === 'auto-routing')
</script>

<style scoped>
.sidebar-menu {
  position: fixed;
  top: 105px;
  left: 0;
  width: 160px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-bottom-right-radius: 12px;
  z-index: 100;
  transition: transform 0.3s ease-in-out;
  transform: translateX(-100%);
  overflow-y: auto;
  max-height: calc(100vh - 105px - 20px); /* Viewport height minus top position and some padding */
}

.sidebar-menu.hide {
  display: none;
}

.sidebar-content {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: auto;
}

/* SVG Icons */
:deep(.tool-icon) {
  width: 20px;
  height: 20px;
  margin-right: 8px;
}

:deep(.wall-icon),
:deep(.door-icon),
:deep(.window-icon),
:deep(.socket-icon),
:deep(.panel-icon),
:deep(.single-switch-icon),
:deep(.double-switch-icon),
:deep(.ceiling-light-icon),
:deep(.wall-light-icon) {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Tool button styles */
:deep(.tool-button) {
  display: flex;
  align-items: center;
  width: 100%;
  height: 55px;
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  color: #333;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

:deep(.tool-button:hover) {
  background: #f5f5f5;
  border-color: #d0d0d0;
}

:deep(.tool-button.active) {
  background: #e3f2fd;
  border-color: #2196F3;
  color: #2196F3;
}

:deep(.tool-button svg) {
  flex-shrink: 0;
}

:deep(.tool-button span) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Tool group styles */
:deep(.tool-group) {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

:deep(.tool-group-title) {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  margin-bottom: 2px;
  padding-left: 4px;
}
</style>