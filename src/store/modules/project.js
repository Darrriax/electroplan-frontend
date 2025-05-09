// src/store/modules/project.js
export const project = {
    namespaced: true,
    state: () => ({
        projectName: '',
        customer: '',
        updatedAt: '',
        wallHeight: 260,
        wallThickness: 20,
        unit: 'см',
        undoStack: [],
        redoStack: [],
    }),
    mutations: {
        // Оновлення товщини стіни
        setWallThickness(state, thickness) {
            state.wallThickness = thickness;
        },

        // Оновлення висоти стіни
        setWallHeight(state, height) {
            state.wallHeight = height;
        },

        // Оновлення назви проекту
        setProjectName(state, name) {
            state.projectName = name;
        },

        // Оновлення замовника
        setCustomer(state, customer) {
            state.customer = customer;
        },

        // Оновлення часу
        updateTimestamp(state) {
            state.updatedAt = new Date().toISOString();
        },

        // Зміна одиниць вимірювання
        setUnit(state, unit) {
            state.unit = unit;
        },

        // Логіка для Undo/Redo буде імплементована пізніше
    },
    actions: {
        // Дії для роботи з проектом

        // Зберегти стан проекту для undo
        saveState({ state, commit }, actionDescription) {
            // Логіка збереження для undo/redo буде імплементована пізніше
            commit('updateTimestamp');
        }
    },
    getters: {
        // Отримати поточні налаштування проекту
        projectSettings(state) {
            return {
                wallHeight: state.wallHeight,
                wallThickness: state.wallThickness,
                unit: state.unit
            };
        }
    }
}

export default project;