<template>
  <div 
    class="side-panel"
    :class="{ 
      'show': (show || showLabelSettings) && isRoutingActive,
      'hide': !isRoutingActive 
    }"
  >
    <div class="panel-header">
      <h3>Звіт проєкту</h3>
      <button class="close-button" @click="closePanel" v-if="isRoutingActive">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="panel-content" v-if="isRoutingActive">
      <!-- Project Statistics -->
      <div class="statistics-section">
        <h4>Електричні компоненти</h4>
        
        <div class="stat-group">
          <div class="stat-item">
            <span class="stat-label">Всього підрозетників:</span>
            <span class="stat-value">{{ totalOutlets }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Розетки:</span>
            <span class="stat-value">{{ socketCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Одинарні вимикачі:</span>
            <span class="stat-value">{{ singleSwitchCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Подвійні вимикачі:</span>
            <span class="stat-value">{{ doubleSwitchCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Розподільчі коробки:</span>
            <span class="stat-value">{{ junctionBoxCount }}</span>
          </div>
        </div>

        <h4 class="mt-4">Освітлення</h4>
        <div class="stat-group">
          <div class="stat-item">
            <span class="stat-label">Стельові світильники:</span>
            <span class="stat-value">{{ ceilingLightCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Настінні світильники:</span>
            <span class="stat-value">{{ wallLightCount }}</span>
          </div>
        </div>

        <h4 class="mt-4">Електричний щит</h4>
        <div class="panel-recommendation">
          <p>Рекомендований розмір ел. щита на основі секторів ({{ totalPanelPins }}) на:</p>
          <strong>{{ recommendedPanelSize }}</strong>
        </div>

        <h4 class="mt-4">Довжина кабелю</h4>
        <div class="cable-info yellow-cable-section">
          <div class="cable-details">
            <span class="cable-type">1.5 мм²</span>
            <strong class="cable-length">{{ formattedYellowCableLength }}</strong>
          </div>
        </div>
        <div class="cable-info blue-cable-section">
          <div class="cable-details">
            <span class="cable-type">2.5 мм²</span>
            <strong class="cable-length">{{ formattedBlueCableLength }}</strong>
          </div>
        </div>
        <div class="cable-info red-cable-section">
          <div class="cable-details">
            <span class="cable-type">4.0 мм²</span>
            <strong class="cable-length">{{ formattedRedCableLength }}</strong>
          </div>
        </div>
      </div>

      <!-- Label Settings at the bottom -->
      <div class="label-settings-section">
        <h4>Налаштування міток</h4>
        <div class="visibility-controls">
          <div class="control-item">
            <label>
              <input 
                type="checkbox" 
                v-model="showSocketLabels"
                @change="updateLabelVisibility('sockets')"
              >
              <span>Електричні точки</span>
            </label>
          </div>
          <div class="control-item">
            <label>
              <input 
                type="checkbox" 
                v-model="showWallLightLabels"
                @change="updateLabelVisibility('wallLights')"
              >
              <span>Настінні світильники</span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <div>
          <div 
            v-for="group in lightGroups" 
            :key="group.id"
            class="tab"
            :class="{ 'active': selectedGroupId === group.id }"
            @click="selectGroup(group.id)"
            @mouseenter="handleGroupHover(group, true)"
            @mouseleave="handleGroupHover(group, false)"
            @dragover.prevent
            @drop="handleDrop($event, group.id)"
          >
            <div class="tab-name">{{ group.name }}</div>
            <div class="light-count">{{ getLightCount(group) }}</div>
          </div>
        </div>
      </div>
      
      <!-- PDF Export Button -->
      <div class="pdf-export-section">
        <button class="export-button" @click="exportToPDF">
          <i class="fas fa-file-pdf"></i>
          Зберегти звіт у PDF
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import AutoElectricalRouter from '../../../utils/AutoElectricalRouter'
import CableLengthCalculator from '../../../utils/cableLengthCalculations'
import html2pdf from 'html2pdf.js'

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
    totalPanelPins() {
      const router = new AutoElectricalRouter(this.$store);
      return router.getPanelPinCount();
    },
    recommendedPanelSize() {
      const pins = this.totalPanelPins;
      if (pins <= 6) return '6 автоматичних вимикачів';
      if (pins <= 8) return '8 автоматичних вимикачів';
      if (pins <= 12) return '12 автоматичних вимикачів';
      if (pins <= 16) return '16 автоматичних вимикачів';
      if (pins <= 18) return '18 автоматичних вимикачів';
      if (pins <= 24) return '24 автоматичних вимикача';
      if (pins <= 36) return '36 автоматичних вимикачів';
      return 'більше 36 автоматів (рекомендується встановлення додаткового щита)';
    },
    yellowCableLength() {
      if (!this.isRoutingActive) return 0;
      
      const router = new AutoElectricalRouter(this.$store);
      const lengths = router.calculateCableLengths();
      // Add 10% safety margin and convert to centimeters
      return Math.ceil(lengths.lighting * 110); // 110% of original length
    },
    blueCableLength() {
      if (!this.isRoutingActive) return 0;
      
      const router = new AutoElectricalRouter(this.$store);
      const lengths = router.calculateCableLengths();
      // Add 10% safety margin and convert to centimeters
      return Math.ceil(lengths.regularSockets * 110); // 110% of original length
    },
    redCableLength() {
      const calculator = new CableLengthCalculator(this.$store);
      const lengths = calculator.getCableLengths();
      return lengths.cable4_0mm;
    },
    formattedYellowCableLength() {
      const length = this.yellowCableLength;
      if (!Number.isFinite(length) || length < 0) return '0.00 m';
      if (length >= 100) {
        return `${(length / 100).toFixed(2)} m`;
      }
      return `${length.toFixed(2)} cm`;
    },
    formattedBlueCableLength() {
      const length = this.blueCableLength;
      if (!Number.isFinite(length) || length < 0) return '0.00 m';
      if (length >= 100) {
        return `${(length / 100).toFixed(2)} m`;
      }
      return `${length.toFixed(2)} cm`;
    },
    formattedRedCableLength() {
      const length = this.redCableLength;
      if (length >= 100) {
        return `${(length / 100).toFixed(2)} m`;
      }
      return `${length.toFixed(2)} cm`;
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
    },
    async exportToPDF() {
      try {
        // Get the canvas element
        const canvas = document.querySelector('canvas');
        if (!canvas) {
          console.error('На плані немає елементів');
          return;
        }

        // Convert canvas to base64 image
        const floorPlanImage = canvas.toDataURL('image/png');

        // Create a new div for the PDF content
        const element = document.createElement('div');
        element.innerHTML = `
          <div class="pdf-report" style="padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="text-align: center; margin-bottom: 20px; color: #333; font-size: 24px;">Звіт проекту ElectroPlanner</h2>
            
            <h3 style="color: #333; font-size: 18px; margin-top: 25px;">План квартири</h3>
            <div style="margin: 15px 0; text-align: center;">
              <img src="${floorPlanImage}" style="max-width: 100%; height: auto; margin: 10px 0; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
            </div>
            
            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #333; font-size: 18px; margin-top: 0;">Електричні компоненти</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="background: white; padding: 10px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <div style="color: #666; font-size: 14px;">Всього підрозетників</div>
                  <div style="color: #333; font-size: 16px; font-weight: 500;">${this.totalOutlets}</div>
                </div>
                <div style="background: white; padding: 10px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <div style="color: #666; font-size: 14px;">Розетки</div>
                  <div style="color: #333; font-size: 16px; font-weight: 500;">${this.socketCount}</div>
                </div>
                <div style="background: white; padding: 10px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <div style="color: #666; font-size: 14px;">Одинарні вимикачі</div>
                  <div style="color: #333; font-size: 16px; font-weight: 500;">${this.singleSwitchCount}</div>
                </div>
                <div style="background: white; padding: 10px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <div style="color: #666; font-size: 14px;">Подвійні вимикачі</div>
                  <div style="color: #333; font-size: 16px; font-weight: 500;">${this.doubleSwitchCount}</div>
                </div>
                <div style="background: white; padding: 10px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <div style="color: #666; font-size: 14px;">Розподільчі коробки</div>
                  <div style="color: #333; font-size: 16px; font-weight: 500;">${this.junctionBoxCount}</div>
                </div>
              </div>
            </div>

            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #333; font-size: 18px; margin-top: 0;">Освітлення</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="background: white; padding: 10px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <div style="color: #666; font-size: 14px;">Стельові світильники</div>
                  <div style="color: #333; font-size: 16px; font-weight: 500;">${this.ceilingLightCount}</div>
                </div>
                <div style="background: white; padding: 10px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <div style="color: #666; font-size: 14px;">Настінні світильники</div>
                  <div style="color: #333; font-size: 16px; font-weight: 500;">${this.wallLightCount}</div>
                </div>
              </div>
            </div>

            <div style="background: #e3f2fd; border-radius: 8px; padding: 15px; margin: 90px 0 20px 0;">
              <h3 style="color: #1976d2; font-size: 18px; margin-top: 0;">Електричний щит</h3>
              <div style="margin: 10px 0;">
                <div style="color: #1976d2;">Рекомендований розмір ел. щита на основі секторів (${this.totalPanelPins}):</div>
                <div style="color: #0d47a1; font-size: 18px; font-weight: 500; margin-top: 5px;">${this.recommendedPanelSize}</div>
              </div>
            </div>

            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #333; font-size: 18px; margin-top: 0;">Довжина кабелю</h3>
              <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                <div style="background: #fff9e6; padding: 10px; border-radius: 6px;">
                  <div style="color: #D4AC0D; font-size: 14px;">Кабель 1.5 мм²</div>
                  <div style="color: #D4AC0D; font-size: 16px; font-weight: 500;">${this.formattedYellowCableLength}</div>
                </div>
                <div style="background: #e6e6ff; padding: 10px; border-radius: 6px;">
                  <div style="color: #0000FF; font-size: 14px;">Кабель 2.5 мм²</div>
                  <div style="color: #0000FF; font-size: 16px; font-weight: 500;">${this.formattedBlueCableLength}</div>
                </div>
                <div style="background: #ffebeb; padding: 10px; border-radius: 6px;">
                  <div style="color: #FF0000; font-size: 14px;">Кабель 4.0 мм²</div>
                  <div style="color: #FF0000; font-size: 16px; font-weight: 500;">${this.formattedRedCableLength}</div>
                </div>
              </div>
            </div>
          </div>
        `;

        const opt = {
          margin: 1,
          filename: 'electroplanner-report.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2,
            useCORS: true,
            logging: true
          },
          jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' }
        };

        // Generate PDF
        await html2pdf().set(opt).from(element).save();
      } catch (error) {
        console.error('Error generating PDF:', error);
        // You might want to show an error message to the user here
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

.cable-info {
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
}

.cable-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.yellow-cable-section {
  background: #fff9e6;
}

.yellow-cable-section .cable-type,
.yellow-cable-section .cable-length {
  color: #D4AC0D;
}

.blue-cable-section {
  background: #e6e6ff;
}

.blue-cable-section .cable-type,
.blue-cable-section .cable-length {
  color: #0000FF;
}

.red-cable-section {
  background: #ffebeb;
}

.red-cable-section .cable-type,
.red-cable-section .cable-length {
  color: #FF0000;
}

.cable-type {
  font-size: 14px;
  font-weight: 500;
}

.cable-length {
  font-size: 16px;
  font-weight: bold;
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

.tabs {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.tab-list {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.tab {
  background-color: #f0f0f0;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.tab.active {
  background-color: #007bff;
  color: white;
}

.tab-name {
  font-size: 14px;
  font-weight: 500;
}

.light-count {
  font-size: 12px;
  color: #666;
}

.add-tab {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.add-tab:hover {
  background-color: #0056b3;
}

.pdf-export-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
  text-align: center;
}

.export-button {
  background: orange;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s ease;
}

.export-button:hover {
  background: rgba(185, 121, 0, 0.72);
}

.export-button i {
  font-size: 16px;
}
</style> 