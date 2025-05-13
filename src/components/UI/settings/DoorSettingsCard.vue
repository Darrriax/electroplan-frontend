<template>
  <div class="door-settings-card" v-if="isVisible">
    <div class="settings-header">
      <h3>Door Settings</h3>
      <button class="close-button" @click="close">×</button>
    </div>

    <div class="settings-content">
      <div class="setting-group">
        <label>Width (cm)</label>
        <input 
          type="number" 
          v-model.number="doorWidth"
          :min="60"
          :max="200"
          @input="validateAndUpdate"
        />
        <span class="error" v-if="errors.width">{{ errors.width }}</span>
      </div>

      <div class="setting-group">
        <label>Height (cm)</label>
        <input 
          type="number" 
          v-model.number="doorHeight"
          :min="180"
          :max="300"
          @input="validateAndUpdate"
        />
        <span class="error" v-if="errors.height">{{ errors.height }}</span>
      </div>

      <div class="setting-group">
        <label>Door Type</label>
        <select v-model="doorType">
          <option value="single">Single Door</option>
          <option value="double">Double Door</option>
          <option value="sliding">Sliding Door</option>
        </select>
      </div>

      <div class="setting-group">
        <label>Opening Direction</label>
        <select v-model="openDirection">
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { 
  DEFAULT_DOOR_CONFIG,
  DOOR_TYPES,
  validateDoorDimensions
} from '../../../utils/doors';

export default {
  name: 'DoorSettingsCard',
  
  setup() {
    const store = useStore();
    
    // Reactive state
    const doorWidth = ref(DEFAULT_DOOR_CONFIG.width);
    const doorHeight = ref(DEFAULT_DOOR_CONFIG.height);
    const doorType = ref(DEFAULT_DOOR_CONFIG.type);
    const openDirection = ref(DEFAULT_DOOR_CONFIG.openDirection);
    const errors = ref({ width: null, height: null });

    // Computed properties
    const isVisible = computed(() => store.state.project.currentTool === 'door');

    // Methods
    const validateAndUpdate = () => {
      const validation = validateDoorDimensions(doorWidth.value, doorHeight.value);
      errors.value = validation.errors;
      
      if (validation.isValid) {
        updateDoorConfig();
      }
    };

    const updateDoorConfig = () => {
      store.commit('doors/updateConfig', {
        width: doorWidth.value,
        height: doorHeight.value,
        type: doorType.value,
        openDirection: openDirection.value
      });
    };

    const close = () => {
      store.commit('project/setCurrentTool', null);
    };

    // Watch for changes
    watch([doorType, openDirection], () => {
      updateDoorConfig();
    });

    return {
      doorWidth,
      doorHeight,
      doorType,
      openDirection,
      errors,
      isVisible,
      validateAndUpdate,
      close
    };
  }
};
</script>

<style scoped>
.door-settings-card {
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