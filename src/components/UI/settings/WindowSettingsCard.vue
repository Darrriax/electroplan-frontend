<template>
  <transition name="fade">
    <div class="window-settings-card">
      <div class="header">Window Settings</div>

      <!-- Width Section -->
      <div class="settings-section">
        <label>Width:</label>
        <div class="step-control">
          <button @click="decreaseWidth">-</button>
          <span
              class="editable-value"
              contenteditable
              @blur="handleWidthBlur"
              @keydown.enter.prevent="handleEnter"
          >{{ displayWidth }}</span>
          <button @click="increaseWidth">+</button>
        </div>
      </div>

      <div class="preset-grid">
        <button
            v-for="preset in convertedWidthPresets"
            :key="preset.value"
            :class="['preset-button', { active: isWidthPresetActive(preset.value) }]"
            @click="setWidth(preset.value)"
        >
          {{ preset.display }}
        </button>
      </div>

      <!-- Height Section -->
      <div class="settings-section">
        <label>Height:</label>
        <div class="step-control">
          <button @click="decreaseHeight">-</button>
          <span
              class="editable-value"
              contenteditable
              @blur="handleHeightBlur"
              @keydown.enter.prevent="handleEnter"
          >{{ displayHeight }}</span>
          <button @click="increaseHeight">+</button>
        </div>
      </div>

      <div class="preset-grid">
        <button
            v-for="preset in convertedHeightPresets"
            :key="preset.value"
            :class="['preset-button', { active: isHeightPresetActive(preset.value) }]"
            @click="setHeight(preset.value)"
        >
          {{ preset.display }}
        </button>
      </div>

      <!-- Height from Floor Section -->
      <div class="settings-section">
        <label>Height from Floor:</label>
        <div class="step-control">
          <button @click="decreaseFloorHeight">-</button>
          <span
              class="editable-value"
              contenteditable
              @blur="handleFloorHeightBlur"
              @keydown.enter.prevent="handleEnter"
          >{{ displayFloorHeight }}</span>
          <button @click="increaseFloorHeight">+</button>
        </div>
      </div>

      <div class="preset-grid">
        <button
            v-for="preset in convertedFloorHeightPresets"
            :key="preset.value"
            :class="['preset-button', { active: isFloorHeightPresetActive(preset.value) }]"
            @click="setFloorHeight(preset.value)"
        >
          {{ preset.display }}
        </button>
      </div>
    </div>
  </transition>
</template>

<script>
import { mapState, mapActions } from 'vuex';

