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

<script setup>
import {computed} from 'vue'
import {useStore} from 'vuex'

const store = useStore()

// Отримуємо одиниці виміру з модуля project
const unit = computed(() => store.getters['project/unit'])

const wallThickness = computed({
  get: () => store.getters['walls/defaultThickness'],
  set: (value) => store.dispatch('walls/updateDefaultThickness', value)
})

const basePresets = [50, 80, 100, 120, 150, 200] // мм
const stepMap = {mm: 10, cm: 10, m: 100}

const convertToCurrentUnit = (valueMM) => {
  if (!unit.value) return '0' // Додано перевірку на наявність unit
  switch (unit.value) {
    case 'cm':
      return (valueMM / 10).toFixed(0)
    case 'm':
      return (valueMM / 1000).toFixed(2)
    default:
      return valueMM
  }
}

const convertToMM = (value) => {
  const numberValue = parseFloat(value) || 0 // Додано перевірку на число
  if (!unit.value) return 0
  switch (unit.value) {
    case 'cm':
      return numberValue * 10
    case 'm':
      return numberValue * 1000
    default:
      return numberValue
  }
}

const computedPresets = computed(() => {
  return basePresets.map(preset => ({
    value: preset,
    display: `${convertToCurrentUnit(preset)}`
  }))
})

const displayValue = computed(() => {
  return `${convertToCurrentUnit(wallThickness.value)} ${unit.value || ''}`
})

const increase = () => {
  if (!unit.value) return
  const step = stepMap[unit.value]
  wallThickness.value += convertToMM(step)
}

const decrease = () => {
  if (!unit.value) return
  const step = stepMap[unit.value]
  const newValue = wallThickness.value - convertToMM(step)
  wallThickness.value = Math.max(10, newValue)
}

const handleBlur = (e) => {
  const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.')
  const value = parseFloat(raw) || 0
  wallThickness.value = Math.max(10, convertToMM(value))
}

const handleEnter = (e) => e.target.blur()

const isPresetActive = (value) => wallThickness.value === value
const setThickness = (value) => wallThickness.value = value
</script>