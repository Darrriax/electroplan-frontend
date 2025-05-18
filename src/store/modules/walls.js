// store/modules/walls.js
import {v4 as uuidv4} from 'uuid';

export const walls = {
    namespaced: true,

    state: () => ({
        walls: [],
        defaultThickness: 100,
        defaultHeight: 2800,
        unit: 'mm'
    }),

    mutations: {
        setWalls(state, walls) {
            state.walls = walls;
        },

        addWall(state, wall) {
            const length = Math.sqrt(
                Math.pow(wall.end.x - wall.start.x, 2) +
                Math.pow(wall.end.y - wall.start.y, 2)
            ) * 10;

            state.walls.push({
                id: uuidv4(),
                ...wall,
                length,
                thickness: wall.thickness || state.defaultThickness,
                height: wall.height || state.defaultHeight,
                connectedWalls: []
            });
        },

        updateWall(state, { id, updates }) {
            const index = state.walls.findIndex(wall => wall.id === id);
            if (index !== -1) {
                const updatedWall = { ...state.walls[index], ...updates };
                // Recalculate length if position changed
                if (updates.start || updates.end) {
                    updatedWall.length = Math.sqrt(
                        Math.pow(updatedWall.end.x - updatedWall.start.x, 2) +
                        Math.pow(updatedWall.end.y - updatedWall.start.y, 2)
                    ) * 10;
                }
                state.walls[index] = updatedWall;
            }
        },

        updateDefaultThickness(state, thickness) {
            state.defaultThickness = thickness;
        },

        updateDefaultHeight(state, height) {
            state.defaultHeight = height;
        }
    },

    actions: {
        createWall({commit, state}, {start, end}) {
            const wall = {
                start,
                end,
                thickness: state.defaultThickness,
                height: state.defaultHeight
            };
            commit('addWall', wall);
            return wall;
        },

        updateWall({ commit }, { id, updates }) {
            commit('updateWall', { id, updates });
        },

        updateDefaultThickness({ commit }, thickness) {
            commit('updateDefaultThickness', thickness);
        },

        updateDefaultHeight({ commit }, height) {
            commit('updateDefaultHeight', height);
        },
    },

    getters: {
        defaultThickness: state => state.defaultThickness,
        defaultHeight: state => state.defaultHeight,
        getAllWalls: state => state.walls,
        getWallById: state => id => state.walls.find(wall => wall.id === id)
    }
};