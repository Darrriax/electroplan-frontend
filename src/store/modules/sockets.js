// Vuex module for managing sockets
export default {
  namespaced: true,
  state: {
    defaultFloorHeight: 300, // 30cm in mm
    sockets: []
  },
  mutations: {
    updateDefaultFloorHeight(state, height) {
      state.defaultFloorHeight = height;
    },
    addSocket(state, socket) {
      state.sockets.push(socket);
    },
    removeSocket(state, socketId) {
      state.sockets = state.sockets.filter(s => s.id !== socketId);
    }
  },
  actions: {
    setDefaultFloorHeight({ commit }, height) {
      commit('updateDefaultFloorHeight', height);
    },
    addSocket({ commit }, socket) {
      commit('addSocket', socket);
    },
    removeSocket({ commit }, socketId) {
      commit('removeSocket', socketId);
    }
  },
  getters: {
    getAllSockets: state => state.sockets
  }
}; 