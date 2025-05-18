import {AccountApi} from "../../api/api";
import {decryptData, encryptData} from "../../mixins/encryption.js";
import * as state from "./user.js";
import router from "../../router/index.js";

const userData = decryptData(localStorage.getItem('user')) || {};

export const user = {
    namespaced: true,

    state: {
        user: {
            id: userData.id || undefined,
            name: userData.name || undefined,
            surname: userData.surname || undefined,
            phoneNumber: userData.phoneNumber || undefined,
            email: userData.email || undefined,
            userProjects: {}
        }
    },
    getters: {
        isLoggedIn: state => state.user.id !== undefined,
        getUserFullName: (state) => state.user.surname + " " + state.user.name,
    },
    mutations: {
        setUserData(state, user) {
            if (!user) {
                state.user = {};
                localStorage.removeItem('user');
            } else {
                state.user = user;
                localStorage.setItem('user', encryptData(user));
            }
        },
    },
    actions: {
        setUser({commit}, user) {
            commit('user/setUserData', user, {root: true});
        },
        async onGetUser() {
            await this.dispatch('loading/setLoading', true);
            AccountApi.getAccountData()
                .then(async (res) => {
                    await this.dispatch('user/setUser', res.data);
                })
                .catch(async (err) => {
                    await this.dispatch('reports/showErrors', err);
                })
                .finally(async () => {
                    await this.dispatch('loading/setLoading', false);
                });
        },
        async onUpdateUser({commit, dispatch}, {name, surname, phoneNumber, email}) {
            await this.dispatch('loading/setLoading', true);
            AccountApi
                .updateData(name, surname, phoneNumber, email)
                .then(async (res) => {
                    await this.dispatch('reports/showSuccess', res);
                    if (res.data.token !== null) {
                        await router.push('/login');
                    }
                })
                .catch(async (err) => {
                    await this.dispatch('reports/showErrors', err);
                })
                .finally(async () => {
                    await this.dispatch('loading/setLoading', false);
                });
        },
        async onUpdatePassword({commit}, {oldPassword, password, passwordConfirmation}) {
            await this.dispatch('loading/setLoading', true);
            AccountApi
                .updatePassword(oldPassword, password, passwordConfirmation)
                .then(async (res) => {
                    await this.dispatch('reports/showSuccess', res);
                })
                .catch(async (err) => {
                    await this.dispatch('reports/showErrors', err);
                })
                .finally(async () => {
                    await this.dispatch('loading/setLoading', false);
                });
        },
    },
};


