export default {
    namespaced: true,
    state: {
        defaultFloorHeight: 2200,
        ceilingLights: [],
        wallLights: [],
        hoveredLightIds: [],
        lightGroups: [],
        selectedGroupId: null
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
        },
        setHoveredLight(state, lightIds) {
            state.hoveredLightIds = lightIds ? (Array.isArray(lightIds) ? lightIds : [lightIds]) : [];
        },
        createLightGroup(state, { id, name }) {
            state.lightGroups.push({
                id,
                name,
                lightRefs: [] // Store only references to lights
            });
        },
        addLightToGroup(state, { groupId, light }) {
            const group = state.lightGroups.find(g => g.id === groupId);
            if (group && !group.lightRefs.some(ref => ref.id === light.id)) {
                // Store only a reference to the light
                group.lightRefs.push({
                    id: light.id,
                    type: light.type
                });
            }
        },
        removeLightFromGroup(state, { groupId, lightId }) {
            const group = state.lightGroups.find(g => g.id === groupId);
            if (group) {
                group.lightRefs = group.lightRefs.filter(ref => ref.id !== lightId);
            }
        },
        setSelectedGroup(state, groupId) {
            state.selectedGroupId = groupId;
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
        },
        createLightGroup({ commit }, name) {
            const id = 'group-' + Date.now();
            commit('createLightGroup', { id, name });
            return id;
        },
        addLightToGroup({ commit }, { groupId, light }) {
            commit('addLightToGroup', { groupId, light });
        },
        removeLightFromGroup({ commit }, { groupId, lightId }) {
            commit('removeLightFromGroup', { groupId, lightId });
        },
        setSelectedGroup({ commit }, groupId) {
            commit('setSelectedGroup', groupId);
        }
    },
    getters: {
        getAllCeilingLights: state => state.ceilingLights,
        getAllWallLights: state => state.wallLights,
        getHoveredLightIds: state => state.hoveredLightIds,
        getLightGroups: state => state.lightGroups,
        // Get lights that are not in any group
        getUngroupedCeilingLights: state => {
            const groupedLightIds = new Set(
                state.lightGroups.flatMap(group => 
                    group.lightRefs
                        .filter(ref => ref.type === 'ceiling')
                        .map(ref => ref.id)
                )
            );
            return state.ceilingLights.filter(light => !groupedLightIds.has(light.id));
        },
        getUngroupedWallLights: state => {
            const groupedLightIds = new Set(
                state.lightGroups.flatMap(group => 
                    group.lightRefs
                        .filter(ref => ref.type === 'wall-light')
                        .map(ref => ref.id)
                )
            );
            return state.wallLights.filter(light => !groupedLightIds.has(light.id));
        },
        getSelectedGroup: state => {
            const group = state.lightGroups.find(g => g.id === state.selectedGroupId);
            if (!group) return null;

            // Enrich group with actual light objects
            return {
                ...group,
                lights: group.lightRefs.map(ref => {
                    if (ref.type === 'ceiling') {
                        const light = state.ceilingLights.find(l => l.id === ref.id);
                        return light ? { ...light, type: 'ceiling' } : null;
                    } else if (ref.type === 'wall-light') {
                        const light = state.wallLights.find(l => l.id === ref.id);
                        return light ? { ...light, type: 'wall-light' } : null;
                    }
                    return null;
                }).filter(Boolean)
            };
        }
    }
}; 