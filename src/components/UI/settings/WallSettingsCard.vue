<template>
  <transition name="fade">
    <div class="wall-settings-card">
      <div class="header">Settings</div>

      <div class="settings-section">
        <label>Thickness:</label>
        <div class="step-control">
          <button @click="decrease">-</button>
          <span
              class="editable-value"
              contenteditable
              @blur="handleBlur"
              @keydown.enter.prevent="handleEnter"
          >{{ displayValue }}</span>
          <button @click="increase">+</button>
        </div>
      </div>

      <div class="preset-grid">
        <button
            v-for="preset in computedPresets"
            :key="preset.value"
            :class="['preset-button', { active: isPresetActive(preset.value) }]"
            @click="setThickness(preset.value)"
        >
          {{ preset.display }}
        </button>
      </div>
    </div>
  </transition>
</template>

<script>
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
      basePresets: [50, 80, 100, 120, 150, 200], // mm
      stepMap: {mm: 10, cm: 1, m: 0.01}
    }
  },
  computed: {
    computedPresets() {
      return this.basePresets.map(preset => ({
        value: preset,
        display: `${this.convertToCurrentUnit(preset)}`
      }))
    },
    displayValue() {
      return `${this.convertToCurrentUnit(this.thickness)} ${this.unit}`
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
    increase() {
      const step = this.stepMap[this.unit]
      const newValue = this.thickness + this.convertToMM(step)
      this.$emit('update:thickness', newValue)
    },
    decrease() {
      const step = this.stepMap[this.unit]
      const newValue = Math.max(10, this.thickness - this.convertToMM(step))
      this.$emit('update:thickness', newValue)
    },
    handleBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.')
      const value = parseFloat(raw) || 0
      const mmValue = Math.max(10, this.convertToMM(value))
      this.$emit('update:thickness', mmValue)
    },
    handleEnter(e) {
      e.target.blur()
    },
    isPresetActive(value) {
      return this.thickness === value
    },
    setThickness(value) {
      this.$emit('update:thickness', value)
    }
  }
}
</script>