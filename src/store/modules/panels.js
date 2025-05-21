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
        addPanel({ commit, dispatch }, panel) {
            commit('addPanel', panel);
            dispatch('notifyProjectModule');
        },
        removePanel({ commit, dispatch }, panelId) {
            commit('removePanel', panelId);
            dispatch('notifyProjectModule');
        },
        // Action to notify project module of changes
        notifyProjectModule({ state, dispatch }) {
            dispatch('project/updateFromModule', {
                type: 'panels',
                elements: state.panels
            }, { root: true });
        }
    },
    getters: {
        getAllPanels: state => state.panels
    }
} 