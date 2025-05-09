<!-- src/components/UI/settings/WallSettingsCard.vue -->
<template>
  <div class="wall-settings-card" v-if="showSettings">
    <div class="settings-header">
      <h3>Thickness ({{ unit }})</h3>
    </div>
    <div class="settings-body">
      <div class="setting-item">
        <div class="thickness-control">
          <button @click="decreaseThickness" class="control-button">−</button>
          <input
              id="wall-thickness"
              type="number"
              v-model.number="thickness"
              @change="updateThickness"
              min="1"
          />
          <button @click="increaseThickness" class="control-button">+</button>
        </div>
      </div>
      <div class="presets">
        <div class="preset-buttons">
          <button
              v-for="preset in currentThicknessPresets"
              :key="preset"
              @click="setThickness(preset)"
              :class="{'active': thickness === preset}"
          >
            {{ preset }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex';

export default {
  name: "WallSettingsCard",
  data() {
    return {
      // Значення пресетів для сантиметрів (за замовчуванням)
      thicknessPresetsCm: [5, 8, 10, 12, 15, 20],
      // Значення пресетів для міліметрів
      thicknessPresetsMm: [50, 80, 100, 120, 150, 200]
    }
  },
  computed: {
    ...mapState('editorTools', {
      activeMode: state => state.activeMode,
      activeTool: state => state.activeTool
    }),
    ...mapState('project', {
      unit: state => state.unit,
      storeThickness: state => state.wallThickness
    }),

    showSettings() {
      return this.activeMode === 'originalPlan' && this.activeTool.originalPlan === 'wall';
    },

    // Визначаємо поточні пресети в залежності від одиниць виміру
    currentThicknessPresets() {
      return this.unit === 'см' ? this.thicknessPresetsCm : this.thicknessPresetsMm;
    },

    // Обчислюване значення для товщини
    thickness: {
      get() {
        return this.storeThickness;
      },
      set(value) {
        // Обмеження значення в залежності від одиниць виміру
        const minValue = this.unit === 'см' ? 5 : 50;
        const maxValue = this.unit === 'см' ? 50 : 500;

        if (value < minValue) value = minValue;
        if (value > maxValue) value = maxValue;

        this.setWallThickness(value);
      }
    }
  },
  methods: {
    ...mapMutations('project', ['setWallThickness']),

    updateThickness() {
      // Додаткова валідація при зміні через input
      let value = this.thickness;
      const minValue = this.unit === 'см' ? 5 : 50;
      const maxValue = this.unit === 'см' ? 50 : 500;

      if (isNaN(value) || value < minValue) {
        value = minValue;
      } else if (value > maxValue) {
        value = maxValue;
      }

      this.setWallThickness(value);
    },

    increaseThickness() {
      const step = this.unit === 'см' ? 1 : 10;
      const maxValue = this.unit === 'см' ? 50 : 500;

      if (this.thickness < maxValue) {
        this.thickness += step;
      }
    },

    decreaseThickness() {
      const step = this.unit === 'см' ? 1 : 10;
      const minValue = this.unit === 'см' ? 5 : 50;

      if (this.thickness > minValue) {
        this.thickness -= step;
      }
    },

    setThickness(value) {
      this.thickness = value;
    },

    // Метод для конвертації значення товщини при зміні одиниць виміру
    convertThickness(fromUnit, toUnit, value) {
      // см -> мм: множимо на 10
      if (fromUnit === 'см' && toUnit === 'мм') {
        return value * 10;
      }
      // мм -> см: ділимо на 10
      else if (fromUnit === 'мм' && toUnit === 'см') {
        return value / 10;
      }
      return value;
    }
  },
  watch: {
    // Спостерігаємо за зміною одиниць виміру
    unit: {
      immediate: true, // Викликати хендлер одразу при створенні компонента
      handler(newUnit, oldUnit) {
        if (newUnit && oldUnit && newUnit !== oldUnit) {
          // Конвертуємо значення товщини при зміні одиниць
          const newThickness = Math.round(this.convertThickness(oldUnit, newUnit, this.storeThickness));
          this.setWallThickness(newThickness);
        }
      }
    }
  },
  // Ініціалізація при створенні компонента
  created() {
    // Переконуємося, що початкове значення товщини відповідає поточним одиницям виміру
    if (this.unit === 'мм' && this.storeThickness < 50) {
      this.setWallThickness(this.storeThickness * 10);
    }
  }
}
</script>

<style scoped>
.wall-settings-card {
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 15px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 180px;
  height: 210px;
  left: 5px;
}

.settings-header {
  margin-bottom: 15px;
}

.settings-header h3 {
  font-size: 14px;
  text-align: center;
  color: white;
  background-color: #6CB33F;
  padding: 8px 12px;
  border-radius: 4px 4px 0 0;
  margin: -15px -15px 15px -15px;
  text-transform: uppercase;
  font-weight: 500;
}

.setting-item {
  margin-bottom: 15px;
}

.setting-item label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  font-size: 14px;
  color: #666;
}

.thickness-control {
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 15px;
}

.thickness-control input {
  flex-grow: 1;
  text-align: center;
  padding: 8px 5px;
  border: none;
  border-left: 1px solid #ddd;
  border-right: 1px solid #ddd;
  font-size: 18px;
  font-weight: bold;
  width: 50px;
}

.unit-display {
  padding: 0 8px;
  color: #666;
  background-color: #f9f9f9;
  border-right: 1px solid #ddd;
}

.control-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9f9f9;
  border: none;
  cursor: pointer;
  font-size: 20px;
  font-weight: bold;
  color: #666;
}

.control-button:hover {
  background-color: #f0f0f0;
}

.presets {
  margin-top: 5px;
}

.preset-buttons {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.preset-buttons button {
  flex: 1;
  min-width: 40px;
  padding: 8px 0;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.preset-buttons button:hover {
  background-color: #f0f0f0;
}

.preset-buttons button.active {
  background-color: #fff;
  border-color: #6CB33F;
  font-weight: bold;
}
</style>