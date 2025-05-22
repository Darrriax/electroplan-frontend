import Home from '../components/pages/main/Home.vue';
import Profile from "../components/pages/main/Profile.vue";
import Login from "../components/pages/auth/Login.vue";
import Registration from "../components/pages/auth/Registration.vue";
import {createRouter, createWebHistory} from "vue-router";
import PlanEditor from "../components/pages/project/PlanEditor.vue";
import store from '../store';

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
    {
        path: '/plan-editor/:id',
        component: PlanEditor,
        name: 'planEditor',
        meta: {
            requiresAuth: false,
            title: 'Проектування електромонтажу',
        },
        props: true,
        async beforeEnter(to, from, next) {
            try {
                // Load project data before entering the route
                await store.dispatch('project/loadProject', to.params.id);
                next();
            } catch (error) {
                console.error('Failed to load project:', error);
                next('/home'); // Redirect to home on error
            }
        }
    },
    {
        path: '/plan-editor',
        component: PlanEditor,
        name: 'newProject',
        meta: {
            requiresAuth: false,
            title: 'Новий проект',
        },
        props: { id: null }
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes: routes
});

export default router;