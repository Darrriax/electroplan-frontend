// lamps.js - Store module for wall-mounted lamps
export const lamps = {
    namespaced: true,
    state: {
        objects: [], // List of placed lamps
        currentConfig: {
            type: 'wall-light', // 'wall-light', 'sconce', 'spotlight'
            size: 200, // 20cm = 200mm
            heightFromFloor: 1800, // Default height from floor in mm (180cm)
            wallSide: 1 // 1 for top/right side, -1 for bottom/left side
        }
    },
    mutations: {
        addObject(state, object) {
            state.objects.push({
                ...object,
                id: Date.now().toString()
            });
        },
        updateObjects(state, objects) {
            state.objects = objects;
        },
        updateObject(state, { id, updates }) {
            const index = state.objects.findIndex(obj => obj.id === id);
            if (index !== -1) {
                state.objects[index] = { ...state.objects[index], ...updates };
            }
        },
        removeObject(state, id) {
            state.objects = state.objects.filter(obj => obj.id !== id);
        },
        setObjectType(state, type) {
            state.currentConfig.type = type;
        },
        setWallSide(state, side) {
            state.currentConfig.wallSide = side;
        },
        updateConfig(state, config) {
            state.currentConfig = { ...state.currentConfig, ...config };
        }
    },
    actions: {
        createObject({ commit, state }, objectData) {
            // Create a new object with current config and provided data
            const newObject = {
                ...objectData,
                type: state.currentConfig.type,
                heightFromFloor: state.currentConfig.heightFromFloor,
                size: state.currentConfig.size,
                wallSide: state.currentConfig.wallSide
            };
            commit('addObject', newObject);
        },
        updateObject({ commit }, { id, updates }) {
            commit('updateObject', { id, updates });
        },
        deleteObject({ commit }, id) {
            commit('removeObject', id);
        },
        setType({ commit }, type) {
            commit('setObjectType', type);
        },
        setWallSide({ commit }, side) {
            commit('setWallSide', side);
        }
    },
    getters: {
        getAllObjects: state => state.objects,
        getObjectsByType: state => type => state.objects.filter(obj => obj.type === type),
        getObjectsByWall: state => wallId => state.objects.filter(obj => obj.wallId === wallId),
        getCurrentConfig: state => state.currentConfig
    }
}; 