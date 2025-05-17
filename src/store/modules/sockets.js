export const sockets = {
    namespaced: true,
    state: {
        sockets: [], // List of placed sockets
        currentConfig: {
            type: 'standard', // 'standard' or 'waterproof'
            size: 80, // 8cm = 80mm
            heightFromFloor: 300 // Default height from floor in mm (30cm)
        }
    },
    mutations: {
        addSocket(state, socket) {
            state.sockets.push({
                ...socket,
                id: Date.now().toString()
            });
        },
        updateSocket(state, { id, updates }) {
            const index = state.sockets.findIndex(socket => socket.id === id);
            if (index !== -1) {
                state.sockets[index] = { ...state.sockets[index], ...updates };
            }
        },
        removeSocket(state, id) {
            state.sockets = state.sockets.filter(socket => socket.id !== id);
        },
        setSocketType(state, type) {
            state.currentConfig.type = type;
        },
        updateConfig(state, config) {
            state.currentConfig = { ...state.currentConfig, ...config };
        }
    },
    actions: {
        createSocket({ commit, state }, socketData) {
            // Create a new socket with current config and provided data
            const newSocket = {
                ...socketData,
                type: state.currentConfig.type,
                heightFromFloor: state.currentConfig.heightFromFloor,
                size: state.currentConfig.size
            };
            commit('addSocket', newSocket);
        },
        updateSocket({ commit }, { id, updates }) {
            commit('updateSocket', { id, updates });
        },
        deleteSocket({ commit }, id) {
            commit('removeSocket', id);
        },
        setType({ commit }, type) {
            commit('setSocketType', type);
        }
    },
    getters: {
        getAllSockets: state => state.sockets,
        getSocketsByType: state => type => state.sockets.filter(socket => socket.type === type),
        getCurrentConfig: state => state.currentConfig
    }
}; 