import {AccountApi, setToken} from "../../api/api";
import {DEFAULT_PROFILE_IMG, DEFAULT_PROFILE_WOMAN_IMG} from "../../utils/constants";
import logger from "@fortawesome/vue-fontawesome/src/logger.js";
import {decryptData, encryptData} from "@/utils/encryption.js";

const userData = decryptData(localStorage.getItem('user')) || {};
const userAvatar = localStorage.getItem('avatar') || DEFAULT_PROFILE_IMG;

export const user = {
    namespaced: true,

    state: {
        avatarUrl: userAvatar,
        phone: '' || undefined,
        user: {
            id: userData.id || undefined,
            name: userData.name || undefined,
            surname: userData.surname || undefined,
            fatherName: userData.fatherName || undefined,
            email: userData.email || undefined,
            password: userData.password || undefined,
            phoneNumber: userData.phoneNumber || undefined,
            age: userData.age || undefined,
            gender: userData.gender,
            additionalInfo: userData.additionalInfo || undefined,
            usersCars: {}
        }
    },
    getters: {
        isLoggedIn: state => state.user.id !== undefined,
        getAvatarUrl: (state) => (state.avatarUrl === DEFAULT_PROFILE_IMG || state.avatarUrl === DEFAULT_PROFILE_WOMAN_IMG)
            ? ((state.user.gender === "F") ? DEFAULT_PROFILE_WOMAN_IMG : DEFAULT_PROFILE_IMG) : state.avatarUrl,
        getUserFullName: (state) => state.user.surname + " " + state.user.name,
        getPhone: (state) => state.phone,
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
        setPhoneNumber(state, phone) {
            if (!phone) {
                state.phone = {};
                localStorage.removeItem('phone');
            } else {
                state.phone = phone;
                localStorage.setItem('phone', encryptData(phone));
            }
        },
        setAvatarUrl(state, url) {
            state.avatarUrl = url;
            if (url) {
                localStorage.setItem('avatar', url);
            } else {
                localStorage.removeItem('avatar');
            }
        },
    },
    actions: {
        setUser({commit}, user) {
            commit('user/setUserData', user, {root: true});
        },
        setPhone({commit}, phone) {
            commit('user/setPhoneNumber', phone, {root: true});
        },
        setAvatar({commit}, avatar) {
            commit('user/setAvatarUrl', avatar, {root: true});
        },
        async onGetUser() {
            await this.dispatch('loading/setLoading', true);
            AccountApi.getAccountData()
                .then(async (res) => {
                    console.log(res)
                    await this.dispatch('user/setUser', res.data);
                })
                .catch(async (err) => {
                    await this.dispatch('reports/showErrors', err);
                })
                .finally(async () => {
                    await this.dispatch('loading/setLoading', false);
                });
        },
        async onGetPhoneNumber({commit}, {userId}) {
            await this.dispatch('loading/setLoading', true);
            AccountApi.getPhone({userId})
                .then(async (res) => {
                    await this.dispatch('user/setPhone', res.data.phoneNumber);
                })
                .catch(async (err) => {
                    await this.dispatch('reports/showErrors', err);
                })
                .finally(async () => {
                    await this.dispatch('loading/setLoading', false);
                });
        },
        async onUpdateUser({commit}, {name, surname, fatherName, password, phoneNumber, age, gender, additionalInfo}) {
            await this.dispatch('loading/setLoading', true);
            AccountApi
                .updateData(name, surname, fatherName, password, phoneNumber, age, gender, additionalInfo)
                .then(async (res) => {
                    await this.dispatch('user/setUser', res.data);
                    await this.dispatch('reports/showSuccess', res);
                })
                .catch(async (err) => {
                    await this.dispatch('reports/showErrors', err);
                })
                .finally(async () => {
                    await this.dispatch('loading/setLoading', false);
                });
        },
        async onUpdateEmail({commit}, {newEmail}) {
            await this.dispatch('loading/setLoading', true);
            console.log(newEmail)
            AccountApi
                .updateEmail(newEmail)
                .then(async (res) => {
                    await this.dispatch('auth/setToken', res.data.token);
                    setToken(res.data.token);
                    await this.dispatch('reports/showSuccess', res);
                })
                .catch(async (err) => {
                    await this.dispatch('reports/showErrors', err);
                })
                .finally(async () => {
                    await this.dispatch('loading/setLoading', false);
                });
        },

        async onUpdateDefaultAvatar({commit}, gender) {
            if (gender.gender === 'Female') {
                await this.dispatch('user/setAvatar', DEFAULT_PROFILE_WOMAN_IMG);
            } else {
                await this.dispatch('user/setAvatar', DEFAULT_PROFILE_IMG);
            }

        },
    },
};


