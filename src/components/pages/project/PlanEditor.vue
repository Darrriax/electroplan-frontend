<template>
  <project-layout>
    <div class="plan-editor">
      <canvas ref="canvas" class="grid-canvas"></canvas>
    </div>
  </project-layout>
</template>

<script>
import ProjectLayout from '../../UI/layouts/ProjectLayout.vue';
import {
  Grid,
  MouseHandler
} from '../../../utils';


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
    };
  },
  mounted() {
    this.initCanvas();
    window.addEventListener('resize', this.handleResize);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
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

      // Ініціалізуємо MouseHandler з функцією зворотного виклику для малювання сітки
      this.mouseHandler = new MouseHandler(canvas, (ctx) => {
        ctx.clearRect(-this.virtualSize / 2, -this.virtualSize / 2, this.virtualSize, this.virtualSize);
        this.grid.draw(ctx, this.virtualSize, this.virtualSize, -this.virtualSize / 2, -this.virtualSize / 2);
      });

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