export default {
  name: 'WindowSettingsCard',
  data() {
    return {
      widthPresets: [
        { value: 750, display: '75' },
        { value: 850, display: '85' },
        { value: 1200, display: '120' },
        { value: 1350, display: '135' },
        { value: 1400, display: '140' },
        { value: 2100, display: '210' }
      ],
      heightPresets: [
        { value: 600, display: '60' },
        { value: 1200, display: '120' },
        { value: 1350, display: '135' },
        { value: 1400, display: '140' },
        { value: 1750, display: '175' },
        { value: 2000, display: '200' }
      ],
      floorHeightPresets: [
        { value: 0, display: '0' },
        { value: 500, display: '50' },
        { value: 900, display: '90' }
      ],
      stepMap: {
        mm: { width: 50, height: 50, floorHeight: 50 },
        cm: { width: 5, height: 5, floorHeight: 5 },
        m: { width: 0.05, height: 0.05, floorHeight: 0.05 }
      }
    }
  },
  computed: {
    ...mapState('windows', ['defaultWidth', 'defaultHeight', 'defaultFloorHeight']),
    ...mapState('project', ['unit']),

    displayWidth() {
      return `${this.convertToCurrentUnit(this.defaultWidth)} ${this.unit}`
    },
    displayHeight() {
      return `${this.convertToCurrentUnit(this.defaultHeight)} ${this.unit}`
    },
    displayFloorHeight() {
      return `${this.convertToCurrentUnit(this.defaultFloorHeight)} ${this.unit}`
    },
    convertedWidthPresets() {
      return this.widthPresets.map(preset => ({
        value: preset.value,
        display: `${this.convertToCurrentUnit(preset.value)}`
      }))
    },
    convertedHeightPresets() {
      return this.heightPresets.map(preset => ({
        value: preset.value,
        display: `${this.convertToCurrentUnit(preset.value)}`
      }))
    },
    convertedFloorHeightPresets() {
      return this.floorHeightPresets.map(preset => ({
        value: preset.value,
        display: `${this.convertToCurrentUnit(preset.value)}`
      }))
    }
  },
  methods: {
    ...mapActions('windows', ['setDefaultWidth', 'setDefaultHeight', 'setDefaultFloorHeight']),

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
    increaseWidth() {
      const step = this.stepMap[this.unit].width
      const newValue = this.defaultWidth + this.convertToMM(step)
      this.setDefaultWidth(newValue)
    },
    decreaseWidth() {
      const step = this.stepMap[this.unit].width
      const newValue = Math.max(300, this.defaultWidth - this.convertToMM(step))
      this.setDefaultWidth(newValue)
    },
    increaseHeight() {
      const step = this.stepMap[this.unit].height
      const newValue = this.defaultHeight + this.convertToMM(step)
      this.setDefaultHeight(newValue)
    },
    decreaseHeight() {
      const step = this.stepMap[this.unit].height
      const newValue = Math.max(300, this.defaultHeight - this.convertToMM(step))
      this.setDefaultHeight(newValue)
    },
    increaseFloorHeight() {
      const step = this.stepMap[this.unit].floorHeight
      const newValue = this.defaultFloorHeight + this.convertToMM(step)
      this.setDefaultFloorHeight(newValue)
    },
    decreaseFloorHeight() {
      const step = this.stepMap[this.unit].floorHeight
      const newValue = Math.max(0, this.defaultFloorHeight - this.convertToMM(step))
      this.setDefaultFloorHeight(newValue)
    },
    handleWidthBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.')
      const value = parseFloat(raw) || 0
      const mmValue = Math.max(300, this.convertToMM(value))
      this.setDefaultWidth(mmValue)
    },
    handleHeightBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.')
      const value = parseFloat(raw) || 0
      const mmValue = Math.max(300, this.convertToMM(value))
      this.setDefaultHeight(mmValue)
    },
    handleFloorHeightBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.')
      const value = parseFloat(raw) || 0
      const mmValue = Math.max(0, this.convertToMM(value))
      this.setDefaultFloorHeight(mmValue)
    },
    handleEnter(e) {
      e.target.blur()
    },
    isWidthPresetActive(value) {
      return this.defaultWidth === value
    },
    isHeightPresetActive(value) {
      return this.defaultHeight === value
    },
    isFloorHeightPresetActive(value) {
      return this.defaultFloorHeight === value
    },
    setWidth(value) {
      this.setDefaultWidth(value)
    },
    setHeight(value) {
      this.setDefaultHeight(value)
    },
    setFloorHeight(value) {
      this.setDefaultFloorHeight(value)
    }
  }
}
</script>

<style scoped>
.window-settings-card {
  margin-top: 210px;
  left: 0;
  width: 160px;
  background: white;
  border-radius: 10px;
  padding: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  position: fixed;
}

.header {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 10px;
}

.settings-section {
  margin-bottom: 12px;
}

.step-control {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 2px 8px;
  margin-bottom: 12px;
}

.step-control button {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}

.editable-value {
  min-width: 70px;
  text-align: center;
  font-weight: 500;
  outline: none;
  border-radius: 4px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.preset-button {
  padding: 6px 0;
  border: 1px solid #ccc;
  background: #f9f9f9;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-button:hover {
  background: #eee;
}

.preset-button.active {
  background: #42b983;
  color: white;
  border-color: #42b983;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style> 