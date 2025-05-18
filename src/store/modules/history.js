
export const history = {
    namespaced: true,
    state: {
        past: [],
        future: []
    },
    mutations: {
        addToHistory(state, elements) {
            state.past.push([...elements]);
            state.future = [];
        },
        undo(state) {
            if (state.past.length > 0) {
                const current = state.past.pop();
                state.future.push(current);
            }
        },
        redo(state) {
            if (state.future.length > 0) {
                const next = state.future.pop();
                state.past.push(next);
            }
        }
    },
    getters: {
        canUndo: state => state.past.length > 0,
        canRedo: state => state.future.length > 0,
        currentState: state => state.past[state.past.length - 1] || []
    }
};
