// Windows store module
export const windows = {
    namespaced: true,
    state: {
        defaultWidth: 1350, // 135cm in mm
        defaultHeight: 1350, // 135cm in mm
        defaultFloorHeight: 900, // 90cm in mm
        windows: []
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
        addWindow(state, window) {
            state.windows.push(window);
        },
        updateWindow(state, { id, updates }) {
            const index = state.windows.findIndex(window => window.id === id);
            if (index !== -1) {
                state.windows[index] = { ...state.windows[index], ...updates };
            }
        },
        addWindow(state, window) {
            state.windows.push(window);
        },
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
        },
        addWindow({ commit }, window) {
            commit('addWindow', window);
        },
    }
} 