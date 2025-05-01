// mixins/canvasMixin.js

import { fabric } from 'fabric';
import { Grid } from '../utils/canvas/Grid';
import { PreviewRect } from '../utils/canvas/PreviewRect';
import { WallManager } from '../utils/canvas/WallManager';
import { createWallPattern } from '../utils/patternUtils';
import {WallSnapManager} from "../utils/canvas/WallSnapManager.js";

export default {
    data() {
        return {
            canvas: null,         // Fabric.js канвас
            grid: null,           // Сітка
            previewRect: null,    // Прямокутник попереднього перегляду
            wallManager: null,    // Менеджер стін
            snapManager: null     // Менеджер прилипання
        };
    },

    methods: {
        /**
         * Ініціалізує FabricJS канвас, сітку, менеджер стін та попередній перегляд.
         */
        initCanvas() {
            const container = this.$refs.canvas.parentElement;

            // Ініціалізація канвасу
            this.canvas = new fabric.Canvas(this.$refs.canvas, {
                width: container.clientWidth,
                height: container.clientHeight,
                backgroundColor: '#f5f5f5',
                selection: false
            });

            // Ініціалізація сітки
            this.grid = new Grid(this.canvas);
            this.grid.setupGrid();

            // Ініціалізація прямокутника попереднього перегляду
            this.previewRect = new PreviewRect(this.canvas, {
                initialSize: this.wallThickness / 10,
                pattern: createWallPattern()
            });

            // Ініціалізація менеджера прилипання до стін
            this.snapManager = new WallSnapManager(this.canvas, {
                store: this.$store
            });

            // Ініціалізація менеджера стін з врахуванням товщини та прилипання
            this.wallManager = new WallManager(this.canvas, {
                getThickness: () => this.wallThickness,
                snapManager: this.snapManager,
                previewRect: this.previewRect,
                store: this.$store // ← передаємо Vuex store
            });
        }
    },

    beforeDestroy() {
        // Очищення канвасу при знищенні компонента
        if (this.canvas) {
            this.canvas.dispose();
        }
    }
};