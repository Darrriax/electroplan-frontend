<template>
  <transition name="fade">
    <div class="wall-settings-card">
      <div class="header">Settings</div>

      <!-- Thickness Section -->
      <div class="settings-section">
        <label>Thickness:</label>
        <div class="step-control">
          <button @click="decreaseThickness">-</button>
          <span
              class="editable-value"
              contenteditable
              @blur="handleThicknessBlur"
              @keydown.enter.prevent="handleEnter"
          >{{ displayThickness }}</span>
          <button @click="increaseThickness">+</button>
        </div>
      </div>

      <div class="preset-grid">
        <button
            v-for="preset in thicknessPresets"
            :key="preset.value"
            :class="['preset-button', { active: isThicknessPresetActive(preset.value) }]"
            @click="setThickness(preset.value)"
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
            v-for="preset in heightPresets"
            :key="preset.value"
            :class="['preset-button', { active: isHeightPresetActive(preset.value) }]"
            @click="setHeight(preset.value)"
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
  name: 'WallSettingsCard',
  props: {
    thickness: {
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
      thicknessPresets: [
        { value: 50, display: '5' },
        { value: 80, display: '8' },
        { value: 100, display: '10' },
        { value: 120, display: '12' },
        { value: 150, display: '15' },
        { value: 200, display: '20' }
      ],
      heightPresets: [
        { value: 2400, display: '2.4' },
        { value: 2600, display: '2.6' },
        { value: 2800, display: '2.8' },
        { value: 3000, display: '3.0' },
        { value: 3200, display: '3.2' },
        { value: 3400, display: '3.4' }
      ],
      stepMap: {
        mm: { thickness: 10, height: 100 },
        cm: { thickness: 1, height: 10 },
        m: { thickness: 0.01, height: 0.1 }
      }
    }
  },
  computed: {
    ...mapState('walls', ['defaultHeight']),
    displayThickness() {
      return `${this.convertToCurrentUnit(this.thickness)} ${this.unit}`
    },
    displayHeight() {
      return `${this.convertToCurrentUnit(this.defaultHeight)} ${this.unit}`
    }
  },
  methods: {
    ...mapActions('walls', ['updateDefaultHeight']),
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
    increaseThickness() {
      const step = this.stepMap[this.unit].thickness
      const newValue = this.thickness + this.convertToMM(step)
      this.$emit('update:thickness', newValue)
    },
    decreaseThickness() {
      const step = this.stepMap[this.unit].thickness
      const newValue = Math.max(10, this.thickness - this.convertToMM(step))
      this.$emit('update:thickness', newValue)
    },
    increaseHeight() {
      const step = this.stepMap[this.unit].height
      const newValue = this.defaultHeight + this.convertToMM(step)
      this.updateDefaultHeight(newValue)
    },
    decreaseHeight() {
      const step = this.stepMap[this.unit].height
      const newValue = Math.max(1000, this.defaultHeight - this.convertToMM(step))
      this.updateDefaultHeight(newValue)
    },
    handleThicknessBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.')
      const value = parseFloat(raw) || 0
      const mmValue = Math.max(10, this.convertToMM(value))
      this.$emit('update:thickness', mmValue)
    },
    handleHeightBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.')
      const value = parseFloat(raw) || 0
      const mmValue = Math.max(1000, this.convertToMM(value))
      this.updateDefaultHeight(mmValue)
    },
    handleEnter(e) {
      e.target.blur()
    },
    isThicknessPresetActive(value) {
      return this.thickness === value
    },
    isHeightPresetActive(value) {
      return this.defaultHeight === value
    },
    setThickness(value) {
      this.$emit('update:thickness', value)
    },
    setHeight(value) {
      this.updateDefaultHeight(value)
    }
  }
}
</script>

<style scoped>

</style>