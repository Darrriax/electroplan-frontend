// store/modules/project.js
export const project = {
    namespaced: true,
    state: {
        walls: [], // масив обʼєктів стін
        rooms: [], // опційно
        elements: [],
        currentTool: null,
        menuOpen: false,
        unit: 'cm',
    },
    mutations: {
        setWallThickness(state, thickness) {
            state.wallThickness = thickness
        },
        addWall(state, wall) {
            state.walls.push(wall)
        },
        updateWall(state, { id, data }) {
            const wall = state.walls.find(w => w.id === id);
            if (wall) Object.assign(wall, data);
        },
        removeWall(state, id) {
            state.walls = state.walls.filter(w => w.id !== id);
        },
        setUnit(state, unit) {
            state.unit = unit
        },
        toggleMenu(state) {
            state.menuOpen = !state.menuOpen
        }
    },
    getters: {
        unit: state => state.unit
    }
}