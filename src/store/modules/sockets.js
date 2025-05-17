export const sockets = {
    namespaced: true,
    state: {
        objects: [], // List of placed objects (sockets, switches, etc.)
        currentConfig: {
            type: 'standard', // 'standard', 'waterproof', 'single-switch', 'double-switch', 'triple-switch', 'wall-light'
            size: 80, // 8cm = 80mm
            heightFromFloor: 300, // Default height from floor in mm (30cm)
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
        },
        updateCurrentConfig(state, config) {
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
        },
        createSocket({ commit, state }, socketData) {
            const newSocket = {
                id: Date.now().toString(),
                ...socketData
            };
            commit('updateObjects', [...state.objects, newSocket]);
        },
        updateSocketsOnWallChange({ commit, state }, { walls, originalWalls }) {
            const updatedSockets = state.objects.map(socket => {
                // Find the wall this socket is attached to
                const wall = walls.find(w => w.id === socket.wallId);
                if (!wall) return socket;

                // Find the original wall to calculate relative position
                const originalWall = originalWalls.find(w => w.id === socket.wallId);
                if (!originalWall) return socket;

                // Calculate the relative position along the wall (0 to 1)
                const originalLength = Math.sqrt(
                    Math.pow(originalWall.end.x - originalWall.start.x, 2) +
                    Math.pow(originalWall.end.y - originalWall.start.y, 2)
                );
                
                const relativePosition = socket.leftSegment / originalLength;

                // Calculate new position along the wall
                const newLength = Math.sqrt(
                    Math.pow(wall.end.x - wall.start.x, 2) +
                    Math.pow(wall.end.y - wall.start.y, 2)
                );
                
                const newLeftSegment = relativePosition * newLength;
                const newRightSegment = newLength - newLeftSegment - socket.size;

                // Calculate new socket position
                const wallAngle = Math.atan2(
                    wall.end.y - wall.start.y,
                    wall.end.x - wall.start.x
                );

                const normalX = -Math.sin(wallAngle);
                const normalY = Math.cos(wallAngle);

                const wallOffset = (wall.thickness / 2) * socket.wallSide;
                const socketOffset = socket.size / 2;

                const positionAlongWall = {
                    x: wall.start.x + (wall.end.x - wall.start.x) * relativePosition,
                    y: wall.start.y + (wall.end.y - wall.start.y) * relativePosition
                };

                return {
                    ...socket,
                    x: positionAlongWall.x + normalX * (wallOffset + socketOffset),
                    y: positionAlongWall.y + normalY * (wallOffset + socketOffset),
                    angle: wallAngle,
                    leftSegment: newLeftSegment,
                    rightSegment: newRightSegment
                };
            });

            commit('updateObjects', updatedSockets);
        }
    },
    getters: {
        getAllObjects: state => state.objects,
        getObjectsByType: state => type => state.objects.filter(obj => obj.type === type),
        getObjectsByWall: state => wallId => state.objects.filter(obj => obj.wallId === wallId),
        getCurrentConfig: state => state.currentConfig
    }
}; 