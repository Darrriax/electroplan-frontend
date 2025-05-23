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
        },
        addLightGroup(state, group) {
            state.lightGroups.push(group);
        },
        setLights(state, { ceilingLights, wallLights, lightGroups }) {
            state.ceilingLights = ceilingLights || [];
            state.wallLights = wallLights || [];
            state.lightGroups = lightGroups || [];
        },
        resetState(state) {
            state.ceilingLights = [];
            state.wallLights = [];
            state.lightGroups = [];
            state.defaultFloorHeight = 2200;
        }
    },
    actions: {
        setDefaultFloorHeight({ commit }, height) {
            commit('setDefaultFloorHeight', height);
        },
        addCeilingLight({ commit, dispatch }, light) {
            commit('addCeilingLight', light);
            dispatch('notifyProjectModule');
        },
        addWallLight({ commit, dispatch }, light) {
            commit('addWallLight', light);
            dispatch('notifyProjectModule');
        },
        removeCeilingLight({ commit, dispatch }, lightId) {
            commit('removeCeilingLight', lightId);
            dispatch('notifyProjectModule');
        },
        removeWallLight({ commit, dispatch }, lightId) {
            commit('removeWallLight', lightId);
            dispatch('notifyProjectModule');
        },
        setHoveredLight({ commit, dispatch }, lightIds) {
            commit('setHoveredLight', lightIds);
            dispatch('notifyProjectModule');
        },
        createLightGroup({ commit, dispatch }, name) {
            const id = 'group-' + Date.now();
            commit('createLightGroup', { id, name });
            dispatch('notifyProjectModule');
            return id;
        },
        addLightToGroup({ commit, dispatch }, { groupId, light }) {
            commit('addLightToGroup', { groupId, light });
            dispatch('notifyProjectModule');
        },
        removeLightFromGroup({ commit, dispatch }, { groupId, lightId }) {
            commit('removeLightFromGroup', { groupId, lightId });
            dispatch('notifyProjectModule');
        },
        setSelectedGroup({ commit, dispatch }, groupId) {
            commit('setSelectedGroup', groupId);
            dispatch('notifyProjectModule');
        },
        addLightGroup({ commit, dispatch }, group) {
            commit('addLightGroup', group);
            dispatch('notifyProjectModule');
        },
        setLights({ commit, dispatch }, lights) {
            commit('setLights', lights);
            dispatch('notifyProjectModule');
        },
        notifyProjectModule({ state, dispatch }) {
            dispatch('project/updateFromModule', {
                type: 'lights',
                elements: {
                    ceilingLights: state.ceilingLights,
                    wallLights: state.wallLights,
                    lightGroups: state.lightGroups
                }
            }, { root: true });
        },
        resetState({ commit }) {
            commit('resetState');
        }
    },
    getters: {
        getAllCeilingLights: state => state.ceilingLights,
        getAllWallLights: state => state.wallLights,
        getHoveredLightIds: state => state.hoveredLightIds,
        getLightGroups: state => state.lightGroups,
        getCeilingLights: state => state.ceilingLights,
        getWallLights: state => state.wallLights,
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
        },
        ceilingLights: state => state.ceilingLights,
        wallLights: state => state.wallLights,
        lightGroups: state => state.lightGroups
    }
}; 