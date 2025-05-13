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
                id: room.id || uuidv4()
            }));
        },

        addRoom(state, room) {
            const roomWithId = {
                ...room,
                id: room.id || uuidv4()
            };
            state.rooms.push(roomWithId);
        },

        updateRoom(state, {id, data}) {
            const index = state.rooms.findIndex(room => room.id === id);
            if (index !== -1) {
                state.rooms[index] = {...state.rooms[index], ...data};
            }
        },
    }
}