<template>
  <transition name="fade">
    <div class="settings-card">
      <div class="header">Налаштування розетки</div>
      <div class="settings-section">
        <label>Висота від підлоги:</label>
        <div class="step-control">
          <button @click="decreaseFloorHeight" :disabled="floorHeight <= 0">-</button>
          <span
              class="editable-value"
              contenteditable
              @blur="handleFloorHeightBlur"
              @keydown.enter.prevent="handleEnter"
          >{{ displayFloorHeight }}</span>
          <button @click="increaseFloorHeight" :disabled="isFloorHeightExceedingLimit">+</button>
        </div>
      </div>
      <div class="preset-grid">
        <button
            v-for="preset in convertedFloorHeightPresets"
            :key="preset.value"
            :class="['preset-button', { active: isFloorHeightPresetActive(preset.value) }]"
            @click="setFloorHeight(preset.value)"
            :disabled="preset.value > wallHeight"
        >
          {{ preset.display }}
        </button>
      </div>
      <div class="settings-section">
        <div class="label-with-info">
          <label>Тип пристрою:</label>
          <div class="info-icon" @mouseover="showTooltip = true" @mouseleave="showTooltip = false">
            <i class="fas fa-info-circle"></i>
            <div class="tooltip" v-show="showTooltip">
              <strong>Device Categories:</strong><br>
              <strong>Високопотужна:</strong> Електрична плита, духова шафа<br>
              <strong>Потужна:</strong> Холодильник<br>
              <strong>Звичайна:</strong> Всі інші пристрої
            </div>
          </div>
        </div>
        <div class="direction-controls">
          <button
            :class="['direction-button', { active: deviceType === 'regular' }]"
            @click="setDeviceType('regular')"
          >
            Звичайна
          </button>
          <button
            :class="['direction-button', { active: deviceType === 'powerful' }]"
            @click="setDeviceType('powerful')"
          >
            Потужна
          </button>
          <button
            :class="['direction-button', { active: deviceType === 'high-power' }]"
            @click="setDeviceType('high-power')"
          >
            Високо-
            потужна
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { mapState, mapActions, mapGetters } from 'vuex';
export default {
  name: 'SocketSettingsCard',
  props: {
    floorHeight: {
      type: Number,
      required: true
    },
    deviceType: {
      type: String,
      required: true,
      default: 'regular',
      validator: (value) => ['regular', 'powerful', 'high-power'].includes(value)
    },
    unit: {
      type: String,
      required: true,
      validator: (value) => ['mm', 'cm', 'm'].includes(value)
    }
  },
  data() {
    return {
      floorHeightPresets: [
        { value: 100, display: '10' },
        { value: 300, display: '30' },
        { value: 900, display: '90' }
      ],
      stepMap: {
        mm: { floorHeight: 50 },
        cm: { floorHeight: 5 },
        m: { floorHeight: 0.05 }
      },
      showTooltip: false,
      isHighPowerDevice: false
    }
  },
  computed: {
    ...mapState('project', ['unit']),
    ...mapGetters('sockets', ['getDefaultDeviceType']),
    displayFloorHeight() {
      return `${this.convertToCurrentUnit(this.floorHeight)} ${this.unit}`
    },
    convertedFloorHeightPresets() {
      return this.floorHeightPresets.map(preset => ({
        value: preset.value,
        display: `${this.convertToCurrentUnit(preset.value)}`
      }))
    }
  },
  created() {
    // Initialize with the current default device type from Vuex
    this.$emit('update:device-type', this.getDefaultDeviceType);
  },
  methods: {
    ...mapActions('sockets', ['setDefaultFloorHeight', 'setDefaultDeviceType']),
    convertToCurrentUnit(valueMM) {
      switch (this.unit) {
        case 'cm':
          return (valueMM / 10).toFixed(0)
        case 'm':
          return (valueMM / 1000).toFixed(2)
        default:
          return valueMM
      }
    },
    convertToMM(value) {
      const numberValue = parseFloat(value) || 0
      switch (this.unit) {
        case 'cm':
          return numberValue * 10
        case 'm':
          return numberValue * 1000
        default:
          return numberValue
      }
    },
    increaseFloorHeight() {
      const step = this.stepMap[this.unit].floorHeight
      const newValue = this.floorHeight + this.convertToMM(step)
      this.setDefaultFloorHeight(newValue)
      this.$emit('update:floor-height', newValue)
    },
    decreaseFloorHeight() {
      const step = this.stepMap[this.unit].floorHeight
      const newValue = Math.max(0, this.floorHeight - this.convertToMM(step))
      this.setDefaultFloorHeight(newValue)
      this.$emit('update:floor-height', newValue)
    },
    handleFloorHeightBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.')
      const value = parseFloat(raw) || 0
      const mmValue = Math.max(0, this.convertToMM(value))
      this.setDefaultFloorHeight(mmValue)
      this.$emit('update:floor-height', mmValue)
      e.target.innerText = this.displayFloorHeight
    },
    handleEnter(e) {
      e.target.blur()
    },
    isFloorHeightPresetActive(value) {
      return this.floorHeight === value
    },
    setFloorHeight(value) {
      this.setDefaultFloorHeight(value)
      this.$emit('update:floor-height', value)
    },
    setDeviceType(type) {
      this.setDefaultDeviceType(type)
      this.$emit('update:device-type', type)
    }
  }
}
</script>

<style scoped>
.label-with-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-icon {
  position: relative;
  cursor: help;
}

.info-icon i {
  color: #666;
}

.tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 1px solid #ddd;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  width: max-content;
  max-width: 250px;
  z-index: 1000;
  margin-bottom: 8px;
  font-size: 0.9em;
  line-height: 1.4;
}

.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 8px solid transparent;
  border-top-color: white;
}

.tooltip::before {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 9px solid transparent;
  border-top-color: #ddd;
}

.checkbox-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.checkbox-control input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.checkbox-control label {
  cursor: pointer;
}
</style>

