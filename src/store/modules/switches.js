// Vuex module for managing switches
export default {
  namespaced: true,
  state: {
    defaultFloorHeight: 900, // 90cm in mm
    switches: [],
    hoveredSwitchIds: [] // Add hover state management
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
    },
    setHoveredSwitch(state, switchId) {
      state.hoveredSwitchIds = switchId ? [switchId] : [];
    },
    connectGroupToSwitch(state, { switchId, connectionNumber, groupId, groupData }) {
      const switchObj = state.switches.find(s => s.id === switchId);
      if (!switchObj) return;

      if (switchObj.type === 'single-switch') {
        switchObj.connectedGroup = { ...groupData };
      } else if (switchObj.type === 'double-switch') {
        if (connectionNumber === 1) {
          switchObj.connectedGroup1 = { ...groupData };
        } else if (connectionNumber === 2) {
          switchObj.connectedGroup2 = { ...groupData };
        }
      }
    },
    disconnectGroupFromSwitch(state, { switchId, connectionNumber }) {
      const switchObj = state.switches.find(s => s.id === switchId);
      if (!switchObj) return;

      if (switchObj.type === 'single-switch') {
        switchObj.connectedGroup = null;
      } else if (switchObj.type === 'double-switch') {
        if (connectionNumber === 1) {
          switchObj.connectedGroup1 = null;
        } else if (connectionNumber === 2) {
          switchObj.connectedGroup2 = null;
        }
      }
    },
    updateSwitch(state, updatedSwitch) {
      const index = state.switches.findIndex(s => s.id === updatedSwitch.id);
      if (index !== -1) {
        state.switches.splice(index, 1, updatedSwitch);
      }
    },
    setSwitches(state, switches) {
      state.switches = switches;
    },
    resetState(state) {
      state.switches = [];
      state.defaultFloorHeight = 900;
    }
  },
  actions: {
    setDefaultFloorHeight({ commit }, height) {
      commit('setDefaultFloorHeight', height);
    },
    addSwitch({ commit, dispatch }, switchObj) {
      commit('addSwitch', switchObj);
      dispatch('notifyProjectModule');
    },
    removeSwitch({ commit, dispatch }, switchId) {
      commit('removeSwitch', switchId);
      dispatch('notifyProjectModule');
    },
    async connectGroupToSwitch({ commit, dispatch }, { switchId, connectionNumber, groupId, groupData }) {
      // First disconnect any existing connections to this group
      await dispatch('disconnectGroupFromAllSwitches', groupId);
      
      // Then make the new connection with the full group data
      commit('connectGroupToSwitch', { switchId, connectionNumber, groupId, groupData });
      dispatch('notifyProjectModule');
    },
    disconnectGroupFromSwitch({ commit, dispatch }, { switchId, connectionNumber }) {
      commit('disconnectGroupFromSwitch', { switchId, connectionNumber });
      dispatch('notifyProjectModule');
    },
    async disconnectGroupFromAllSwitches({ state, commit, dispatch }, groupId) {
      state.switches.forEach(switchObj => {
        if (switchObj.type === 'single-switch' && switchObj.connectedGroup?.id === groupId) {
          commit('disconnectGroupFromSwitch', { switchId: switchObj.id, connectionNumber: 1 });
        } else if (switchObj.type === 'double-switch') {
          if (switchObj.connectedGroup1?.id === groupId) {
            commit('disconnectGroupFromSwitch', { switchId: switchObj.id, connectionNumber: 1 });
          }
          if (switchObj.connectedGroup2?.id === groupId) {
            commit('disconnectGroupFromSwitch', { switchId: switchObj.id, connectionNumber: 2 });
          }
        }
      });
      dispatch('notifyProjectModule');
    },
    setSwitches({ commit, dispatch }, switches) {
      commit('setSwitches', switches);
      dispatch('notifyProjectModule');
    },
    resetState({ commit }) {
      commit('resetState');
    },
    // Action to notify project module of changes
    notifyProjectModule({ state, dispatch }) {
      dispatch('project/updateFromModule', {
        type: 'switches',
        elements: { switches: state.switches }
      }, { root: true });
    }
  },
  getters: {
    getAllSwitches: state => state.switches,
    getHoveredSwitchIds: state => state.hoveredSwitchIds,
    getSwitchById: state => id => state.switches.find(s => s.id === id),
    getSingleSwitches: state => state.switches.filter(s => s.type === 'single-switch'),
    getDoubleSwitches: state => state.switches.filter(s => s.type === 'double-switch'),
    getConnectedGroups: state => switchId => {
      const switchObj = state.switches.find(s => s.id === switchId);
      if (!switchObj) return [];
      
      if (switchObj.type === 'single-switch') {
        return switchObj.connectedGroup ? [switchObj.connectedGroup] : [];
      } else if (switchObj.type === 'double-switch') {
        return [
          switchObj.connectedGroup1,
          switchObj.connectedGroup2
        ].filter(Boolean);
      }
      return [];
    },
    switches: state => state.switches
  }
}; 