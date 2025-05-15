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
import { convertFromMM, convertToMM } from '../../../utils/unitConversion';

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
        { value: 50, display: convertFromMM(50, this.unit) },
        { value: 80, display: convertFromMM(80, this.unit) },
        { value: 100, display: convertFromMM(100, this.unit) },
        { value: 120, display: convertFromMM(120, this.unit) },
        { value: 150, display: convertFromMM(150, this.unit) },
        { value: 200, display: convertFromMM(200, this.unit) }
      ],
      heightPresets: [
        { value: 2400, display: convertFromMM(2400, this.unit) },
        { value: 2600, display: convertFromMM(2600, this.unit) },
        { value: 2800, display: convertFromMM(2800, this.unit) },
        { value: 3000, display: convertFromMM(3000, this.unit) },
        { value: 3200, display: convertFromMM(3200, this.unit) },
        { value: 3400, display: convertFromMM(3400, this.unit) }
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
      return `${convertFromMM(this.thickness, this.unit)} ${this.unit}`;
    },
    displayHeight() {
      return `${convertFromMM(this.defaultHeight, this.unit)} ${this.unit}`;
    }
  },
  watch: {
    unit: {
      handler(newUnit) {
        // Update presets when unit changes
        this.thicknessPresets = this.thicknessPresets.map(preset => ({
          ...preset,
          display: convertFromMM(preset.value, newUnit)
        }));
        this.heightPresets = this.heightPresets.map(preset => ({
          ...preset,
          display: convertFromMM(preset.value, newUnit)
        }));
      },
      immediate: true
    }
  },
  methods: {
    ...mapActions('walls', ['updateDefaultHeight']),
    increaseThickness() {
      const step = this.stepMap[this.unit].thickness;
      const newValue = this.thickness + convertToMM(step, this.unit);
      this.$emit('update:thickness', newValue);
    },
    decreaseThickness() {
      const step = this.stepMap[this.unit].thickness;
      const newValue = Math.max(10, this.thickness - convertToMM(step, this.unit));
      this.$emit('update:thickness', newValue);
    },
    increaseHeight() {
      const step = this.stepMap[this.unit].height;
      const newValue = this.defaultHeight + convertToMM(step, this.unit);
      this.updateDefaultHeight(newValue);
    },
    decreaseHeight() {
      const step = this.stepMap[this.unit].height;
      const newValue = Math.max(1000, this.defaultHeight - convertToMM(step, this.unit));
      this.updateDefaultHeight(newValue);
    },
    handleThicknessBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.');
      const value = parseFloat(raw) || 0;
      const mmValue = Math.max(10, convertToMM(value, this.unit));
      this.$emit('update:thickness', mmValue);
    },
    handleHeightBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.');
      const value = parseFloat(raw) || 0;
      const mmValue = Math.max(1000, convertToMM(value, this.unit));
      this.updateDefaultHeight(mmValue);
    },
    handleEnter(e) {
      e.target.blur();
    },
    isThicknessPresetActive(value) {
      return this.thickness === value;
    },
    isHeightPresetActive(value) {
      return this.defaultHeight === value;
    },
    setThickness(value) {
      this.$emit('update:thickness', value);
    },
    setHeight(value) {
      this.updateDefaultHeight(value);
    }
  }
};
</script>

<style scoped>

</style>