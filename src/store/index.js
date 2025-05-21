import {createStore} from "vuex";
import {auth} from "./modules/auth.js";
import {loading} from "./modules/loading.js";
import {reports} from "./modules/reports.js";
import {user} from "./modules/user.js";
import {project} from "./modules/project.js";
import {walls} from "./modules/walls.js";
import {rooms} from "./modules/rooms.js";
import {history} from "./modules/history.js";
import {doors} from "./modules/doors.js";
import {windows} from './modules/windows';
import panels from './modules/panels';
import sockets from './modules/sockets';
import switches from './modules/switches';
import lights from './modules/lights';
import canvas from './modules/canvas';
import {notifications} from './modules/notifications';

export default createStore({
    modules: {
        loading,
        auth,
        reports,
        user,
        project,
        walls,
        rooms,
        history,
        doors,
        windows,
        panels,
        sockets,
        switches,
        lights,
        canvas,
        notifications
    },
});
