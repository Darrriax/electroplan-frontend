export const walls = {
    namespaced: true,
    state: () => ({
        walls: []
    }),
    mutations: {
        addWall(state, wall) { state.walls.push(wall) },
        updateWall(state, updated) { /* ... */ },
        removeWall(state, id) { /* ... */ }
    }
}