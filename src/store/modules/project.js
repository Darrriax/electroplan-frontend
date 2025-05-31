// store/modules/project.js
import { ProjectApi } from '../../api/api';

export const project = {
    namespaced: true,
    state: {
        projectId: null,
        projectName: '',
        customer: '',
        createdAt: null,
        updatedAt: null,
        projectData: {
            walls: [],    // Wall elements
            doors: [],    // Door elements
            windows: [],  // Window elements
            rooms: [],    // Room elements
            panels: [],   // Electrical panels
            sockets: [],  // Power sockets
            switches: {   // Light switches
                switches: []       // Switch elements
            },
            lights: {     // Light fixtures and groups
                ceilingLights: [],  // Ceiling mounted lights
                wallLights: [],     // Wall mounted lights
                lightGroups: []     // Light grouping information
            }
        },
        currentTool: null,
        currentMode: 'original-plan',
        menuOpen: true,
        unit: 'cm',
        scale: 1,
        modes: {
            'original-plan': {
                name: 'Original Plan',
                tools: [
                    { id: 'wall', name: 'wall', label: 'Стіни', icon: 'mdi mdi-wall' },
                    { id: 'door', name: 'door', label: 'Двері', icon: 'mdi mdi-door' },
                    { id: 'window', name: 'window', label: 'Вікна', icon: 'mdi mdi-window-closed-variant' }
                ]
            },
            'power-sockets': {
                name: 'Power Sockets',
                tools: [
                    { id: 'socket', name: 'socket', label: 'Розетки', icon: 'mdi mdi-power-socket' },
                    { id: 'panel', name: 'panel', label: 'Ел. панель', icon: 'mdi mdi-electric-switch' }
                ]
            },
            'light': {
                name: 'Light',
                tools: [
                    { id: 'ceiling-light', name: 'ceiling-light', label: 'Стельовий', icon: 'mdi mdi-ceiling-light' },
                    { id: 'wall-light', name: 'wall-light', label: 'Настінний', icon: 'mdi mdi-wall-sconce' }
                ]
            },
            'switches': {
                name: 'Switches',
                tools: [
                    { id: 'single-switch', name: 'single-switch', label: 'Одинарний', icon: 'mdi mdi-toggle-switch' },
                    { id: 'double-switch', name: 'double-switch', label: 'Подвійний', icon: 'mdi mdi-toggle-switch-variant' }
                ]
            }
        },
        isRoutingActive: false,
        distributionBoxes: [],
        labelVisibility: {
            sockets: true,
            switches: true,
            wallLights: true
        },
        showLabelSettings: false
    },
    mutations: {
        setProjectMetadata(state, { id, name, customer, createdAt, updatedAt }) {
            if (id !== undefined) state.projectId = id;
            if (name !== undefined) state.projectName = name;
            if (customer !== undefined) state.customer = customer;
            if (createdAt !== undefined) state.createdAt = createdAt;
            if (updatedAt !== undefined) state.updatedAt = updatedAt;
        },
        resetState(state) {
            state.projectId = null;
            state.projectName = '';
            state.customer = '';
            state.createdAt = null;
            state.updatedAt = null;
            state.projectData = {
                walls: [],
                doors: [],
                windows: [],
                rooms: [],
                panels: [],
                sockets: [],
                switches: { switches: [] },
                lights: {
                    ceilingLights: [],
                    wallLights: [],
                    lightGroups: []
                }
            };
            state.currentTool = null;
            state.currentMode = 'original-plan';
            state.scale = 1;
            state.unit = 'cm';
        },
        updateCustomer(state, customerName) {
            state.customer = customerName;
            state.updatedAt = new Date().toISOString();
        },
        updateProjectElements(state, { type, elements }) {
            // Ensure projectData exists
            if (!state.projectData) {
                state.projectData = {
                    walls: [],
                    doors: [],
                    windows: [],
                    rooms: [],
                    panels: [],
                    sockets: [],
                    switches: { switches: [] },
                    lights: {
                        ceilingLights: [],
                        wallLights: [],
                        lightGroups: []
                    }
                };
            }

            // Handle both array and object types
            if (type === 'lights' || type === 'switches') {
                // For lights and switches, directly assign the object structure
                state.projectData[type] = elements || (type === 'switches' ? { switches: [] } : {
                    ceilingLights: [],
                    wallLights: [],
                    lightGroups: []
                });
            } else {
                // For other types that are arrays, spread the elements or use empty array
                state.projectData[type] = elements ? [...elements] : [];
            }
            state.updatedAt = new Date().toISOString();
        },
        setCurrentTool(state, tool) {
            state.currentTool = tool;
        },
        setCurrentMode(state, mode) {
            const previousMode = state.currentMode;
            state.currentMode = mode;
            
            // Update routing active state based on mode
            state.isRoutingActive = (mode === 'auto-routing');

            // Handle label visibility based on mode
            if (mode === 'auto-routing') {
                // Set all labels to hidden by default in auto-routing mode
                state.labelVisibility = {
                    sockets: false,
                    switches: false,
                    wallLights: false
                };
            } else {
                // For non-routing modes, select the first tool
                const currentModeTools = state.modes[mode]?.tools || [];
                if (currentModeTools.length > 0) {
                    state.currentTool = currentModeTools[0].name;
                }
            }
        },
        setWallThickness(state, thickness) {
            state.wallThickness = thickness;
        },
        setUnit(state, unit) {
            state.unit = unit;
        },
        toggleMenu(state) {
            state.menuOpen = !state.menuOpen;
        },
        setElements(state, elements) {
            // Filter out walls and rooms as they are now stored in their own modules
            state.elements = elements.filter(element => 
                element.type !== 'wall' && element.type !== 'room'
            );
        },
        addElement(state, element) {
            // Only add if not a wall or room
            if (element.type !== 'wall' && element.type !== 'room') {
                state.elements.push(element);
            }
        },
        updateElement(state, { id, updates }) {
            const index = state.elements.findIndex(element => element.id === id);
            if (index !== -1) {
                state.elements[index] = { ...state.elements[index], ...updates };
            }
        },
        removeElement(state, id) {
            state.elements = state.elements.filter(element => element.id !== id);
        },
        syncElements(state, { type, elements }) {
            state.projectData[type] = elements;
            state.updatedAt = new Date().toISOString();
        },
        initializeProjectData(state, { name, customer, data }) {
            state.projectName = name;
            state.customer = customer;
            state.projectData = {
                walls: data.walls || [],
                doors: data.doors || [],
                windows: data.windows || [],
                rooms: data.rooms || [],
                panels: data.panels || [],
                sockets: data.sockets || [],
                switches: data.switches || { switches: [] },
                lights: data.lights || {
                    ceilingLights: [],
                    wallLights: [],
                    lightGroups: []
                }
            };
            state.scale = data.scale || 1;
            state.unit = data.unit || 'cm';
            state.createdAt = new Date().toISOString();
            state.updatedAt = new Date().toISOString();
        },
        setRoutingActive(state, isActive) {
            state.isRoutingActive = isActive;
        },
        setDistributionBoxes(state, boxes) {
            state.distributionBoxes = boxes;
        },
        setLabelVisibility(state, { type, visible }) {
            // Allow changing visibility in auto-routing mode or when switching modes
            state.labelVisibility = {
                ...state.labelVisibility,
                [type]: Boolean(visible)
            };
        },
        resetLabelVisibility(state) {
            // Reset all labels to visible with explicit boolean values
            state.labelVisibility = {
                sockets: true,
                switches: true,
                wallLights: true
            };
        }
    },
    actions: {
        setTool({ commit }, tool) {
            commit('setCurrentTool', tool);
        },
        setMode({ commit, dispatch }, mode) {
            commit('setCurrentMode', mode);
            
            // If switching to auto-routing mode, show the label settings panel
            if (mode === 'auto-routing') {
                // Dispatch an action to show the ProjectInfoModal
                dispatch('showLabelSettings');
            }
        },
        updateWallThickness({ commit }, thickness) {
            commit('setWallThickness', thickness);
        },
        changeUnit({ commit }, unit) {
            commit('setUnit', unit);
        },
        toggleSidebar({ commit }) {
            commit('toggleMenu');
        },
        saveElements({ commit }, elements) {
            commit('setElements', elements);
        },
        addElement({ commit }, element) {
            commit('addElement', element);
        },
        updateElement({ commit }, { id, updates }) {
            commit('updateElement', { id, updates });
        },
        removeElement({ commit }, id) {
            commit('removeElement', id);
        },
        initializeProjectData({ commit, rootState }) {
            // Sync walls first
            if (rootState.walls && rootState.walls.walls) {
                commit('updateProjectElements', {
                    type: 'walls',
                    elements: rootState.walls.walls
                });
            }

            // Sync other modules
            const moduleTypes = ['doors', 'windows', 'rooms', 'panels', 'sockets', 'switches', 'lights'];
            moduleTypes.forEach(type => {
                if (rootState[type] && rootState[type][type]) {
                    commit('updateProjectElements', {
                        type,
                        elements: rootState[type][type]
                    });
                }
            });
        },
        subscribeToModules({ commit, rootState }) {
            // Watch walls module
            if (rootState.walls) {
                commit('updateProjectElements', {
                    type: 'walls',
                    elements: rootState.walls.walls
                });
            }

            // Add similar watches for other modules as needed
        },
        updateFromModule({ commit }, { type, elements }) {
            commit('updateProjectElements', { type, elements });
        },
        async saveProject({ state, commit }) {
            try {
                const projectData = {
                    id: state.projectId,
                    name: state.projectName,
                    customer: state.customer,
                    data: {
                        // Clean and format the project data with safe fallbacks
                        walls: (state.projectData?.walls || []).map(wall => ({
                            id: wall.id,
                            type: wall.type,
                            start: wall.start,
                            end: wall.end,
                            thickness: wall.thickness
                        })),
                        doors: (state.projectData?.doors || []).map(door => ({
                            id: door.id,
                            type: door.type,
                            wallId: door.wallId,
                            position: door.position,
                            dimensions: door.dimensions,
                            centerOffset: door.centerOffset,
                            openingDirection: door.openingDirection,
                            openingSide: door.openingSide
                        })),
                        windows: (state.projectData?.windows || []).map(window => ({
                            id: window.id,
                            type: window.type,
                            wallId: window.wallId,
                            position: window.position,
                            dimensions: window.dimensions,
                            centerOffset: window.centerOffset,
                            floorHeight: window.floorHeight
                        })),
                        rooms: (state.projectData?.rooms || []).map(room => ({
                            id: room.id,
                            type: room.type,
                            path: room.path,
                            area: room.area,
                            color: room.color,
                            points: room.points
                        })),
                        panels: state.projectData?.panels || [],
                        sockets: (state.projectData?.sockets || []).map(socket => ({
                            id: socket.id,
                            type: socket.type,
                            wall: socket.wall,
                            position: socket.position,
                            dimensions: socket.dimensions,
                            deviceType: socket.deviceType || 'regular'
                        })),
                        switches: {
                            switches: (state.projectData?.switches?.switches || []).map(sw => ({
                                id: sw.id,
                                type: sw.type,
                                wall: sw.wall,
                                position: sw.position,
                                dimensions: sw.dimensions,
                                connectedGroup1: sw.connectedGroup1,
                                connectedGroup2: sw.connectedGroup2,
                                connectedGroup: sw.connectedGroup
                            }))
                        },
                        lights: {
                            ceilingLights: (state.projectData?.lights?.ceilingLights || []).map(light => ({
                                id: light.id,
                                type: light.type,
                                position: light.position
                            })),
                            wallLights: (state.projectData?.lights?.wallLights || []).map(light => ({
                                id: light.id,
                                type: light.type,
                                wall: light.wall,
                                position: light.position,
                                dimensions: light.dimensions
                            })),
                            lightGroups: (state.projectData?.lights?.lightGroups || []).map(group => ({
                                id: group.id,
                                name: group.name,
                                lightRefs: group.lightRefs
                            }))
                        },
                        scale: state.scale || 1,
                        unit: state.unit || 'cm'
                    },
                    createdAt: state.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                const response = await ProjectApi.saveProject(projectData);
                commit('setProjectMetadata', {
                    id: response.data.id,
                    name: response.data.name,
                    customer: response.data.customer,
                    createdAt: response.data.createdAt,
                    updatedAt: response.data.updatedAt
                });
                return response.data;
            } catch (error) {
                console.error('Failed to save project:', error);
                throw error;
            }
        },
        async loadProject({ commit, dispatch }, projectId) {
            try {
                const response = await ProjectApi.getProject(projectId);
                const { data, name, customer, createdAt, updatedAt } = response.data;

                // Set project metadata
                commit('setProjectMetadata', {
                    id: projectId,
                    name,
                    customer,
                    createdAt,
                    updatedAt
                });

                // Update project data and respective modules
                if (data.walls) {
                    dispatch('walls/setWalls', data.walls, { root: true });
                }
                if (data.doors) {
                    dispatch('doors/setDoors', data.doors, { root: true });
                }
                if (data.windows) {
                    dispatch('windows/setWindows', data.windows, { root: true });
                }
                if (data.rooms) {
                    dispatch('rooms/setRooms', data.rooms, { root: true });
                }
                if (data.panels) {
                    dispatch('panels/setPanels', data.panels, { root: true });
                }
                if (data.sockets) {
                    dispatch('sockets/setSockets', data.sockets, { root: true });
                }
                if (data.switches?.switches) {
                    dispatch('switches/setSwitches', data.switches.switches, { root: true });
                }
                if (data.lights) {
                    dispatch('lights/setLights', data.lights, { root: true });
                }

                commit('setUnit', data.unit || 'cm');
                commit('setScale', data.scale || 1);

                return response.data;
            } catch (error) {
                console.error('Failed to load project:', error);
                throw error;
            }
        },
        updateCustomer({ commit }, customerData) {
            commit('updateCustomer', customerData);
        },
        syncModuleData({ commit, rootState }, moduleType) {
            const moduleData = rootState[moduleType]?.items || rootState[moduleType]?.[moduleType] || [];
            commit('updateProjectElements', { type: moduleType, elements: moduleData });
        },
        syncModuleElements({ commit }, { type, elements }) {
            commit('syncElements', { type, elements });
        },
        async resetAll({ commit, dispatch }) {
            // Reset all individual modules
            await Promise.all([
                dispatch('walls/resetState', null, { root: true }),
                dispatch('doors/resetState', null, { root: true }),
                dispatch('windows/resetState', null, { root: true }),
                dispatch('rooms/resetState', null, { root: true }),
                dispatch('panels/resetState', null, { root: true }),
                dispatch('sockets/resetState', null, { root: true }),
                dispatch('switches/resetState', null, { root: true }),
                dispatch('lights/resetState', null, { root: true })
            ]);
            
            // Reset project state
            commit('resetState');
        },
        updateDistributionBoxes({ commit }, boxes) {
            commit('setDistributionBoxes', boxes);
        },
        updateLabelVisibility({ commit, state }, { type, visible }) {
            // Allow visibility updates in auto-routing mode or when switching modes
            commit('setLabelVisibility', { 
                type, 
                visible: Boolean(visible) 
            });
        },
        resetLabelVisibility({ commit }) {
            commit('resetLabelVisibility');
        },
        redrawCanvas({ state }) {
            // This action will be used to trigger canvas redraw when needed
            // The PlanEditor component should watch labelVisibility and redraw when it changes
        },
        showLabelSettings({ state }) {
            // This will be used by the ProjectInfoModal component
            state.showLabelSettings = true;
        },
        hideLabelSettings({ state }) {
            state.showLabelSettings = false;
        }
    },
    getters: {
        getCurrentTool: state => state.currentTool,
        getCurrentMode: state => state.currentMode,
        getCurrentModeTools: state => state.modes[state.currentMode]?.tools || [],
        getWallThickness: state => state.wallThickness,
        getUnit: state => state.unit,
        isMenuOpen: state => state.menuOpen,
        getAllElements: state => state.elements,
        getDoors: state => state.elements.filter(el => el.type === 'door'),
        getWindows: state => state.elements.filter(el => el.type === 'window'),
        getBalconies: state => state.elements.filter(el => el.type === 'balcony'),
        getProjectMetadata: state => ({
            id: state.projectId,
            name: state.projectName,
            customer: state.customer,
            createdAt: state.createdAt,
            updatedAt: state.updatedAt
        }),
        getCustomer: state => state.customer,
        getProjectData: state => state.projectData,
        getElementsByType: state => type => state.projectData[type] || [],
        getAllProjectData: state => ({
            metadata: {
                id: state.projectId,
                name: state.projectName,
                customer: state.customer,
                createdAt: state.createdAt,
                updatedAt: state.updatedAt
            },
            data: {
                ...state.projectData,
                scale: state.scale,
                unit: state.unit
            }
        }),
        getIsRoutingActive: state => state.isRoutingActive,
        getDistributionBoxes: state => state.distributionBoxes,
        getLabelVisibility: state => state.labelVisibility,
        getShowLabelSettings: state => state.showLabelSettings
    }
};