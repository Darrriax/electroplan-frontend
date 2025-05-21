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
    addSocket({ commit, dispatch }, socket) {
      commit('addSocket', socket);
      dispatch('notifyProjectModule');
    },
    removeSocket({ commit, dispatch }, socketId) {
      commit('removeSocket', socketId);
      dispatch('notifyProjectModule');
    },
    // Action to notify project module of changes
    notifyProjectModule({ state, dispatch }) {
      dispatch('project/updateFromModule', {
        type: 'sockets',
        elements: state.sockets
      }, { root: true });
    }
  },
  getters: {
    getAllSockets: state => state.sockets
  }
}; 