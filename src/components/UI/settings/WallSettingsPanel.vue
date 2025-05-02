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
import { mapActions, mapGetters, mapState } from "vuex";

export default {
  name: 'WallSettingsPanel',

  data() {
    return {
      basePresets: [50, 80, 100, 120, 150, 200],
      stepMap: { mm: 1, cm: 1, m: 0.1 }
    }
  },

  computed: {
    ...mapGetters({
      unit: 'project/unit',
      wallThickness: 'walls/defaultThickness'
    }),

    computedPresets() {
      return this.basePresets.map(preset => ({
        value: preset,
        display: `${this.convertToCurrentUnit(preset)}`
      }))
    },

    displayValue() {
      return `${this.convertToCurrentUnit(this.wallThickness)} ${this.unit}`
    }
  },

  methods: {
    ...mapActions({
      updateThickness: 'walls/updateDefaultThickness'
    }),

    convertToCurrentUnit(valueMM) {
      if (!this.unit) return '0'
      switch (this.unit) {
        case 'cm': return (valueMM / 10).toFixed(0)
        case 'm': return (valueMM / 1000).toFixed(2)
        default: return valueMM
      }
    },

    convertToMM(value) {
      const numberValue = parseFloat(value) || 0
      if (!this.unit) return 0
      switch (this.unit) {
        case 'cm': return numberValue * 10
        case 'm': return numberValue * 1000
        default: return numberValue
      }
    },

    increase() {
      if (!this.unit) return
      const step = this.stepMap[this.unit]
      this.updateThickness(this.wallThickness + this.convertToMM(step))
    },

    decrease() {
      if (!this.unit) return
      const step = this.stepMap[this.unit]
      const newValue = this.wallThickness - this.convertToMM(step)
      this.updateThickness(Math.max(10, newValue))
    },

    handleBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.')
      const value = parseFloat(raw) || 0
      this.updateThickness(Math.max(10, this.convertToMM(value)))
    },

    handleEnter(e) {
      e.target.blur()
    },

    isPresetActive(value) {
      return this.wallThickness === value
    },

    setThickness(value) {
      this.updateThickness(value)
    }
  }
}
</script>