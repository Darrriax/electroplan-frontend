import {AccountApi, AuthApi, setToken} from "../../api/api";
import router from "../../router";
import {encryptData, decryptData} from "../../mixins/encryption";
// import {resetTheme} from "../../mixins/setTheme";
// import {resetLang} from "../../mixins/setLang";

const tokenData = decryptData(localStorage.getItem('token')) || null;

export const auth = {
    namespaced: true,

    state: {
        token: tokenData,
        emailStatus: false,
    },
    getters: {
        isEmailSent: state => state.emailStatus
    },
    mutations: {
        setTokenData(state, token) {
            if (!token) {
                state.token = null;
                localStorage.removeItem('token');
            } else {
                state.token = token;
                localStorage.setItem('token', encryptData(token));
            }
        },
        setEmailStatusData(state, emailStatus) {
            state.emailStatus = emailStatus;
        }
    },
    actions: {
        setToken({commit}, token) {
            commit('auth/setTokenData', token, {root: true});
        },
        async onLogin({commit}, {email, password}) {
            await this.dispatch('loading/setLoading', true);
            AuthApi
                .login(email, password)
                .then(async (res) => {
                    await this.dispatch('auth/setToken', res.data.token);
                    await this.dispatch('user/setUser', res.data.user);

                    await this.dispatch('reports/showSuccess', res);
                })
                .then(async () => {
                    if (this.getters['user/isLoggedIn']) {
                        if (router.currentRoute.value.query.redirect === '/home' || !router.currentRoute.value.query.redirect) {
                            await router.push('/home');
                        } else if (router.currentRoute.value.query.redirect) {
                            await router.push(router.currentRoute.value.query.redirect.toString());
                        }
                        setTimeout(() => {
                            AccountApi.getAccountData()
                                .catch(async (err) => {
                                    await this.dispatch('reports/showErrors', err);
                                });
                        }, 1000);
                    }
                })
                .catch(async err => {
                    console.log(err)
                    await this.dispatch('reports/showErrors', err);
                })
                .finally(async () => {
                    await this.dispatch('loading/setLoading', false);
                });

        },
        async onRegister({commit}, {name, surname, phoneNumber, email, password, passwordConfirmation}) {
            AuthApi
                .register(name, surname, phoneNumber, email, password, passwordConfirmation)
                .then(async (res) => {
                    await this.dispatch('reports/showSuccess', res);
                    await this.dispatch('auth/onLogin', {email: email, password: password});
                })
                .catch(async (err) => {
                    await this.dispatch('reports/showErrors', err);
                });
        },
        async onLogout({commit}) {
            await this.dispatch('loading/setLoading', true);
            AuthApi
                .logout()
                .then(async (res) => {
                    await this.dispatch('reports/showSuccess', res);
                })
                .catch(async (err) => {
                    await this.dispatch('reports/showErrors', err);
                })
                .finally(async () => {
                    await this.dispatch('loading/setLoading', false);
                    await this.dispatch('auth/setToken', null);
                    await this.dispatch('user/setUser', null);
                    // await resetLang();
                    // await resetTheme();
                    await router.push({path: '/login', query: {redirect: router.currentRoute.value.fullPath}});
                });
        },
        // async onForgotPassword({commit}, {email}) {
        //     await this.dispatch('loading/setLoading', true);
        //     AuthApi
        //         .forgotPassword(email)
        //         .then(async (res) => {
        //             await this.dispatch('auth/setEmailStatus', true);
        //             await this.dispatch('reports/showSuccess', res);
        //         })
        //         .catch(async (err) => {
        //             await this.dispatch('reports/showErrors', err);
        //         })
        //         .finally(async () => {
        //             await this.dispatch('loading/setLoading', false);
        //         });
        // },
        // async onResetPassword({commit}, {token, email, password, passwordConfirmation}) {
        //     await this.dispatch('loading/setLoading', true);
        //     AuthApi
        //         .resetPassword(token, email, password, passwordConfirmation)
        //         .then(async (res) => {
        //             await router.push('/login');
        //             await this.dispatch('reports/showSuccess', res);
        //         })
        //         .catch(async (err) => {
        //             await this.dispatch('reports/showErrors', err);
        //         })
        //         .finally(async () => {
        //             await this.dispatch('loading/setLoading', false);
        //         });
        // },
        setEmailStatus({commit}, emailStatus) {
            commit('auth/setEmailStatusData', emailStatus, {root: true});
        },
        async onSanctum({commit}) {
            AuthApi
                .sanctum()
                .then(async (res) => {
                })
                .catch(async (err) => {
                    await this.dispatch('reports/showErrors', err);
                });
        },
        // async onNotify({commit}) {
        //     await this.dispatch('loading/setLoading', true);
        //     AuthApi.notify()
        //         .then(async (res) => {
        //             await this.dispatch('reports/showSuccess', res);
        //         })
        //         .catch(async (err) => {
        //             await this.dispatch('reports/showErrors', err);
        //         })
        //         .finally(async () => {
        //             await this.dispatch('loading/setLoading', false);
        //         });
        // },
        // async onVerify({commit}, {id, hash}) {
        //     await this.dispatch('loading/setLoading', true);
        //     AuthApi.verify(id, hash)
        //         .then(async (res) => {
        //             await this.dispatch('reports/showSuccess', res);
        //         })
        //         .catch(async (err) => {
        //             await this.dispatch('reports/showErrors', err);
        //         })
        //         .finally(async () => {
        //             await this.dispatch('loading/setLoading', false);
        //         });
        // },
    }
};
