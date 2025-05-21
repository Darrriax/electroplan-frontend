<template>
  <transition name="fade">
    <div class="settings-card">
      <div class="header">Window Settings</div>

      <!-- Width Section -->
      <div class="settings-section">
        <label>Width:</label>
        <div class="step-control">
          <button @click="decreaseWidth" :disabled="width <= 300">-</button>
          <span
              class="editable-value"
              contenteditable
              @blur="handleWidthBlur"
              @keydown.enter.prevent="handleEnter"
          >{{ displayWidth }}</span>
          <button @click="increaseWidth" :disabled="width >= 2100">+</button>
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

      <!-- Height from Floor Section -->
      <div class="settings-section">
        <label>Height from Floor:</label>
        <div class="step-control">
          <button @click="decreaseFloorHeight" :disabled="floorHeight <= 0">-</button>
          <span
              class="editable-value"
              contenteditable
              @blur="handleFloorHeightBlur"
              @keydown.enter.prevent="handleEnter"
          >{{ displayFloorHeight }}</span>
          <button @click="increaseFloorHeight" :disabled="isTotalHeightExceedingWall">+</button>
        </div>
      </div>

      <div class="preset-grid">
        <button
            v-for="preset in convertedFloorHeightPresets"
            :key="preset.value"
            :class="['preset-button', { active: isFloorHeightPresetActive(preset.value) }]"
            @click="setFloorHeight(preset.value)"
            :disabled="preset.value + height > wallHeight"
        >
          {{ preset.display }}
        </button>
      </div>

      <!-- Window Height Section -->
      <div class="settings-section">
        <label>Window Height:</label>
        <div class="step-control">
          <button @click="decreaseHeight" :disabled="height <= 300">-</button>
          <span
              class="editable-value"
              contenteditable
              @blur="handleHeightBlur"
              @keydown.enter.prevent="handleEnter"
          >{{ displayHeight }}</span>
          <button @click="increaseHeight" :disabled="isTotalHeightExceedingWall">+</button>
        </div>
      </div>

      <div class="preset-grid">
        <button
            v-for="preset in convertedHeightPresets"
            :key="preset.value"
            :class="['preset-button', { active: isHeightPresetActive(preset.value) }]"
            @click="setHeight(preset.value)"
            :disabled="preset.value + floorHeight > wallHeight"
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
    ...mapState('walls', ['defaultHeight']),
    wallHeight() {
      return this.defaultHeight;
    },
    isTotalHeightExceedingWall() {
      return (this.height + this.floorHeight) >= this.wallHeight;
    },
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
    ...mapActions('windows', [
      'setDefaultWidth',
      'setDefaultHeight',
      'setDefaultFloorHeight'
    ]),
    ...mapActions('reports', ['showMessage']),
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
    validateTotalHeight(height, floorHeight = this.floorHeight) {
      const totalHeight = height + floorHeight;
      if (totalHeight > this.wallHeight) {
        this.showMessage(`Error: Total window height (${this.convertToCurrentUnit(totalHeight)} ${this.unit}) cannot exceed wall height (${this.convertToCurrentUnit(this.wallHeight)} ${this.unit})`);
        return false;
      }
      return true;
    },
    validateHeight(height) {
      if (height < 300) {
        this.showMessage(`Error: Window height cannot be less than ${this.convertToCurrentUnit(300)} ${this.unit}`);
        return false;
      }
      return this.validateTotalHeight(height);
    },
    validateWidth(width) {
      if (width < 300) {
        this.showMessage(`Error: Window width cannot be less than ${this.convertToCurrentUnit(300)} ${this.unit}`);
        return false;
      }
      if (width > 2100) {
        this.showMessage(`Error: Window width cannot exceed ${this.convertToCurrentUnit(2100)} ${this.unit}`);
        return false;
      }
      return true;
    },
    validateFloorHeight(floorHeight) {
      if (floorHeight < 0) {
        this.showMessage(`Error: Height from floor cannot be less than ${this.convertToCurrentUnit(0)} ${this.unit}`);
        return false;
      }
      return this.validateTotalHeight(this.height, floorHeight);
    },
    increaseWidth() {
      const step = this.stepMap[this.unit].width;
      const newValue = this.width + this.convertToMM(step);
      if (this.validateWidth(newValue)) {
        this.setDefaultWidth(newValue);
        this.$emit('update:width', newValue);
      }
    },
    decreaseWidth() {
      const step = this.stepMap[this.unit].width;
      const newValue = Math.max(300, this.width - this.convertToMM(step));
      if (this.validateWidth(newValue)) {
        this.setDefaultWidth(newValue);
        this.$emit('update:width', newValue);
      }
    },
    increaseHeight() {
      const step = this.stepMap[this.unit].height;
      const newValue = this.height + this.convertToMM(step);
      if (this.validateHeight(newValue)) {
        this.setDefaultHeight(newValue);
        this.$emit('update:height', newValue);
      }
    },
    decreaseHeight() {
      const step = this.stepMap[this.unit].height;
      const newValue = Math.max(300, this.height - this.convertToMM(step));
      if (this.validateHeight(newValue)) {
        this.setDefaultHeight(newValue);
        this.$emit('update:height', newValue);
      }
    },
    increaseFloorHeight() {
      const step = this.stepMap[this.unit].floorHeight;
      const newValue = this.floorHeight + this.convertToMM(step);
      if (this.validateFloorHeight(newValue)) {
        this.setDefaultFloorHeight(newValue);
        this.$emit('update:floor-height', newValue);
      }
    },
    decreaseFloorHeight() {
      const step = this.stepMap[this.unit].floorHeight;
      const newValue = Math.max(0, this.floorHeight - this.convertToMM(step));
      if (this.validateFloorHeight(newValue)) {
        this.setDefaultFloorHeight(newValue);
        this.$emit('update:floor-height', newValue);
      }
    },
    handleWidthBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.');
      const value = parseFloat(raw) || 0;
      const mmValue = Math.max(300, this.convertToMM(value));
      if (this.validateWidth(mmValue)) {
        this.setDefaultWidth(mmValue);
        this.$emit('update:width', mmValue);
      }
      e.target.innerText = this.displayWidth;
    },
    handleHeightBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.');
      const value = parseFloat(raw) || 0;
      const mmValue = Math.max(300, this.convertToMM(value));
      if (this.validateHeight(mmValue)) {
        this.setDefaultHeight(mmValue);
        this.$emit('update:height', mmValue);
      }
      e.target.innerText = this.displayHeight;
    },
    handleFloorHeightBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.');
      const value = parseFloat(raw) || 0;
      const mmValue = Math.max(0, this.convertToMM(value));
      if (this.validateFloorHeight(mmValue)) {
        this.setDefaultFloorHeight(mmValue);
        this.$emit('update:floor-height', mmValue);
      }
      e.target.innerText = this.displayFloorHeight;
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
      if (this.validateWidth(value)) {
        this.setDefaultWidth(value);
        this.$emit('update:width', value);
      }
    },
    setHeight(value) {
      if (this.validateHeight(value)) {
        this.setDefaultHeight(value);
        this.$emit('update:height', value);
      }
    },
    setFloorHeight(value) {
      if (this.validateFloorHeight(value)) {
        this.setDefaultFloorHeight(value);
        this.$emit('update:floor-height', value);
      }
    }
  }
}
</script>