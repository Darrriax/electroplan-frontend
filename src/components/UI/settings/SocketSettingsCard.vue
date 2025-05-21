<template>
  <transition name="fade">
    <div class="settings-card">
      <div class="header">Socket Settings</div>
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
  name: 'SocketSettingsCard',
  props: {
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
      floorHeightPresets: [
        { value: 100, display: '10' },
        { value: 300, display: '30' },
        { value: 900, display: '90' }
      ],
      stepMap: {
        mm: { floorHeight: 50 },
        cm: { floorHeight: 5 },
        m: { floorHeight: 0.05 }
      }
    }
  },
  computed: {
    ...mapState('project', ['unit']),
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
  methods: {
    ...mapActions('sockets', ['setDefaultFloorHeight']),
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
    }
  }
}
</script>

