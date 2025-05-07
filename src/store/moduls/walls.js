// store/modules/walls.js
import {v4 as uuidv4} from 'uuid';

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

        set_default_thickness(state, thickness) {
            state.defaultThickness = thickness
        },
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

        updateDefaultThickness({commit}, thickness) {
            commit('set_default_thickness', thickness)
        },
    },

    getters: {
        defaultThickness: (state) => state.defaultThickness,
    }
};