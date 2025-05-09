<template>
  <project-layout>
    <div class="plan-editor">
      <canvas ref="canvas" class="grid-canvas"></canvas>
    </div>
  </project-layout>
</template>

<script>
// PlanEditor.vue - script section
import ProjectLayout from '../../UI/layouts/ProjectLayout.vue';
import { CanvasInitializer } from '../../../utils';
import { mapGetters, mapState, mapMutations } from 'vuex';

export default {
  name: 'PlanEditor',
  components: {
    ProjectLayout,
  },
  data() {
    return {
      canvasInit: null,
      isMouseOnCanvas: false,
      pixelsPerCm: 1, // Масштаб: скільки пікселів у 1 см
      cellSize: 10,   // Розмір клітинки сітки
    };
  },
  computed: {
    ...mapGetters('project', ['projectSettings']),
    ...mapState('editorTools', ['activeMode', 'activeTool']),
    ...mapState('walls', ['walls']),
    wallThickness() {
      return this.projectSettings.wallThickness;
    },
    unit() {
      return this.projectSettings.unit;
    },
    // Масштабний коефіцієнт залежно від одиниці виміру
    scaleMultiplier() {
      switch (this.unit) {
        case 'мм':
          return 0.1;  // 1 мм = 0.1 см
        case 'м':
          return 100;   // 1 м = 100 см
        case 'дм':
          return 10;   // 1 дм = 10 см
        case 'фут':
          return 30.48; // 1 фут = 30.48 см
        case 'дюйм':
          return 2.54; // 1 дюйм = 2.54 см
        case 'см':
        default:
          return 1;      // 1 см = 1 см (базова одиниця)
      }
    },
    // Отримуємо товщину стіни в сантиметрах для масштабування
    wallThicknessInCm() {
      return this.wallThickness * this.scaleMultiplier;
    },
    isWallToolActive() {
      // Перевіряємо, чи активний інструмент "Стіна" у режимі "originalPlan"
      return this.activeMode === 'originalPlan' && this.activeTool.originalPlan === 'wall';
    }
  },
  watch: {
    // Слідкуємо за зміною товщини стіни у Vuex
    wallThicknessInCm: {
      handler(newValue) {
        if (this.canvasInit) {
          this.canvasInit.updateOptions({
            wallThicknessInCm: newValue,
            pixelsPerCm: this.pixelsPerCm
          });
          this.canvasInit.updatePreviewRect(newValue, this.pixelsPerCm);
        }
      },
      immediate: true
    },
    // Слідкуємо за зміною одиниць виміру
    unit: {
      handler() {
        if (this.canvasInit) {
          this.canvasInit.updateOptions({
            wallThicknessInCm: this.wallThicknessInCm,
            pixelsPerCm: this.pixelsPerCm
          });
          this.canvasInit.updatePreviewRect(this.wallThicknessInCm, this.pixelsPerCm);
        }
      },
      immediate: true
    },
    // Слідкуємо за зміною активного інструменту
    isWallToolActive: {
      handler(isActive) {
        if (this.canvasInit) {
          this.canvasInit.updateOptions({
            isWallToolActive: isActive,
            isMouseOnCanvas: this.isMouseOnCanvas
          });

          if (isActive && this.isMouseOnCanvas) {
            this.canvasInit.previewRect.show();
          } else {
            this.canvasInit.previewRect.hide();
          }

          this.canvasInit.redraw();
        }
      },
      immediate: true
    }
  },
  mounted() {
    this.initCanvas();
  },
  beforeUnmount() {
    if (this.canvasInit) {
      this.canvasInit.destroy();
    }
  },
  methods: {
    ...mapMutations('editorTools', ['setActiveTool']),
    ...mapMutations('walls', ['addWall']),

    initCanvas() {
      const canvas = this.$refs.canvas;

      // Ініціалізуємо канвас використовуючи наш новий клас
      this.canvasInit = new CanvasInitializer(canvas, {
        virtualSize: 500000,
        pixelsPerCm: this.pixelsPerCm,
        cellSize: this.cellSize,
        wallThickness: this.wallThickness,
        wallThicknessInCm: this.wallThicknessInCm,
        isWallToolActive: this.isWallToolActive,
        isMouseOnCanvas: this.isMouseOnCanvas,
        existingWalls: this.walls,
        onWallCreated: (wall) => {
          // Add new wall to Vuex store
          this.addWall(wall);
        }
      }).init();

      // Налаштовуємо колбеки для зв'язку з компонентом Vue
      this.canvasInit.setCallbacks({
        onMouseEnter: () => {
          this.isMouseOnCanvas = true;
        },
        onMouseLeave: () => {
          this.isMouseOnCanvas = false;
        },
        onToolDeselect: (detail) => {
          // Відключаємо активний інструмент при натисканні правою кнопкою миші
          if (detail && detail.mode) {
            this.setActiveTool({
              mode: detail.mode,
              toolId: null
            });
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.plan-editor {
  display: flex;
  height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.grid-canvas {
  width: 100%;
  height: 100%;
  display: block;
  background-color: white;
}
</style>