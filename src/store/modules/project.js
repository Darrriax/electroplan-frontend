// store/modules/project.js
import { convertToMM } from '../../utils/unitConversion';

export const project = {
    namespaced: true,
    state: {
        rooms: [],
        elements: [], // Contains rooms and other elements (except walls, which are now in walls store)
        currentTool: null,
        menuOpen: false,
        unit: 'cm',
        scale: 1, // 1 unit = 1 cm
        activeMode: 'original-plan', // Default mode
        modes: {
            'original-plan': {
                label: 'Original Plan',
                icon: 'fa-solid fa-layer-group',
                tools: [
                    { name: 'wall', label: 'Wall', icon: 'fa-solid fa-grip-lines-vertical' },
                    { name: 'door', label: 'Door', icon: 'fa-solid fa-door-open' },
                    { name: 'window', label: 'Windows', icon: 'fa-solid fa-window-maximize' }
                ]
            },
            'power-sockets': {
                label: 'Power Sockets',
                icon: 'fa-solid fa-plug',
                tools: [
                    { name: 'standard-socket', label: 'Sockets', icon: 'fa-solid fa-plug' },
                    { name: 'switchboard', label: 'Electrical switchboard', icon: 'fa-solid fa-solar-panel' }
                ]
            },
            'lighting': {
                label: 'Lighting',
                icon: 'fa-solid fa-lightbulb',
                tools: [
                    { name: 'ceiling-light', label: 'Ceiling light', icon: 'fa-solid fa-lightbulb' },
                    { name: 'wall-light', label: 'Wall light', icon: 'fa-solid fa-lightbulb' }
                ]
            },
            'switches': {
                label: 'Switches',
                icon: 'fa-solid fa-toggle-on',
                tools: [
                    { name: 'single-switch', label: 'Single switch', icon: 'fa-solid fa-toggle-on' },
                    { name: 'double-switch', label: 'Double switch', icon: 'fa-solid fa-toggle-on' },
                    { name: 'triple-switch', label: 'Triple switch', icon: 'fa-solid fa-toggle-on' }
                ]
            }
        }
    },
    mutations: {
        setCurrentTool(state, tool) {
            state.currentTool = tool;
        },
        setUnit(state, unit) {
            state.unit = unit;
        },
        toggleMenu(state) {
            state.menuOpen = !state.menuOpen;
        },
        setElements(state, elements) {
            state.elements = elements;
        },
        addElement(state, element) {
            state.elements.push(element);
        },
        updateElement(state, { id, updates }) {
            const index = state.elements.findIndex(element => element.id === id);
            if (index !== -1) {
                state.elements[index] = { ...state.elements[index], ...updates };
            }
        },
        removeElement(state, id) {
            state.elements = state.elements.filter(element => element.id !== id);
        },
        addRoom(state, room) {
            state.rooms.push(room);
        },
        updateRoom(state, { id, updates }) {
            const index = state.rooms.findIndex(room => room.id === id);
            if (index !== -1) {
                state.rooms[index] = { ...state.rooms[index], ...updates };
            }
        },
        removeRoom(state, id) {
            state.rooms = state.rooms.filter(room => room.id !== id);
        },
        setActiveMode(state, mode) {
            state.activeMode = mode;
        }
    },
    actions: {
        setTool({ commit }, tool) {
            commit('setCurrentTool', tool);
        },
        changeUnit({ commit }, unit) {
            commit('setUnit', unit);
        },
        toggleSidebar({ commit }) {
            commit('toggleMenu');
        },
        saveElements({ commit }, elements) {
            commit('setElements', elements);
        },
        addElement({ commit }, element) {
            commit('addElement', element);
        },
        updateElement({ commit }, { id, updates }) {
            commit('updateElement', { id, updates });
        },
        removeElement({ commit }, id) {
            commit('removeElement', id);
        },
        // Room management
        createRoom({ commit }, room) {
            commit('addRoom', room);
        },
        updateRoom({ commit }, { id, updates }) {
            commit('updateRoom', { id, updates });
        },
        deleteRoom({ commit }, id) {
            commit('removeRoom', id);
        },
        updateUnit({ commit, state }, newUnit) {
            commit('setUnit', newUnit);
        },
        setMode({ commit }, mode) {
            commit('setActiveMode', mode);
        }
    },
    getters: {
        getCurrentTool: state => state.currentTool,
        getUnit: state => state.unit,
        isMenuOpen: state => state.menuOpen,
        getAllElements: state => state.elements,
        getRooms: state => state.elements.filter(el => el.type === 'room'),
        getDoors: state => state.elements.filter(el => el.type === 'door'),
        getWindows: state => state.elements.filter(el => el.type === 'window'),
        getBalconies: state => state.elements.filter(el => el.type === 'balcony'),
        currentMode: state => state.activeMode,
        currentTools: state => state.modes[state.activeMode]?.tools || [],
        isActiveMode: state => mode => state.activeMode === mode
    }
};