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
        },

        removeWall(state, id) {
            state.walls = state.walls.filter(wall => wall.id !== id);
        }
    },

    actions: {
        createWall({commit, state, dispatch}, {start, end}) {
            const wall = {
                start,
                end,
                thickness: state.defaultThickness,
                height: state.defaultHeight
            };
            commit('addWall', wall);
            // Notify project module of the change
            dispatch('notifyProjectModule');
            return wall;
        },

        updateWall({ commit, dispatch }, { id, updates }) {
            commit('updateWall', { id, updates });
            // Notify project module of the change
            dispatch('notifyProjectModule');
        },

        updateDefaultThickness({ commit }, thickness) {
            commit('updateDefaultThickness', thickness);
        },

        updateDefaultHeight({ commit }, height) {
            commit('updateDefaultHeight', height);
        },

        addWall({ commit, dispatch }, wall) {
            commit('addWall', wall);
            // Notify project module of the change
            dispatch('notifyProjectModule');
        },

        removeWall({ commit, dispatch }, id) {
            commit('removeWall', id);
            // Notify project module of the change
            dispatch('notifyProjectModule');
        },

        setWalls({ commit, dispatch }, walls) {
            commit('setWalls', walls);
            // Notify project module of the change
            dispatch('notifyProjectModule');
        },

        // Action to notify project module of changes
        notifyProjectModule({ state, dispatch }) {
            dispatch('project/updateFromModule', {
                type: 'walls',
                elements: state.walls
            }, { root: true });
        }
    },

    getters: {
        defaultThickness: state => state.defaultThickness,
        defaultHeight: state => state.defaultHeight,
        getAllWalls: state => state.walls,
        getWallById: state => id => state.walls.find(wall => wall.id === id)
    }
};