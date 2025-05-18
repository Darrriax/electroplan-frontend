// store/modules/doors.js
export const doors = {
  namespaced: true,
  state: {
    defaultWidth: 800, // 80 cm in mm
    defaultHeight: 2000, // 200 cm in mm
    defaultOpeningDirection: 'left',
    defaultOpeningSide: 'inside'
  },
  mutations: {
    setDefaultWidth(state, width) {
      state.defaultWidth = width;
    },
    setDefaultHeight(state, height) {
      state.defaultHeight = height;
    },
    setDefaultOpeningDirection(state, direction) {
      state.defaultOpeningDirection = direction;
    },
    setDefaultOpeningSide(state, side) {
      state.defaultOpeningSide = side;
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
    }
  },
  getters: {
    defaultWidth: state => state.defaultWidth,
    defaultHeight: state => state.defaultHeight,
    defaultOpeningDirection: state => state.defaultOpeningDirection,
    defaultOpeningSide: state => state.defaultOpeningSide
  }
}; 