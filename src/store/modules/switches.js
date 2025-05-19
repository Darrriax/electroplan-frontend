export const switches = {
  namespaced: true,
  state: {
    defaultFloorHeight: 900 // 90cm in mm
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