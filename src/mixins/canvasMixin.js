// mixins/canvasMixin.js

import { fabric } from 'fabric';
import { Grid } from '../utils/canvas/Grid';
import { PreviewRect } from '../utils/canvas/PreviewRect';
import { WallManager } from '../utils/canvas/WallManager';
import { WallSnapManager } from "../utils/canvas/WallSnapManager.js";
import { WallDimensions } from "../utils/canvas/WallDimensions.js";
import { RoomManager } from "../utils/canvas/RoomManager.js";
import { createWallPattern } from '../utils/patternUtils';

export default {
    data() {
        return {
            canvas: null,
            grid: null,
            previewRect: null,
            wallManager: null,
            snapManager: null,
            wallDimensions: null,
            roomManager: null
        };
    },

    methods: {
        /**
         * Ініціалізує FabricJS канвас, сітку, менеджер стін та попередній перегляд.
         */
        initCanvas() {
            const container = this.$refs.canvas.parentElement;

            // Initialize canvas
            this.canvas = new fabric.Canvas(this.$refs.canvas, {
                width: container.clientWidth,
                height: container.clientHeight,
                backgroundColor: '#f5f5f5',
                selection: false
            });

            // Initialize grid
            this.grid = new Grid(this.canvas);
            this.grid.setupGrid();

            // Initialize snap manager first
            this.snapManager = new WallSnapManager(this.canvas, {
                store: this.$store
            });

            // Initialize preview rect with snap manager
            this.previewRect = new PreviewRect(this.canvas, {
                initialSize: this.wallThickness / 10,
                pattern: createWallPattern(),
                snapManager: this.snapManager // Pass snap manager
            });

            // Initialize room manager before wall manager
            this.roomManager = new RoomManager(this.canvas, this.$store);

            // Initialize wall manager with all dependencies including room manager
            this.wallManager = new WallManager(this.canvas, {
                getThickness: () => this.wallThickness,
                snapManager: this.snapManager,
                previewRect: this.previewRect,
                roomManager: this.roomManager,
                store: this.$store
            });

            this.wallDimensions = new WallDimensions(this.canvas, this.$store);

            // Load any existing walls and detect rooms
            this.$nextTick(() => {
                if (this.roomManager && this.$store.state.walls.walls.length > 0) {
                    this.roomManager.renderRooms();
                }
            });
        }
    },

    beforeDestroy() {
        // Cleanup canvas when component is destroyed
        if (this.canvas) {
            this.canvas.dispose();
        }
    }
};