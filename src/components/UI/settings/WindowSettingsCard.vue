<template>
  <div class="window-settings-card" v-if="isVisible">
    <div class="settings-header">
      <h3>Window Settings</h3>
      <button class="close-button" @click="close">×</button>
    </div>

    <div class="settings-content">
      <div class="setting-group">
        <label>Width (cm)</label>
        <input 
          type="number" 
          v-model.number="windowWidth"
          :min="40"
          :max="300"
          @input="validateAndUpdate"
        />
        <span class="error" v-if="errors.width">{{ errors.width }}</span>
      </div>

      <div class="setting-group">
        <label>Height (cm)</label>
        <input 
          type="number" 
          v-model.number="windowHeight"
          :min="40"
          :max="300"
          @input="validateAndUpdate"
        />
        <span class="error" v-if="errors.height">{{ errors.height }}</span>
      </div>

      <div class="setting-group">
        <label>Height from Floor (cm)</label>
        <input 
          type="number" 
          v-model.number="heightFromFloor"
          :min="30"
          :max="200"
          @input="validateAndUpdate"
        />
        <span class="error" v-if="errors.heightFromFloor">{{ errors.heightFromFloor }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { 
  DEFAULT_WINDOW_CONFIG,
  validateWindowDimensions
} from '../../../utils/windows';

export default {
  name: 'WindowSettingsCard',
  
  setup() {
    const store = useStore();
    
    // Reactive state
    const windowWidth = ref(DEFAULT_WINDOW_CONFIG.width);
    const windowHeight = ref(DEFAULT_WINDOW_CONFIG.height);
    const heightFromFloor = ref(DEFAULT_WINDOW_CONFIG.heightFromFloor);
    const errors = ref({ width: null, height: null, heightFromFloor: null });

    // Computed properties
    const isVisible = computed(() => store.state.project.currentTool === 'window');
    const wallHeight = computed(() => store.state.walls.defaultHeight / 10); // Convert from mm to cm

    // Methods
    const validateAndUpdate = () => {
      const validation = validateWindowDimensions(
        windowWidth.value, 
        windowHeight.value,
        heightFromFloor.value,
        wallHeight.value
      );
      errors.value = validation.errors;
      
      if (validation.isValid) {
        updateWindowConfig();
      }
    };

    const updateWindowConfig = () => {
      store.commit('windows/updateConfig', {
        width: windowWidth.value,
        height: windowHeight.value,
        heightFromFloor: heightFromFloor.value
      });
    };

    const close = () => {
      store.commit('project/setCurrentTool', null);
    };

    return {
      windowWidth,
      windowHeight,
      heightFromFloor,
      errors,
      isVisible,
      validateAndUpdate,
      close
    };
  }
};
</script>

<style scoped>
.window-settings-card {
  position: fixed;
  margin-top: 210px;
  left: 0;
  width: 200px;
  background: white;
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.settings-header h3 {
  margin: 0;
  font-size: 16px;
}

.close-button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
}

.setting-group {
  margin-bottom: 12px;
}

.setting-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  color: #666;
}

.setting-group input,
.setting-group select {
  width: 100%;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.error {
  color: #ff4444;
  font-size: 12px;
  margin-top: 2px;
}
</style> 