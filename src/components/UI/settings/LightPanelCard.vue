<template>
  <transition name="fade">
    <div class="light-panel-card">
      <div class="header">Light Panel</div>
      <div class="settings-section">
        <label>Height from Floor:</label>
        <div class="step-control">
          <button @click="decreaseFloorHeight" :disabled="!isWallLight">-</button>
          <span
              class="editable-value"
              :contenteditable="isWallLight"
              :class="{ disabled: !isWallLight }"
              @blur="isWallLight ? handleFloorHeightBlur : null"
              @keydown.enter.prevent="isWallLight ? handleEnter : null"
          >{{ displayFloorHeight }}</span>
          <button @click="increaseFloorHeight" :disabled="!isWallLight">+</button>
        </div>
      </div>
      <div class="preset-grid">
        <button
            v-for="preset in convertedFloorHeightPresets"
            :key="preset.value"
            :class="['preset-button', { active: isFloorHeightPresetActive(preset.value) }]"
            @click="isWallLight ? setFloorHeight(preset.value) : null"
            :disabled="!isWallLight"
        >
          {{ preset.display }}
        </button>
      </div>
      <hr>
      <div class="placeholder">Lamp groups will be displayed here in the future.</div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'LightPanelCard',
  props: {
    floorHeight: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true
    },
    isWallLight: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      floorHeightPresets: [
        { value: 1800, display: '180' },
        { value: 2000, display: '200' },
        { value: 2200, display: '220' },
  
      ],
      stepMap: {
        mm: { floorHeight: 50 },
        cm: { floorHeight: 5 },
        m: { floorHeight: 0.05 }
      }
    }
  },
  computed: {
    displayFloorHeight() {
      switch (this.unit) {
        case 'cm':
          return `${(this.floorHeight / 10).toFixed(0)} ${this.unit}`;
        case 'm':
          return `${(this.floorHeight / 1000).toFixed(2)} ${this.unit}`;
        default:
          return `${this.floorHeight} ${this.unit}`;
      }
    },
    convertedFloorHeightPresets() {
      return this.floorHeightPresets.map(preset => ({
        value: preset.value,
        display: this.convertToCurrentUnit(preset.value)
      }))
    }
  },
  methods: {
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
      if (!this.isWallLight) return;
      const step = this.stepMap[this.unit].floorHeight
      const newValue = this.floorHeight + this.convertToMM(step)
      this.$emit('update:floor-height', newValue)
    },
    decreaseFloorHeight() {
      if (!this.isWallLight) return;
      const step = this.stepMap[this.unit].floorHeight
      const newValue = Math.max(0, this.floorHeight - this.convertToMM(step))
      this.$emit('update:floor-height', newValue)
    },
    handleFloorHeightBlur(e) {
      if (!this.isWallLight) return;
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.')
      const value = parseFloat(raw) || 0
      const mmValue = Math.max(0, this.convertToMM(value))
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
      if (!this.isWallLight) return;
      this.$emit('update:floor-height', value)
    }
  }
}
</script>

<style scoped>
.light-panel-card {
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

.editable-value {
  min-width: 70px;
  text-align: center;
  font-weight: 500;
  outline: none;
  border-radius: 4px;
}

.editable-value.disabled {
  background: #eee;
  color: #aaa;
  pointer-events: none;
}

.placeholder {
  color: #888;
  font-size: 14px;
  text-align: center;
}
</style>