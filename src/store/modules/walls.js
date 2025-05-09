// src/store/modules/walls.js
export const walls = {
    namespaced: true,
    state: () => ({
        walls: []
    }),
    mutations: {
        addWall(state, wall) {
            state.walls.push(wall);
        },
        updateWall(state, updated) {
            const index = state.walls.findIndex(w => w.id === updated.id);
            if (index !== -1) {
                state.walls.splice(index, 1, updated);
            }
        },
        removeWall(state, id) {
            state.walls = state.walls.filter(w => w.id !== id);
        },
        setWalls(state, walls) {
            state.walls = walls;
        }
    },
    getters: {
        allWalls: state => state.walls
    }
};