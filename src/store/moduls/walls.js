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
        setDefaultThickness(state, thickness) {
            state.defaultThickness = thickness
        }
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
        updateDefaultThickness({ commit }, thickness) {
            commit('setDefaultThickness', thickness)
        }

    },

    getters: {
        defaultThickness: (state) => state.defaultThickness,
    }
};