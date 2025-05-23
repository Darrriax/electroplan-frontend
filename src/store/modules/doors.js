// store/modules/doors.js
export const doors = {
  namespaced: true,
  state: {
    defaultWidth: 800, // 80 cm in mm
    defaultHeight: 2000, // 200 cm in mm
    defaultOpeningDirection: 'left',
    defaultOpeningSide: 'inside',
    doors: [] // Array to store placed doors
  },
  mutations: {
    setDefaultWidth(state, width) {
      state.defaultWidth = width;
    },
    resetState(state) {
      state.defaultWidth = 800;
      state.defaultHeight = 2000;
      state.defaultOpeningDirection = 'left';
      state.defaultOpeningSide = 'inside';
      state.doors = [];
    },
    setDefaultHeight(state, height) {
      state.defaultHeight = height;
    },
    setDefaultOpeningDirection(state, direction) {
      state.defaultOpeningDirection = direction;
    },
    setDefaultOpeningSide(state, side) {
      state.defaultOpeningSide = side;
    },
    addDoor(state, door) {
      state.doors.push(door);
    },
    setDoors(state, doors) {
      state.doors = doors;
    }
  },
  actions: {
    updateDefaultWidth({ commit }, width) {
      commit('setDefaultWidth', width);
    },
    updateDefaultHeight({ commit }, height) {
      commit('setDefaultHeight', height);
    },
    updateDefaultOpeningDirection({ commit }, direction) {
      commit('setDefaultOpeningDirection', direction);
    },
    updateDefaultOpeningSide({ commit }, side) {
      commit('setDefaultOpeningSide', side);
    },
    addDoor({ commit, dispatch }, door) {
      commit('addDoor', door);
      // Notify project module of the change
      dispatch('notifyProjectModule');
    },
    setDoors({ commit, dispatch }, doors) {
      commit('setDoors', doors);
      dispatch('notifyProjectModule');
    },
    // Action to notify project module of changes
    notifyProjectModule({ state, dispatch }) {
      dispatch('project/updateFromModule', {
        type: 'doors',
        elements: state.doors
      }, { root: true });
    },
    resetState({ commit }) {
      commit('resetState');
    }
  },
  getters: {
    defaultWidth: state => state.defaultWidth,
    defaultHeight: state => state.defaultHeight,
    defaultOpeningDirection: state => state.defaultOpeningDirection,
    defaultOpeningSide: state => state.defaultOpeningSide,
    doors: state => state.doors
  }
}; 