// Vuex module for managing switches
export default {
  namespaced: true,
  state: {
    defaultFloorHeight: 900, // 90cm in mm
    switches: []
  },
  mutations: {
    setDefaultFloorHeight(state, height) {
      state.defaultFloorHeight = height;
    },
    addSwitch(state, switchObj) {
      state.switches.push(switchObj);
    },
    removeSwitch(state, switchId) {
      state.switches = state.switches.filter(s => s.id !== switchId);
    }
  },
  actions: {
    setDefaultFloorHeight({ commit }, height) {
      commit('setDefaultFloorHeight', height);
    },
    addSwitch({ commit }, switchObj) {
      commit('addSwitch', switchObj);
    },
    removeSwitch({ commit }, switchId) {
      commit('removeSwitch', switchId);
    }
  },
  getters: {
    getAllSwitches: state => state.switches
  }
}; 