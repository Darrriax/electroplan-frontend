import axios from "axios";
import {decryptData} from "../mixins/encryption.js";

const tokenData = decryptData(localStorage.getItem('token'));

let token = '';

export function setToken(newToken) {
    token = newToken;
}

const urls = {
    auth: {
        register: 'auth/register',
        login: 'auth/login',
        logout: 'auth/logout',
    },
    user: {
        profile: 'users/profile',
        password: 'users/change-password',
    },
    project: {
        base: 'projects',
        byId: (id) => `projects/${id}`,
    }
}

const defaultConfig = {
    baseURL: import.meta.env.VITE_APP_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    }
};

const formDataConfig = {
    baseURL: import.meta.env.VITE_APP_BASE_URL,
    headers: {
        'Content-Type': 'multipart/form-data',
        'Access-Control-Allow-Origin': '*',
    }
};

export const DefaultApiInstance = axios.create(defaultConfig);
export const FormDataApiInstance = axios.create(formDataConfig);

DefaultApiInstance.interceptors.request.use(function (config) {
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    } else {
        config.headers.Authorization = `Bearer ${tokenData}`;
    }
    return config;
});

FormDataApiInstance.interceptors.request.use(function (config) {
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    } else {
        config.headers.Authorization = `Bearer ${tokenData}`;
    }
    return config;
});

export const AuthApi = {
    // Вказуємо всю необхідну інформацію, щоб зареєструватися і мати доступ до системи
    register(name, surname, phoneNumber, email, password, passwordConfirmation) {
        const url = urls.auth.register;
        const data = {name, surname, phoneNumber, email, password, passwordConfirmation};
        return DefaultApiInstance.post(url, data);
    },
    // Після реєстрації можемо залогінитися на допомогою імейлу та паролю
    login(email, password) {
        const url = urls.auth.login;
        const data = {email, password};
        return DefaultApiInstance.post(url, data);
    },
    // Вийти з системи
    logout() {
        const url = urls.auth.logout;
        return DefaultApiInstance.post(url);
    },
};

export const AccountApi = {
    getAccountData() {
        const url = urls.user.profile;
        return DefaultApiInstance.get(url);
    },
    updateData(name, surname, phoneNumber, email) {
        const url = urls.user.profile;
        const data = {name, surname, phoneNumber, email};
        return DefaultApiInstance.put(url, data);
    },
    updatePassword(oldPassword, password, passwordConfirmation) {
        const url = urls.user.password;
        const data = {oldPassword, password, passwordConfirmation};
        return DefaultApiInstance.put(url, data);
    },
};

export const ProjectApi = {
    // Get project by ID
    getProject(id) {
        const url = urls.project.byId(id);
        return DefaultApiInstance.get(url);
    },

    // Save new project or update existing one
    saveProject(projectData) {
        if (projectData.id) {
            // Update existing project
            const url = urls.project.byId(projectData.id);
            return DefaultApiInstance.put(url, projectData);
        } else {
            // Create new project
            const url = urls.project.base;
            return DefaultApiInstance.post(url, projectData);
        }
    },

    // Get all projects for current user
    getAllProjects() {
        const url = urls.project.base;
        return DefaultApiInstance.get(url);
    },

    // Delete project
    deleteProject(id) {
        const url = urls.project.byId(id);
        return DefaultApiInstance.delete(url);
    }
};