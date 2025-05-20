// Panels store module
export default {
    namespaced: true,
    state: {
        defaultWidth: 300, // 30cm in mm
        defaultHeight: 210, // 21cm in mm
        defaultFloorHeight: 1200, // 120cm in mm
        panels: []
    },
    mutations: {
        setDefaultWidth(state, width) {
            state.defaultWidth = width;
        },
        setDefaultHeight(state, height) {
            state.defaultHeight = height;
        },
        setDefaultFloorHeight(state, height) {
            state.defaultFloorHeight = height;
        },
        addPanel(state, panel) {
            state.panels.push(panel);
        },
        removePanel(state, panelId) {
            state.panels = state.panels.filter(p => p.id !== panelId);
        }
    },
    actions: {
        setDefaultWidth({ commit }, width) {
            commit('setDefaultWidth', width);
        },
        setDefaultHeight({ commit }, height) {
            commit('setDefaultHeight', height);
        },
        setDefaultFloorHeight({ commit }, height) {
            commit('setDefaultFloorHeight', height);
        },
        addPanel({ commit }, panel) {
            commit('addPanel', panel);
        },
        removePanel({ commit }, panelId) {
            commit('removePanel', panelId);
        }
    },
    getters: {
        getAllPanels: state => state.panels
    }
} 