import Home from '../components/pages/main/Home.vue';
import Profile from "../components/pages/main/Profile.vue";
import Login from "../components/pages/auth/Login.vue";
import Registration from "../components/pages/auth/Registration.vue";
import {createRouter, createWebHistory} from "vue-router";

const routes = [
    {
        path: '/home',
        component: Home,
        name: 'home',
        meta: {
            requiresAuth: false,
            title: 'Home',
        },
        // redirect: '/home',
    },
    {
        path: '/profile',
        component: Profile,
        name: 'profile',
        meta: {
            requiresAuth: false,
            title: 'Профіль користувача',
        }
    },
    {
        path: '/login',
        component: Login,
        name: 'login',
        meta: {
            requiresAuth: false,
            title: 'Вхід до особистого кабінету',
        }
    },
    {
        path: '/registration',
        component: Registration,
        name: 'registration',
        meta: {
            requiresAuth: false,
            title: 'Реєстрація особистого кабінету',
        }
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes: routes
});

export default router;