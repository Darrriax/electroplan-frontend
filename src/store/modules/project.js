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
                    { id: 'wall', name: 'wall', label: 'Walls', icon: 'mdi mdi-wall' },
                    { id: 'door', name: 'door', label: 'Doors', icon: 'mdi mdi-door' },
                    { id: 'window', name: 'window', label: 'Windows', icon: 'mdi mdi-window-closed-variant' }
                ]
            },
            'power-sockets': {
                name: 'Power Sockets',
                tools: [
                    { id: 'socket', name: 'socket', label: 'Sockets', icon: 'mdi mdi-power-socket' },
                    { id: 'panel', name: 'panel', label: 'Electrical Panel', icon: 'mdi mdi-electric-switch' }
                ]
            },
            'light': {
                name: 'Light',
                tools: [
                    { id: 'ceiling-light', name: 'ceiling-light', label: 'Ceiling Light', icon: 'mdi mdi-ceiling-light' },
                    { id: 'wall-light', name: 'wall-light', label: 'Wall Light', icon: 'mdi mdi-wall-sconce' }
                ]
            },
            'switches': {
                name: 'Switches',
                tools: [
                    { id: 'single-switch', name: 'single-switch', label: 'Single-Key Switch', icon: 'mdi mdi-toggle-switch' },
                    { id: 'double-switch', name: 'double-switch', label: 'Double-Key Switch', icon: 'mdi mdi-toggle-switch-variant' }
                ]
            }
        }
    },
    mutations: {
        setProjectMetadata(state, { id, name, customer, createdAt, updatedAt }) {
            if (id !== undefined) state.projectId = id;
            if (name !== undefined) state.projectName = name;
            if (customer !== undefined) state.customer = customer;
            if (createdAt !== undefined) state.createdAt = createdAt;
            if (updatedAt !== undefined) state.updatedAt = updatedAt;
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
            state.currentMode = mode;
            // Automatically select the first tool of the new mode
            const currentModeTools = state.modes[mode]?.tools || [];
            state.currentTool = currentModeTools.length > 0 ? currentModeTools[0].name : null;
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
        }
    },
    actions: {
        setTool({ commit }, tool) {
            commit('setCurrentTool', tool);
        },
        setMode({ commit }, mode) {
            commit('setCurrentMode', mode);
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
        async saveProject({ state }) {
            try {
                // Ensure projectData exists
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
                            dimensions: socket.dimensions
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
        async loadProject({ commit }, projectId) {
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
                Object.entries(data).forEach(([type, elements]) => {
                    if (type !== 'scale' && type !== 'unit') {
                        commit('updateProjectElements', { type, elements });
                        // Update the respective module
                        const mutationType = `${type}/setElements`;
                        commit(mutationType, elements, { root: true });
                    }
                });

                commit('setUnit', data.unit);
                commit('setScale', data.scale);

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
        })
    }
};