// Template for other modules (e.g., doors, windows, sockets, etc.)
export const moduleTemplate = {
    namespaced: true,
    state: {
        items: [] // Use 'items' as a consistent name across modules
    },
    mutations: {
        addItem(state, item) {
            state.items.push(item);
        },
        updateItem(state, { id, updates }) {
            const index = state.items.findIndex(item => item.id === id);
            if (index !== -1) {
                state.items[index] = { ...state.items[index], ...updates };
            }
        },
        removeItem(state, id) {
            state.items = state.items.filter(item => item.id !== id);
        },
        setItems(state, items) {
            state.items = items;
        }
    },
    actions: {
        addItem({ commit, dispatch }, item) {
            commit('addItem', item);
            dispatch('syncWithProject');
        },
        updateItem({ commit, dispatch }, payload) {
            commit('updateItem', payload);
            dispatch('syncWithProject');
        },
        removeItem({ commit, dispatch }, id) {
            commit('removeItem', id);
            dispatch('syncWithProject');
        },
        setItems({ commit, dispatch }, items) {
            commit('setItems', items);
            dispatch('syncWithProject');
        },
        // Action to sync with project module
        syncWithProject({ state, dispatch }) {
            dispatch('project/syncModuleElements', {
                type: 'moduleType', // Replace with actual module type (e.g., 'doors', 'windows', etc.)
                elements: state.items
            }, { root: true });
        }
    },
    getters: {
        getItems: state => state.items,
        getItemById: state => id => state.items.find(item => item.id === id)
    }
}; 