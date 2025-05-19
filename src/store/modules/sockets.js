export const sockets = {
  namespaced: true,
  state: {
    defaultFloorHeight: 300 // 30cm in mm
  },
  mutations: {
    updateDefaultFloorHeight(state, height) {
      state.defaultFloorHeight = height;
    }
  },
  actions: {
    setDefaultFloorHeight({ commit }, height) {
      commit('updateDefaultFloorHeight', height);
    }
  }
}; 