import {createStore} from "vuex";
import {auth} from "./modules/auth.js";
import {loading} from "./modules/loading";
import {reports} from "./modules/reports.js";
import {user} from "./modules/user.js";
import {project} from "./modules/project.js";
import {walls} from "./modules/walls.js";
import {rooms} from "./modules/rooms.js";

export default createStore({
    modules: {
        loading,
        auth,
        reports,
        user,
        project,
        walls,
        rooms
    },
});
