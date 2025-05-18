// Panels store module
export const panels = {
    namespaced: true,
    state: {
        defaultWidth: 300, // 30cm in mm
        defaultHeight: 210, // 21cm in mm
        defaultFloorHeight: 1200, // 120cm in mm
        panels: []
    },
    mutations: {
        updateDefaultWidth(state, width) {
            state.defaultWidth = width;
        },
        updateDefaultHeight(state, height) {
            state.defaultHeight = height;
        },
        updateDefaultFloorHeight(state, height) {
            state.defaultFloorHeight = height;
        },
        addPanel(state, panel) {
            state.panels.push(panel);
        },
        updatePanel(state, { id, updates }) {
            const index = state.panels.findIndex(panel => panel.id === id);
            if (index !== -1) {
                state.panels[index] = { ...state.panels[index], ...updates };
            }
        },
        removePanel(state, id) {
            state.panels = state.panels.filter(panel => panel.id !== id);
        }
    },
    actions: {
        setDefaultWidth({ commit }, width) {
            commit('updateDefaultWidth', width);
        },
        setDefaultHeight({ commit }, height) {
            commit('updateDefaultHeight', height);
        },
        setDefaultFloorHeight({ commit }, height) {
            commit('updateDefaultFloorHeight', height);
        }
    }
} 