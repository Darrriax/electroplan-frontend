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
    },
    actions: {
        async showFieldError({commit}, {field, error}) {
            commit('setFieldError', {field, error});
        },
        async hideFieldError({commit}) {
            commit('clearFieldError');
        },
        async showMessage({commit}, message) {
            commit('setMessage', message);
            setTimeout(() => {
                commit('setMessage', '');
            }, 4000);
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
        async showErrors({commit}, error) {
            await this.dispatch('reports/hideFieldError');
            if (error.response?.status === 422 || error.response?.status === 400) {
                await this.dispatch('reports/showMessage', error.response?.data?.message || "Помилка при виконанні");
                const err = error.response.data;
                if (err) {
                    for (const field of Object.keys(err)) {
                        const error = err[field];
                        await this.dispatch('reports/showFieldError', {field, error: error});
                    }
                }
            } else if (error.response?.status === 401) {
                await this.dispatch('reports/showMessage', error.response?.data?.detail || "Помилка при авторизації");
                if (this.getters['user/isLoggedIn']) {
                    await this.dispatch('auth/onLogout')
                }
            } else if (error.response?.status === 403) {
                await this.dispatch('reports/showMessage', error.response?.data?.message || error.response?.message || "Доступ заборонено");
            } else if (error.response?.status === 409) {
                await this.dispatch('reports/showMessage', error.response?.data?.detail || "Помилка при авторизації");
                if (this.getters['user/isLoggedIn']) {
                    await this.dispatch('auth/onLogout')
                }
            } else if (error.response?.status === 500) {
                await this.dispatch('reports/showMessage', "Помилка сервера. Спробуйте перезавантажити сторінку"); //error.response?.data?.message
            } else {
                await this.dispatch('reports/showMessage', error.response?.data?.message || error.response?.message || "Помилка");
            }
        },
    },
};


