<template>
  <div 
    class="side-panel"
    :class="{ 
      'show': (show || showLabelSettings) && isRoutingActive,
      'hide': !isRoutingActive 
    }"
  >
    <div class="panel-header">
      <h3>Project Report</h3>
      <button class="close-button" @click="closePanel" v-if="isRoutingActive">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="panel-content" v-if="isRoutingActive">
      <!-- Project Statistics -->
      <div class="statistics-section">
        <h4>Electrical Components</h4>
        
        <div class="stat-group">
          <div class="stat-item">
            <span class="stat-label">Total Outlets:</span>
            <span class="stat-value">{{ totalOutlets }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Power Sockets:</span>
            <span class="stat-value">{{ socketCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Single Switches:</span>
            <span class="stat-value">{{ singleSwitchCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Double Switches:</span>
            <span class="stat-value">{{ doubleSwitchCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Junction Boxes:</span>
            <span class="stat-value">{{ junctionBoxCount }}</span>
          </div>
        </div>

        <h4 class="mt-4">Lighting</h4>
        <div class="stat-group">
          <div class="stat-item">
            <span class="stat-label">Ceiling Lights:</span>
            <span class="stat-value">{{ ceilingLightCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Wall Lights:</span>
            <span class="stat-value">{{ wallLightCount }}</span>
          </div>
        </div>

        <h4 class="mt-4">Electrical Panel</h4>
        <div class="panel-recommendation">
          <p>Recommended panel size based on total outlets ({{ totalOutlets }}):</p>
          <strong>{{ recommendedPanelSize }}</strong>
        </div>
      </div>

      <!-- Label Settings at the bottom -->
      <div class="label-settings-section">
        <h4>Label Settings</h4>
        <div class="visibility-controls">
          <div class="control-item">
            <label>
              <input 
                type="checkbox" 
                v-model="showSocketLabels"
                @change="updateLabelVisibility('sockets')"
              >
              <span>Electrical Outlets</span>
            </label>
          </div>
          <div class="control-item">
            <label>
              <input 
                type="checkbox" 
                v-model="showWallLightLabels"
                @change="updateLabelVisibility('wallLights')"
              >
              <span>Wall Lights</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'ProjectInfoModal',
  props: {
    show: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return {
      showSocketLabels: false,
      showSwitchLabels: false,
      showWallLightLabels: false,
      localLabelVisibility: {
        sockets: false,
        switches: false,
        wallLights: false
      }
    }
  },
  computed: {
    ...mapState('project', [
      'isRoutingActive', 
      'labelVisibility', 
      'currentMode',
      'showLabelSettings',
      'distributionBoxes'
    ]),
    ...mapGetters({
      sockets: 'sockets/getAllSockets',
      singleSwitches: 'switches/getSingleSwitches',
      doubleSwitches: 'switches/getDoubleSwitches',
      ceilingLights: 'lights/getCeilingLights',
      wallLights: 'lights/getWallLights'
    }),
    socketCount() {
      // Each socket counts as one element
      return this.sockets.length
    },
    singleSwitchCount() {
      return this.singleSwitches.length
    },
    doubleSwitchCount() {
      // Each double switch counts as one element
      return this.doubleSwitches.length
    },
    junctionBoxCount() {
      return this.distributionBoxes.length
    },
    totalOutlets() {
      // Total number of electrical elements (sockets + single switches + double switches)
      return this.socketCount + this.singleSwitchCount + this.doubleSwitchCount
    },
    ceilingLightCount() {
      return this.ceilingLights.length
    },
    wallLightCount() {
      return this.wallLights.length
    },
    recommendedPanelSize() {
      const total = this.totalOutlets
      if (total <= 12) return '12-module panel'
      if (total <= 24) return '24-module panel'
      if (total <= 36) return '36-module panel'
      return '48-module panel'
    }
  },
  created() {
    this.syncWithStore()
  },
  watch: {
    labelVisibility: {
      deep: true,
      immediate: true,
      handler(newVal) {
        if (this.isRoutingActive) {
          this.syncWithStore()
        }
      }
    },
    isRoutingActive: {
      immediate: true,
      handler(newVal) {
        if (!newVal) {
          this.showSocketLabels = false
          this.showWallLightLabels = false
          this.localLabelVisibility = {
            sockets: false,
            wallLights: false
          }
        } else {
          this.syncWithStore()
        }
      }
    }
  },
  methods: {
    syncWithStore() {
      this.showSocketLabels = this.labelVisibility.sockets
      this.showWallLightLabels = this.labelVisibility.wallLights
      
      this.localLabelVisibility = {
        sockets: this.labelVisibility.sockets,
        wallLights: this.labelVisibility.wallLights
      }
    },
    closePanel() {
      this.$store.dispatch('project/hideLabelSettings')
      this.$emit('close')
    },
    updateLabelVisibility(type) {
      if (this.currentMode !== 'auto-routing') return
      
      const newValue = !this.localLabelVisibility[type]
      
      // If toggling sockets, also toggle switches
      if (type === 'sockets') {
        this.showSocketLabels = newValue
        this.localLabelVisibility.sockets = newValue
        
        // Update store for both sockets and switches
        this.$store.dispatch('project/updateLabelVisibility', {
          type: 'sockets',
          visible: newValue
        })
        this.$store.dispatch('project/updateLabelVisibility', {
          type: 'switches',
          visible: newValue
        })
      } else {
        // For other types (wall lights), just toggle that type
        const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1)
        const showVar = `show${capitalizedType}Labels`
        this[showVar] = newValue
        this.localLabelVisibility[type] = newValue
        
        this.$store.dispatch('project/updateLabelVisibility', {
          type,
          visible: newValue
        })
      }
    }
  }
}
</script>

<style scoped>
.side-panel {
  position: fixed;
  top: 100px;
  right: -300px;
  width: 300px;
  height: calc(100vh - 100px);
  background-color: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  transition: right 0.3s ease;
  z-index: 100;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
  border: 1px solid #e0e0e0;
  border-right: none;
  display: flex;
  flex-direction: column;
}

.side-panel.show {
  right: 0;
}

.side-panel.hide {
  display: none;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f5f5f5;
  border-top-left-radius: 8px;
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.panel-content {
  padding: 16px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.statistics-section {
  flex-grow: 1;
  margin-bottom: 20px;
}

.stat-group {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-label {
  color: #495057;
  font-size: 14px;
}

.stat-value {
  font-weight: 600;
  color: #212529;
}

.panel-recommendation {
  background: #e3f2fd;
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
}

.panel-recommendation p {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #1976d2;
}

.panel-recommendation strong {
  font-size: 16px;
  color: #0d47a1;
}

h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.label-settings-section {
  border-top: 1px solid #e0e0e0;
  padding-top: 16px;
  margin-top: auto;
  flex-shrink: 0;
}

.visibility-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.control-item {
  display: flex;
  align-items: center;
}

.control-item label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
  color: #333;
  font-size: 14px;
}

.control-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #2196F3;
}

.close-button {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #666;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: #333;
}
</style> 