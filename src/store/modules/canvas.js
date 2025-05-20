// Initial state
const state = {
  transform: {
    zoom: 1,
    panOffset: { x: 0, y: 0 }
  }
};

// Mutations
const mutations = {
  updateTransform(state, { zoom, panOffset }) {
    state.transform.zoom = zoom;
    state.transform.panOffset = panOffset;
  }
};

// Getters
const getters = {
  getTransform: state => state.transform
};

export default {
  namespaced: true,
  state,
  mutations,
  getters
}; 