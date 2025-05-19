<template>
  <transition name="fade">
    <div class="settings-card">
      <div class="header">Panel Settings</div>

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
  name: 'PanelSettingsCard',
  props: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    },
    floorHeight: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true,
      validator: (value) => ['mm', 'cm', 'm'].includes(value)
    }
  },
  data() {
    return {
      widthPresets: [
        { value: 300, display: '30' },
        { value: 350, display: '35' },
        { value: 440, display: '44' }
      ],
      heightPresets: [
        { value: 210, display: '21' },
        { value: 540, display: '54' },
        { value: 630, display: '63' }
      ],
      floorHeightPresets: [
        { value: 1000, display: '100' },
        { value: 1200, display: '120' },
        { value: 1800, display: '180' }
      ],
      stepMap: {
        mm: { width: 50, height: 50, floorHeight: 50 },
        cm: { width: 5, height: 5, floorHeight: 5 },
        m: { width: 0.05, height: 0.05, floorHeight: 0.05 }
      }
    }
  },
  computed: {
    ...mapState('panels', ['defaultWidth', 'defaultHeight', 'defaultFloorHeight']),
    ...mapState('project', ['unit']),

    displayWidth() {
      return `${this.convertToCurrentUnit(this.width)} ${this.unit}`
    },
    displayHeight() {
      return `${this.convertToCurrentUnit(this.height)} ${this.unit}`
    },
    displayFloorHeight() {
      return `${this.convertToCurrentUnit(this.floorHeight)} ${this.unit}`
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
    ...mapActions('panels', ['setDefaultWidth', 'setDefaultHeight', 'setDefaultFloorHeight']),

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
      const newValue = this.width + this.convertToMM(step)
      this.setDefaultWidth(newValue)
      this.$emit('update:width', newValue)
    },
    decreaseWidth() {
      const step = this.stepMap[this.unit].width
      const newValue = Math.max(200, this.width - this.convertToMM(step))
      this.setDefaultWidth(newValue)
      this.$emit('update:width', newValue)
    },
    increaseHeight() {
      const step = this.stepMap[this.unit].height
      const newValue = this.height + this.convertToMM(step)
      this.setDefaultHeight(newValue)
      this.$emit('update:height', newValue)
    },
    decreaseHeight() {
      const step = this.stepMap[this.unit].height
      const newValue = Math.max(200, this.height - this.convertToMM(step))
      this.setDefaultHeight(newValue)
      this.$emit('update:height', newValue)
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
    handleWidthBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.')
      const value = parseFloat(raw) || 0
      const mmValue = Math.max(200, this.convertToMM(value))
      this.setDefaultWidth(mmValue)
      this.$emit('update:width', mmValue)
      e.target.innerText = this.displayWidth
    },
    handleHeightBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.')
      const value = parseFloat(raw) || 0
      const mmValue = Math.max(200, this.convertToMM(value))
      this.setDefaultHeight(mmValue)
      this.$emit('update:height', mmValue)
      e.target.innerText = this.displayHeight
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
    isWidthPresetActive(value) {
      return this.width === value
    },
    isHeightPresetActive(value) {
      return this.height === value
    },
    isFloorHeightPresetActive(value) {
      return this.floorHeight === value
    },
    setWidth(value) {
      this.setDefaultWidth(value)
      this.$emit('update:width', value)
    },
    setHeight(value) {
      this.setDefaultHeight(value)
      this.$emit('update:height', value)
    },
    setFloorHeight(value) {
      this.setDefaultFloorHeight(value)
      this.$emit('update:floor-height', value)
    }
  }
}
</script>

<style scoped>
.panel-settings-card {
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
</style> 