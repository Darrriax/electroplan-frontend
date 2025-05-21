import {createApp} from 'vue'
import App from './App.vue'
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import './assets/styles/main.css';
import router from "./router/index.js";
import {useBootstrap} from "./plugins/bootstrap";
import store from "./store";

import {library} from '@fortawesome/fontawesome-svg-core';
import {
    faCalendarDays, faKey, faSearch, faAt, faPhone, faUser, faPlus, faPen, faShareNodes, faBars, faFloppyDisk,
    faRotateLeft, faRotateRight, faObjectGroup, faGear, faCircleInfo, faScissors, faFileSignature, faUserTie, faXmark,
} from '@fortawesome/free-solid-svg-icons';

library.add(
    faCalendarDays, faKey, faSearch, faAt, faPhone, faUser, faPlus, faPen, faShareNodes, faBars, faFloppyDisk,
    faRotateLeft, faRotateRight, faObjectGroup, faGear, faCircleInfo, faScissors, faFileSignature, faUserTie, faXmark
);

const app = createApp(App);

app.use(router);
app.use(store);
app.use(useBootstrap);
app.component('font-awesome-icon', FontAwesomeIcon);
app.mount('#app');
