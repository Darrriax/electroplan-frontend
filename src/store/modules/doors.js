// doors.js - Vuex module for door management
import { DEFAULT_DOOR_CONFIG } from '../../utils/doors';

export const doors = {
    namespaced: true,
    
    state: {
        doors: [], // Array of placed doors
        currentConfig: { ...DEFAULT_DOOR_CONFIG }, // Current door configuration
    },

    mutations: {
        updateConfig(state, config) {
            state.currentConfig = {
                ...state.currentConfig,
                ...config
            };
        },

        addDoor(state, door) {
            state.doors.push({
                id: `door_${Date.now()}`,
                ...state.currentConfig,
                ...door
            });
        },

        removeDoor(state, doorId) {
            state.doors = state.doors.filter(door => door.id !== doorId);
        },

        updateDoor(state, { id, updates }) {
            const doorIndex = state.doors.findIndex(door => door.id === id);
            if (doorIndex !== -1) {
                state.doors[doorIndex] = {
                    ...state.doors[doorIndex],
                    ...updates
                };
            }
        },

        updateDoors(state, doors) {
            state.doors = doors;
        }
    },

    getters: {
        getDoorById: (state) => (id) => {
            return state.doors.find(door => door.id === id);
        },

        getDoorsOnWall: (state) => (wallId) => {
            return state.doors.filter(door => door.wallId === wallId);
        }
    }
}; 