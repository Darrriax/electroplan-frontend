<template>
  <transition name="fade">
    <div class="door-settings-card">
      <div class="header">Door Settings</div>

      <!-- Width Section -->
      <div class="settings-section">
        <label>Width:</label>
        <div class="step-control">
          <button @click="decreaseWidth" :disabled="width <= 500">-</button>
          <span
              class="editable-value"
              contenteditable
              @blur="handleWidthBlur"
              @keydown.enter.prevent="handleEnter"
          >{{ displayWidth }}</span>
          <button @click="increaseWidth" :disabled="width >= 1500">+</button>
        </div>
        <div v-if="widthError" class="error-message">{{ widthError }}</div>
      </div>

      <div class="preset-grid">
        <button
            v-for="preset in convertedWidthPresets"
            :key="preset.value"
            :class="['preset-button', { active: isWidthPresetActive(preset.value) }]"
            @click="setWidth(preset.value)"
            :disabled="preset.value < 500 || preset.value > 1500"
        >
          {{ preset.display }}
        </button>
      </div>

      <!-- Height Section -->
      <div class="settings-section">
        <label>Height:</label>
        <div class="step-control">
          <button @click="decreaseHeight" :disabled="height <= 1800">-</button>
          <span
              class="editable-value"
              contenteditable
              @blur="handleHeightBlur"
              @keydown.enter.prevent="handleEnter"
          >{{ displayHeight }}</span>
          <button @click="increaseHeight" :disabled="isHeightExceedingWall">+</button>
        </div>
        <div v-if="heightError" class="error-message">{{ heightError }}</div>
      </div>

      <div class="preset-grid">
        <button
            v-for="preset in convertedHeightPresets"
            :key="preset.value"
            :class="['preset-button', { active: isHeightPresetActive(preset.value) }]"
            @click="setHeight(preset.value)"
            :disabled="preset.value > wallHeight"
        >
          {{ preset.display }}
        </button>
      </div>

      <!-- Opening Direction -->
      <div class="settings-section">
        <label>Opening Direction:</label>
        <div class="direction-controls">
          <button
              :class="['direction-button', { active: openingDirection === 'left' }]"
              @click="setOpeningDirection('left')"
          >
            Left
          </button>
          <button
              :class="['direction-button', { active: openingDirection === 'right' }]"
              @click="setOpeningDirection('right')"
          >
            Right
          </button>
        </div>
      </div>

      <!-- Opening Side -->
      <div class="settings-section">
        <label>Opening Side:</label>
        <div class="direction-controls">
          <button
              :class="['direction-button', { active: openingSide === 'inside' }]"
              @click="setOpeningSide('inside')"
          >
            Inside
          </button>
          <button
              :class="['direction-button', { active: openingSide === 'outside' }]"
              @click="setOpeningSide('outside')"
          >
            Outside
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { mapState, mapActions } from 'vuex';

