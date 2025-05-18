// store/modules/project.js
export const project = {
    namespaced: true,
    state: {
        elements: [], // Contains other elements like doors, windows, etc.
        currentTool: null,
        currentMode: 'original-plan', // Current selected mode
        menuOpen: false,
        unit: 'cm',
        scale: 1, // 1 unit = 1 cm
        modes: {
            'original-plan': {
                name: 'Original Plan',
                tools: [
                    { id: 'wall', name: 'wall', label: 'Walls', icon: 'mdi mdi-wall' },
                    { id: 'door', name: 'door', label: 'Doors', icon: 'mdi mdi-door' },
                    { id: 'window', name: 'window', label: 'Windows', icon: 'mdi mdi-window-closed-variant' }
                ]
            },
            'power-sockets': {
                name: 'Power Sockets',
                tools: [
                    { id: 'socket', name: 'socket', label: 'Sockets', icon: 'mdi mdi-power-socket' },
                    { id: 'panel', name: 'panel', label: 'Electrical Panel', icon: 'mdi mdi-electric-switch' }
                ]
            },
            'light': {
                name: 'Light',
                tools: [
                    { id: 'ceiling-light', name: 'ceiling-light', label: 'Ceiling Light', icon: 'mdi mdi-ceiling-light' },
                    { id: 'wall-light', name: 'wall-light', label: 'Wall Light', icon: 'mdi mdi-wall-sconce' }
                ]
            },
            'switches': {
                name: 'Switches',
                tools: [
                    { id: 'single-switch', name: 'single-switch', label: 'Single-Key Switch', icon: 'mdi mdi-toggle-switch' },
                    { id: 'double-switch', name: 'double-switch', label: 'Double-Key Switch', icon: 'mdi mdi-toggle-switch-variant' }
                ]
            }
        }
    },
    mutations: {
        setCurrentTool(state, tool) {
            state.currentTool = tool;
        },
        setCurrentMode(state, mode) {
            state.currentMode = mode;
            // Automatically select the first tool of the new mode
            const currentModeTools = state.modes[mode]?.tools || [];
            state.currentTool = currentModeTools.length > 0 ? currentModeTools[0].name : null;
        },
        setWallThickness(state, thickness) {
            state.wallThickness = thickness;
        },
        setUnit(state, unit) {
            state.unit = unit;
        },
        toggleMenu(state) {
            state.menuOpen = !state.menuOpen;
        },
        setElements(state, elements) {
            // Filter out walls and rooms as they are now stored in their own modules
            state.elements = elements.filter(element => 
                element.type !== 'wall' && element.type !== 'room'
            );
        },
        addElement(state, element) {
            // Only add if not a wall or room
            if (element.type !== 'wall' && element.type !== 'room') {
                state.elements.push(element);
            }
        },
        updateElement(state, { id, updates }) {
            const index = state.elements.findIndex(element => element.id === id);
            if (index !== -1) {
                state.elements[index] = { ...state.elements[index], ...updates };
            }
        },
        removeElement(state, id) {
            state.elements = state.elements.filter(element => element.id !== id);
        }
    },
    actions: {
        setTool({ commit }, tool) {
            commit('setCurrentTool', tool);
        },
        setMode({ commit }, mode) {
            commit('setCurrentMode', mode);
        },
        updateWallThickness({ commit }, thickness) {
            commit('setWallThickness', thickness);
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
        }
    },
    getters: {
        getCurrentTool: state => state.currentTool,
        getCurrentMode: state => state.currentMode,
        getCurrentModeTools: state => state.modes[state.currentMode]?.tools || [],
        getWallThickness: state => state.wallThickness,
        getUnit: state => state.unit,
        isMenuOpen: state => state.menuOpen,
        getAllElements: state => state.elements,
        getDoors: state => state.elements.filter(el => el.type === 'door'),
        getWindows: state => state.elements.filter(el => el.type === 'window'),
        getBalconies: state => state.elements.filter(el => el.type === 'balcony')
    }
};