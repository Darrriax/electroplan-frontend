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
    },
    setSockets(state, sockets) {
      state.sockets = sockets;
    },
    resetState(state) {
      state.sockets = [];
      state.defaultFloorHeight = 300;
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
    setSockets({ commit, dispatch }, sockets) {
      commit('setSockets', sockets);
      dispatch('notifyProjectModule');
    },
    resetState({ commit }) {
      commit('resetState');
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