export const loading = {
    namespaced: true,

    state: {
        loading: false
    },

    getters: {
        isLoading: state => state.loading
    },

    mutations: {
        setLoadingData(state, loading) {
            state.loading = loading;
        }
    },

    actions: {
        setLoading({commit}, loading) {
            commit('loading/setLoadingData', loading, {root: true});
        },
    }
};
