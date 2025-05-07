// store/modules/project.js
export const project = {
    namespaced: true,
    state: {
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