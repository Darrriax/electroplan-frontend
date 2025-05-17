<template>
  <div class="settings-card" v-if="isVisible">
    <div class="settings-header">
      <h3>Socket Settings</h3>
      <button class="close-button" @click="close">×</button>
    </div>
    
    <div class="settings-content">
      <div class="setting-group">
        <label>Type:</label>
        <select v-model="socketType" @change="updateSocketType">
          <option value="standard">Standard 220V Socket</option>
          <option value="waterproof">Waterproof 220V Socket</option>
        </select>
      </div>

      <div class="setting-group">
        <label>Height from Floor (cm)</label>
        <input 
          type="number" 
          :value="heightFromFloor"
          :min="0"
          :max="maxHeight"
          @input="validateAndUpdate"
          @change="validateAndUpdate"
        />
        <span class="error" v-if="errors.height">{{ errors.height }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';

export default {
  name: 'SocketSettingsCard',
  
  setup() {
    const store = useStore();
    
    // Constants in millimeters
    const SOCKET_HEIGHT_MM = 80; // 8cm = 80mm
    
    // Reactive state
    const socketType = ref('standard');
    const heightFromFloor = ref(300); // 30cm = 300mm
    const errors = ref({ height: null });

    // Computed properties
    const isVisible = computed(() => ['standard-socket', 'waterproof-socket'].includes(store.state.project.currentTool));
    
    const wallHeightMm = computed(() => {
      // Get the wall height from Vuex state (already in mm)
      return store.state.walls.defaultHeight || 2500; // Default to 250cm = 2500mm if not set
    });

    const maxHeightMm = computed(() => {
      return wallHeightMm.value - SOCKET_HEIGHT_MM; // Wall height minus socket height in mm
    });

    // Convert mm to cm for display
    const displayHeight = computed(() => {
      return Math.round(heightFromFloor.value / 10);
    });

    const displayMaxHeight = computed(() => {
      return Math.round(maxHeightMm.value / 10);
    });

    // Methods
    const validateAndUpdate = (event) => {
      errors.value.height = null;
      
      // Convert input value from cm to mm
      const heightInMm = Math.round(Number(event.target.value) * 10);
      
      if (isNaN(heightInMm)) {
        errors.value.height = 'Please enter a valid number';
        return;
      }
      
      if (heightInMm < 0) {
        errors.value.height = 'Height must be at least 0cm';
        heightFromFloor.value = 0;
        return;
      }
      
      if (heightInMm > maxHeightMm.value) {
        errors.value.height = `Socket cannot be placed higher than ${displayMaxHeight.value}cm (wall height ${Math.round(wallHeightMm.value / 10)}cm minus socket height 8cm)`;
        heightFromFloor.value = maxHeightMm.value;
        return;
      }

      // Update the internal value in mm
      heightFromFloor.value = heightInMm;

      // Only update config if validation passes
      updateSocketConfig();
    };

    const updateSocketConfig = () => {
      if (!errors.value.height) {  // Only update if there are no errors
        store.commit('sockets/updateConfig', {
          type: socketType.value,
          heightFromFloor: heightFromFloor.value // Store in mm
        });
      }
    };

    const updateSocketType = () => {
      store.commit('sockets/setSocketType', socketType.value);
    };

    const close = () => {
      store.commit('project/setCurrentTool', null);
    };

    return {
      socketType,
      heightFromFloor: displayHeight, // Return the display value in cm
      errors,
      isVisible,
      maxHeight: displayMaxHeight, // Return the display value in cm
      validateAndUpdate,
      updateSocketType,
      close
    };
  }
};
</script>

<style scoped>
.settings-card {
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

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.size-value {
  color: #333;
  font-weight: 500;
}

.error {
  color: #ff4444;
  font-size: 12px;
  margin-top: 2px;
}
</style> 