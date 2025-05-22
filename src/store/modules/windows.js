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
        setDefaultWidth(state, width) {
            state.defaultWidth = width;
        },
        setDefaultHeight(state, height) {
            state.defaultHeight = height;
        },
        setDefaultFloorHeight(state, height) {
            state.defaultFloorHeight = height;
        },
        addWindow(state, window) {
            state.windows.push(window);
        },
        setWindows(state, windows) {
            state.windows = windows;
        },
        updateWindow(state, { id, updates }) {
            const index = state.windows.findIndex(window => window.id === id);
            if (index !== -1) {
                state.windows[index] = { ...state.windows[index], ...updates };
            }
        },
        resetState(state) {
            state.defaultWidth = 1000;
            state.defaultHeight = 1200;
            state.defaultFloorHeight = 900;
            state.windows = [];
        }
    },
    actions: {
        updateDefaultWidth({ commit }, width) {
            commit('setDefaultWidth', width);
        },
        updateDefaultHeight({ commit }, height) {
            commit('setDefaultHeight', height);
        },
        updateDefaultFloorHeight({ commit }, height) {
            commit('setDefaultFloorHeight', height);
        },
        addWindow({ commit, dispatch }, window) {
            commit('addWindow', window);
            dispatch('notifyProjectModule');
        },
        setWindows({ commit, dispatch }, windows) {
            commit('setWindows', windows);
            dispatch('notifyProjectModule');
        },
        updateWindow({ commit, dispatch }, payload) {
            commit('updateWindow', payload);
            dispatch('notifyProjectModule');
        },
        // Action to notify project module of changes
        notifyProjectModule({ state, dispatch }) {
            dispatch('project/updateFromModule', {
                type: 'windows',
                elements: state.windows
            }, { root: true });
        },
        resetState({ commit }) {
            commit('resetState');
        }
    }
} 