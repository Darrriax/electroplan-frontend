// Vuex module for managing sockets
export default {
  namespaced: true,
  state: {
    defaultFloorHeight: 300, // 30cm in mm
    defaultDeviceType: 'regular', // Default device type
    sockets: []
  },
  mutations: {
    updateDefaultFloorHeight(state, height) {
      state.defaultFloorHeight = height;
    },
    updateDefaultDeviceType(state, deviceType) {
      state.defaultDeviceType = deviceType;
    },
    addSocket(state, socket) {
      // Ensure the socket has a deviceType, defaulting to the current default if not specified
      const socketWithDeviceType = {
        ...socket,
        deviceType: socket.deviceType || state.defaultDeviceType
      };
      state.sockets.push(socketWithDeviceType);
    },
    removeSocket(state, socketId) {
      state.sockets = state.sockets.filter(s => s.id !== socketId);
    },
    setSockets(state, sockets) {
      // Ensure all sockets have deviceType when setting them
      state.sockets = sockets.map(socket => ({
        ...socket,
        deviceType: socket.deviceType || state.defaultDeviceType
      }));
    },
    resetState(state) {
      state.sockets = [];
      state.defaultFloorHeight = 300;
      state.defaultDeviceType = 'regular';
    }
  },
  actions: {
    setDefaultFloorHeight({ commit }, height) {
      commit('updateDefaultFloorHeight', height);
    },
    setDefaultDeviceType({ commit }, deviceType) {
      commit('updateDefaultDeviceType', deviceType);
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
    getAllSockets: state => state.sockets,
    getDefaultDeviceType: state => state.defaultDeviceType
  }
}; 