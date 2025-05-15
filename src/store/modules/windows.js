// windows.js - Vuex module for window management
import { DEFAULT_WINDOW_CONFIG } from '../../utils/windows';

export const windows = {
    namespaced: true,
    
    state: {
        windows: [], // Array of placed windows
        currentConfig: { ...DEFAULT_WINDOW_CONFIG }, // Current window configuration
    },

    mutations: {
        updateConfig(state, config) {
            state.currentConfig = {
                ...state.currentConfig,
                ...config
            };
        },

        addWindow(state, window) {
            state.windows.push({
                id: `window_${Date.now()}`,
                ...state.currentConfig,
                ...window
            });
        },

        removeWindow(state, windowId) {
            state.windows = state.windows.filter(window => window.id !== windowId);
        },

        updateWindow(state, { id, updates }) {
            const windowIndex = state.windows.findIndex(window => window.id === id);
            if (windowIndex !== -1) {
                state.windows[windowIndex] = {
                    ...state.windows[windowIndex],
                    ...updates
                };
            }
        },

        updateWindows(state, windows) {
            state.windows = windows;
        }
    },

    getters: {
        getWindowById: (state) => (id) => {
            return state.windows.find(window => window.id === id);
        },

        getWindowsOnWall: (state) => (wallId) => {
            return state.windows.filter(window => window.wallId === wallId);
        }
    }
}; 