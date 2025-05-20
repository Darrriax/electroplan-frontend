export default {
    namespaced: true,
    state: {
        defaultFloorHeight: 2200,
        ceilingLights: [],
        wallLights: []
    },
    mutations: {
        setDefaultFloorHeight(state, height) {
            state.defaultFloorHeight = height;
        },
        addCeilingLight(state, light) {
            state.ceilingLights.push(light);
        },
        addWallLight(state, light) {
            state.wallLights.push(light);
        },
        removeCeilingLight(state, lightId) {
            state.ceilingLights = state.ceilingLights.filter(l => l.id !== lightId);
        },
        removeWallLight(state, lightId) {
            state.wallLights = state.wallLights.filter(l => l.id !== lightId);
        }
    },
    actions: {
        setDefaultFloorHeight({ commit }, height) {
            commit('setDefaultFloorHeight', height);
        },
        addCeilingLight({ commit }, light) {
            commit('addCeilingLight', light);
        },
        addWallLight({ commit }, light) {
            commit('addWallLight', light);
        },
        removeCeilingLight({ commit }, lightId) {
            commit('removeCeilingLight', lightId);
        },
        removeWallLight({ commit }, lightId) {
            commit('removeWallLight', lightId);
        }
    },
    getters: {
        getAllCeilingLights: state => state.ceilingLights,
        getAllWallLights: state => state.wallLights
    }
}; 