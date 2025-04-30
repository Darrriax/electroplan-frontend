// store/modules/walls.js
import { v4 as uuidv4 } from 'uuid';

export const walls = {
    namespaced: true,

    state: () => ({
        walls: [],
        defaultThickness: 200,
        defaultHeight: 2600,
        unit: 'mm'
    }),

    mutations: {
        addWall(state, wall) {
            state.walls.push({
                id: uuidv4(),
                ...wall,
                thickness: wall.thickness || state.defaultThickness,
                height: wall.height || state.defaultHeight,
                connectedWalls: []
            });
        },


        updateWall(state, { id, data }) {
            const index = state.walls.findIndex(w => w.id === id);
            if (index !== -1) {
                state.walls[index] = { ...state.walls[index], ...data };
            }
        },

        removeWall(state, id) {
            state.walls = state.walls.filter(w => w.id !== id);
        },

        updateAllWalls(state, updateFn) {
            state.walls = state.walls.map(wall => updateFn(wall));
        },

        setWalls(state, walls) {
            state.walls = walls;
        },

        clearWalls(state) {
            state.walls = [];
        },
        set_default_thickness(state, thickness) {
            state.defaultThickness = thickness
        },
    },

    actions: {
        createWall({ commit, state }, { start, end }) {
            const wall = {
                start,
                end,
                thickness: state.defaultThickness,
                height: state.defaultHeight
            };
            commit('addWall', wall);
            return wall;
        },

        updateWallProperties({ commit }, { id, properties }) {
            commit('updateWall', { id, data: properties });
        },

        deleteWall({ commit }, id) {
            commit('removeWall', id);
        },

        updateAllWallThickness({ commit, state }, thickness) {
            commit('updateAllWalls', wall => ({
                ...wall,
                thickness: thickness
            }));
        },

        updateAllWallHeight({ commit, state }, height) {
            commit('updateAllWalls', wall => ({
                ...wall,
                height: height
            }));
        },
        updateDefaultThickness({ commit }, thickness) {
            commit('set_default_thickness', thickness)
        },

        moveWall({ commit, state }, { id, deltaX, deltaY }) {
            const wall = state.walls.find(w => w.id === id);
            if (!wall) return;

            const newStart = {
                x: wall.start.x + deltaX,
                y: wall.start.y + deltaY
            };
            const newEnd = {
                x: wall.end.x + deltaX,
                y: wall.end.y + deltaY
            };

            commit('updateWall', {
                id,
                data: { start: newStart, end: newEnd }
            });
        },

        loadWallsFromJSON({ commit }, json) {
            try {
                const walls = JSON.parse(json);
                commit('setWalls', walls);
            } catch (e) {
                console.error("Помилка завантаження JSON:", e);
            }
        }
    },

    getters: {
        allWalls: (state) => state.walls,
        getWallById: (state) => (id) => state.walls.find(w => w.id === id),
        wallsAsJSON: (state) => JSON.stringify(state.walls, null, 2),
        defaultThickness: (state) => state.defaultThickness,
    }
};