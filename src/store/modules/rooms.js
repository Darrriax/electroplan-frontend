// store/modules/rooms.js
import {v4 as uuidv4} from 'uuid';

export const rooms = {
    namespaced: true,

    state: () => ({
        rooms: [],
        selectedRoomId: null
    }),

    mutations: {
        setRooms(state, rooms) {
            state.rooms = rooms.map(room => ({
                ...room,
                id: room.id || uuidv4(),
                points: room.points || [],
                area: room.area || '0.00',
                color: room.color || 'rgba(255, 255, 255, 0.3)'
            }));
        },

        addRoom(state, room) {
            const roomWithId = {
                ...room,
                id: room.id || uuidv4(),
                points: room.points || [],
                area: room.area || '0.00',
                color: room.color || 'rgba(255, 255, 255, 0.3)'
            };
            state.rooms.push(roomWithId);
        },

        updateRoom(state, {id, data}) {
            const index = state.rooms.findIndex(room => room.id === id);
            if (index !== -1) {
                state.rooms[index] = {
                    ...state.rooms[index],
                    ...data,
                    points: data.points || state.rooms[index].points,
                    area: data.area || state.rooms[index].area,
                    color: data.color || state.rooms[index].color
                };
            }
        },

        selectRoom(state, id) {
            state.selectedRoomId = id;
        }
    },

    actions: {
        setRooms({ commit, dispatch }, rooms) {
            commit('setRooms', rooms);
            dispatch('notifyProjectModule');
        },

        addRoom({ commit, dispatch }, room) {
            commit('addRoom', room);
            dispatch('notifyProjectModule');
        },

        updateRoom({ commit, dispatch }, payload) {
            commit('updateRoom', payload);
            dispatch('notifyProjectModule');
        },

        selectRoom({ commit }, id) {
            commit('selectRoom', id);
        },

        // Action to notify project module of changes
        notifyProjectModule({ state, dispatch }) {
            dispatch('project/updateFromModule', {
                type: 'rooms',
                elements: state.rooms
            }, { root: true });
        }
    },

    getters: {
        selectedRoom: (state) => {
            return state.rooms.find(room => room.id === state.selectedRoomId);
        },
        getAllRooms: (state) => state.rooms
    }
};