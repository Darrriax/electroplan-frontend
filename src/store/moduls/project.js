// store/modules/project.js
export const project = {
    namespaced: true,
    state: {
        rooms: [],
        elements: [], // Contains walls, rooms, and other elements
        currentTool: null,
        menuOpen: false,
        unit: 'cm',
        wallThickness: 100, // Default wall thickness in mm
        scale: 1, // 1 unit = 1 cm
    },
    mutations: {
        setCurrentTool(state, tool) {
            state.currentTool = tool;
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
        }
    },
    actions: {
        setTool({ commit }, tool) {
            commit('setCurrentTool', tool);
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
        }
    },
    getters: {
        getCurrentTool: state => state.currentTool,
        getWallThickness: state => state.wallThickness,
        getUnit: state => state.unit,
        isMenuOpen: state => state.menuOpen,
        getAllElements: state => state.elements,
        getWalls: state => state.elements.filter(el => el.type === 'wall'),
        getRooms: state => state.elements.filter(el => el.type === 'room'),
        getDoors: state => state.elements.filter(el => el.type === 'door'),
        getWindows: state => state.elements.filter(el => el.type === 'window'),
        getBalconies: state => state.elements.filter(el => el.type === 'balcony')
    }
};