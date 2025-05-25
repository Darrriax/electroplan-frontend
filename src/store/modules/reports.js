import router from "../../router";

export const reports = {
    namespaced: true,

    state: {
        errors: {},
        message: '',
    },
    getters: {
        getFieldErrors: (state) => state.errors,
        getMessage: (state) => state.message,
    },
    mutations: {
        setMessage(state, message) {
            state.message = message;
        },
        setFieldError(state, {field, error}) {
            state.errors[field] = error;
        },
        clearFieldError(state) {
            state.errors = {};
        },
        clearMessage(state) {
            state.message = '';
        }
    },
    actions: {
        async showFieldError({commit}, {field, error}) {
            commit('setFieldError', {field, error});
        },
        async hideFieldError({commit}) {
            commit('clearFieldError');
        },
        setMessage({ commit }, message) {
            commit('setMessage', message);
            // Clear message after 5 seconds
            setTimeout(() => {
                commit('clearMessage');
            }, 5000);
        },
        clearMessage({ commit }) {
            commit('clearMessage');
        },
        async showSuccess({commit}, message) {
            await this.dispatch('reports/hideFieldError');
            if (message.status === 200) {
                await this.dispatch('reports/showMessage', message.data?.message || "Успішно");
            } else if (message.status === 201) {
                await this.dispatch('reports/showMessage', message.data?.data?.message || "Успішно створено");
            } else if (message.status === 204) {
                await this.dispatch('reports/showMessage', message.data?.data?.message || "Успішно видалено");
            } else {
                await this.dispatch('reports/showMessage', "Дані успішно оновлено");
            }
        },
        // Todo: Change this method. Include language change in error messages
        async showErrors({commit}, error) {
            await this.dispatch('reports/hideFieldError');

            // Перевірка статусу помилки
            if (error.response?.status === 422 || error.response?.status === 400) {
                // Додаємо префікс "Помилка: " до повідомлення
                await this.dispatch('reports/showMessage', "Помилка: " + (error.response?.data?.message || "Неможливо виконати"));

                const err = error.response.data;
                if (err) {
                    for (const field of Object.keys(err)) {
                        const error = err[field];
                        await this.dispatch('reports/showFieldError', {field, error: error});
                    }
                }
            } else if (error.response?.status === 401) {
                // Додаємо префікс "Помилка: " до повідомлення
                await this.dispatch('reports/showMessage', "Помилка: " + (error.response?.data?.detail || "Помилка при авторизації"));
                if (this.getters['user/isLoggedIn']) {
                    await this.dispatch('auth/onLogout')
                }
            } else if (error.response?.status === 403) {
                // Додаємо префікс "Помилка: " до повідомлення
                await this.dispatch('reports/showMessage', "Помилка: " + (error.response?.data?.message || error.response?.message || "Доступ заборонено"));
            } else if (error.response?.status === 409) {
                // Додаємо префікс "Помилка: " до повідомлення
                await this.dispatch('reports/showMessage', "Помилка: " + (error.response?.data?.detail || "Помилка при авторизації"));
                if (this.getters['user/isLoggedIn']) {
                    await this.dispatch('auth/onLogout')
                }
            } else if (error.response?.status === 500) {
                // Додаємо префікс "Помилка: " до повідомлення
                await this.dispatch('reports/showMessage', "Помилка сервера. Спробуйте перезавантажити сторінку");
            } else {
                // Додаємо префікс "Помилка: " до повідомлення
                await this.dispatch('reports/showMessage', "Помилка: " + (error.response?.data?.message || error.response?.message || "Помилка"));
            }
        },
        showMessage({commit}, message) {
            commit('setMessage', message);
            // Clear message after 3 seconds
            setTimeout(() => {
                commit('clearMessage');
            }, 3000);
        }
    },
};


