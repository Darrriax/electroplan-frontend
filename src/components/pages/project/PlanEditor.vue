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
import {
  Grid,
  MouseHandler,
  HatchPattern
} from '../../../utils';
import { PreviewRect } from '../../../utils/entities/PreviewRect';
import { mapGetters, mapState } from 'vuex';

export default {
  name: 'PlanEditor',
  components: {
    ProjectLayout,
  },
  data() {
    return {
      grid: null,
      mouseHandler: null,
      canvas: null,
      ctx: null,
      virtualSize: 500000,
      previewRect: null,
      hatchPattern: null,
      pixelsPerCm: 1, // Масштаб: скільки пікселів у 1 см
      cellSize: 10,   // Розмір клітинки сітки
      isMouseOnCanvas: false,
    };
  },
  computed: {
    ...mapGetters('project', ['projectSettings']),
    ...mapState('editorTools', ['activeMode', 'activeTool']),
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
        if (this.previewRect) {
          // Оновлюємо розмір PreviewRect при зміні товщини стіни з урахуванням одиниць виміру
          const size = newValue * this.pixelsPerCm;
          this.previewRect.width = size;
          this.previewRect.height = size;
          this.previewRect.thickness = this.wallThickness; // Зберігаємо початкове значення товщини

          // Оновлюємо область підсвічування у HatchPattern
          if (this.previewRect.visible && this.hatchPattern) {
            const halfWidth = size / 2;
            const halfHeight = size / 2;

            this.hatchPattern.setHighlightArea(
                this.previewRect.x - halfWidth,
                this.previewRect.y - halfHeight,
                size,
                size
            );
          }

          if (this.mouseHandler) this.mouseHandler._redraw();
        }
      },
      immediate: true
    },
    // Слідкуємо за зміною одиниць виміру
    unit: {
      handler() {
        // Оновлюємо розмір PreviewRect при зміні одиниці виміру
        if (this.previewRect) {
          const size = this.wallThicknessInCm * this.pixelsPerCm;
          this.previewRect.width = size;
          this.previewRect.height = size;

          // Оновлюємо область підсвічування у HatchPattern
          if (this.previewRect.visible && this.hatchPattern) {
            const halfWidth = size / 2;
            const halfHeight = size / 2;

            this.hatchPattern.setHighlightArea(
                this.previewRect.x - halfWidth,
                this.previewRect.y - halfHeight,
                size,
                size
            );
          }

          if (this.mouseHandler) this.mouseHandler._redraw();
        }
      },
      immediate: true
    },
    // Слідкуємо за зміною активного інструменту
    isWallToolActive: {
      handler(isActive) {
        if (this.previewRect) {
          // Якщо інструмент "Стіна" активний, і миша на канвасі,
          // то показуємо PreviewRect, інакше приховуємо
          if (isActive && this.isMouseOnCanvas) {
            this.previewRect.show();
          } else {
            this.previewRect.hide();
          }

          if (this.mouseHandler) this.mouseHandler._redraw();
        }
      },
      immediate: true
    }
  },
  mounted() {
    this.initCanvas();
    window.addEventListener('resize', this.handleResize);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
    // Видаляємо обробники подій миші
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseenter', this.handleMouseEnter);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
  },
  methods: {
    initCanvas() {
      const canvas = this.$refs.canvas;
      const ctx = canvas.getContext('2d');

      // Встановлюємо фактичні розміри канвасу відповідно до розмірів контейнера
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;

      this.canvas = canvas;
      this.ctx = ctx;
      this.grid = new Grid();

      // Створюємо екземпляр HatchPattern з кращими параметрами для візуалізації
      this.hatchPattern = new HatchPattern('#555555', 1, 8, 0.4);

      // Створюємо екземпляр PreviewRect з товщиною стіни з Vuex і зв'язуємо з HatchPattern
      const thickness = this.wallThickness;
      this.previewRect = new PreviewRect(thickness, 'rgba(100, 100, 255, 0.5)', this.hatchPattern);

      // Встановлюємо розмір PreviewRect з урахуванням одиниці виміру
      const size = this.wallThicknessInCm * this.pixelsPerCm;
      this.previewRect.width = size;
      this.previewRect.height = size;

      // PreviewRect видимий тільки якщо інструмент "Стіна" активний і миша на канвасі
      this.previewRect.visible = this.isWallToolActive && this.isMouseOnCanvas;

      // Ініціалізуємо MouseHandler з функцією зворотного виклику для малювання
      this.mouseHandler = new MouseHandler(canvas, (ctx) => {
        ctx.clearRect(-this.virtualSize / 2, -this.virtualSize / 2, this.virtualSize, this.virtualSize);

        // Малюємо сітку
        this.grid.draw(ctx, this.virtualSize, this.virtualSize, -this.virtualSize / 2, -this.virtualSize / 2);

        // Малюємо заштриховку та PreviewRect
        if (this.isWallToolActive) {
          // Спочатку малюємо заштриховку (вона малюється тільки в межах PreviewRect)
          this.hatchPattern.draw(ctx, this.virtualSize, this.virtualSize, -this.virtualSize / 2, -this.virtualSize / 2);

          // Потім малюємо PreviewRect (його обводку)
          this.previewRect.draw(ctx, this.pixelsPerCm);
        }
      });

      // Додаємо обробники подій для PreviewRect
      canvas.addEventListener('mousemove', this.handleMouseMove);
      canvas.addEventListener('mouseenter', this.handleMouseEnter);
      canvas.addEventListener('mouseleave', this.handleMouseLeave);

      // Початкове малювання
      this.mouseHandler._redraw();
    },
    handleResize() {
      if (this.canvas) {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        // Оновити центр після зміни розміру
        if (this.mouseHandler) {
          this.mouseHandler.offsetX = this.canvas.width / 2;
          this.mouseHandler.offsetY = this.canvas.height / 2;
          this.mouseHandler._redraw();
        }
      }
    },
    handleMouseMove(e) {
      if (this.previewRect && this.isWallToolActive && this.isMouseOnCanvas) {
        // Перетворюємо координати миші з урахуванням масштабування та зміщення
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left);
        const mouseY = (e.clientY - rect.top);

        // Перетворення координат з екранних у світові
        const worldX = (mouseX - this.mouseHandler.offsetX) / this.mouseHandler.scale;
        const worldY = (mouseY - this.mouseHandler.offsetY) / this.mouseHandler.scale;

        // Оновлюємо позицію PreviewRect
        this.previewRect.updatePosition(worldX, worldY, this.cellSize);

        // Перемальовуємо канвас
        this.mouseHandler._redraw();
      }
    },
    handleMouseEnter() {
      this.isMouseOnCanvas = true;

      // Показуємо PreviewRect при наведенні миші на канвас, тільки якщо активний інструмент "Стіна"
      if (this.isWallToolActive) {
        this.previewRect.show();
        this.mouseHandler._redraw();
      }
    },
    handleMouseLeave() {
      this.isMouseOnCanvas = false;

      // Приховуємо PreviewRect, коли миша залишає канвас
      this.previewRect.hide();
      this.mouseHandler._redraw();
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