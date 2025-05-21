// notifications.js - Vuex module for handling notifications
export const notifications = {
    namespaced: true,
    state: {
        notifications: [],
        nextId: 1
    },
    mutations: {
        ADD_NOTIFICATION(state, notification) {
            state.notifications.push({
                id: state.nextId++,
                ...notification,
                timestamp: Date.now()
            });
        },
        REMOVE_NOTIFICATION(state, id) {
            state.notifications = state.notifications.filter(n => n.id !== id);
        }
    },
    actions: {
        showError({ commit }, message) {
            commit('ADD_NOTIFICATION', {
                type: 'error',
                message,
                duration: 3000 // Auto-dismiss after 3 seconds
            });
        },
        showSuccess({ commit }, message) {
            commit('ADD_NOTIFICATION', {
                type: 'success',
                message,
                duration: 3000
            });
        },
        showInfo({ commit }, message) {
            commit('ADD_NOTIFICATION', {
                type: 'info',
                message,
                duration: 3000
            });
        },
        removeNotification({ commit }, id) {
            commit('REMOVE_NOTIFICATION', id);
        }
    },
    getters: {
        activeNotifications: state => state.notifications
    }
}; 