export default {
  name: 'DoorSettingsCard',
  props: {
    width: {
      type: Number,
      required: true
    },
    height: {
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
        { value: 600, display: '60' },  // 60cm
        { value: 700, display: '70' },  // 70cm
        { value: 800, display: '80' },  // Standard door - 80cm
        { value: 900, display: '90' },  // 90cm
        { value: 1000, display: '100' }, // 100cm
        { value: 1200, display: '120' }  // Double door - 120cm
      ],
      heightPresets: [
        { value: 2000, display: '200' }, // 200cm
        { value: 2100, display: '210' }, // 210cm
        { value: 2200, display: '220' }  // 220cm
      ],
      stepMap: {
        mm: { width: 50, height: 100 },
        cm: { width: 5, height: 10 },
        m: { width: 0.05, height: 0.1 }
      },
      openingDirection: 'left',
      openingSide: 'inside',
      heightError: null,
      widthError: null
    }
  },
  computed: {
    ...mapState('doors', [
      'defaultWidth',
      'defaultHeight',
      'defaultOpeningDirection',
      'defaultOpeningSide'
    ]),
    ...mapState('walls', ['defaultHeight']),
    wallHeight() {
      return this.defaultHeight;
    },
    isHeightExceedingWall() {
      return this.height >= this.wallHeight;
    },
    displayWidth() {
      return `${this.convertToCurrentUnit(this.width)} ${this.unit}`
    },
    displayHeight() {
      return `${this.convertToCurrentUnit(this.height)} ${this.unit}`
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
    }
  },
  methods: {
    ...mapActions('doors', [
      'updateDefaultWidth',
      'updateDefaultHeight',
      'updateDefaultOpeningDirection',
      'updateDefaultOpeningSide'
    ]),
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
    validateHeight(height) {
      if (height > this.wallHeight) {
        this.heightError = `Door height cannot exceed wall height (${this.convertToCurrentUnit(this.wallHeight)} ${this.unit})`;
        return false;
      }
      if (height < 1800) {
        this.heightError = `Door height cannot be less than ${this.convertToCurrentUnit(1800)} ${this.unit}`;
        return false;
      }
      this.heightError = null;
      return true;
    },
    validateWidth(width) {
      if (width < 500) {
        this.widthError = `Door width cannot be less than ${this.convertToCurrentUnit(500)} ${this.unit}`;
        return false;
      }
      if (width > 1500) {
        this.widthError = `Door width cannot exceed ${this.convertToCurrentUnit(1500)} ${this.unit}`;
        return false;
      }
      this.widthError = null;
      return true;
    },
    increaseWidth() {
      const step = this.stepMap[this.unit].width;
      const newValue = this.width + this.convertToMM(step);
      if (this.validateWidth(newValue)) {
        this.updateDefaultWidth(newValue);
        this.$emit('update:width', newValue);
        this.$emit('width-change', newValue);
      }
    },
    decreaseWidth() {
      const step = this.stepMap[this.unit].width;
      const newValue = Math.max(500, this.width - this.convertToMM(step));
      if (this.validateWidth(newValue)) {
        this.updateDefaultWidth(newValue);
        this.$emit('update:width', newValue);
        this.$emit('width-change', newValue);
      }
    },
    increaseHeight() {
      const step = this.stepMap[this.unit].height;
      const newValue = this.height + this.convertToMM(step);
      if (this.validateHeight(newValue)) {
        this.updateDefaultHeight(newValue);
        this.$emit('update:height', newValue);
        this.$emit('height-change', newValue);
      }
    },
    decreaseHeight() {
      const step = this.stepMap[this.unit].height;
      const newValue = Math.max(1800, this.height - this.convertToMM(step));
      if (this.validateHeight(newValue)) {
        this.updateDefaultHeight(newValue);
        this.$emit('update:height', newValue);
        this.$emit('height-change', newValue);
      }
    },
    handleWidthBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.');
      const value = parseFloat(raw) || 0;
      const mmValue = Math.max(500, this.convertToMM(value));
      if (this.validateWidth(mmValue)) {
        this.updateDefaultWidth(mmValue);
        this.$emit('update:width', mmValue);
        this.$emit('width-change', mmValue);
      }
      e.target.innerText = this.displayWidth;
    },
    handleHeightBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.');
      const value = parseFloat(raw) || 0;
      const mmValue = Math.max(1800, this.convertToMM(value));
      if (this.validateHeight(mmValue)) {
        this.updateDefaultHeight(mmValue);
        this.$emit('update:height', mmValue);
        this.$emit('height-change', mmValue);
      }
      e.target.innerText = this.displayHeight;
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
    setWidth(value) {
      this.updateDefaultWidth(value);
      this.$emit('update:width', value);
      this.$emit('width-change', value);
    },
    setHeight(value) {
      this.updateDefaultHeight(value);
      this.$emit('update:height', value);
      this.$emit('height-change', value);
    },
    setOpeningDirection(direction) {
      this.openingDirection = direction;
      this.updateDefaultOpeningDirection(direction);
      this.$emit('update:opening-direction', direction);
    },
    setOpeningSide(side) {
      this.openingSide = side;
      this.updateDefaultOpeningSide(side);
      this.$emit('update:opening-side', side);
    }
  }
}
</script>

<style scoped>
.door-settings-card {
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

.direction-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.direction-button {
  padding: 6px 0;
  border: 1px solid #ccc;
  background: #f9f9f9;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.direction-button:hover {
  background: #eee;
}

.direction-button.active {
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

.error-message {
  color: #ff4444;
  font-size: 12px;
  margin-top: 4px;
  text-align: center;
}

.preset-button:disabled,
.direction-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f0f0f0;
}

.step-control button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 