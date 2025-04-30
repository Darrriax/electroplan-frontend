import {createStore} from "vuex";
import {auth} from "./moduls/auth.js";
import {loading} from "./moduls/loading";
import {reports} from "./moduls/reports.js";
import {user} from "./moduls/user.js";
import {project} from "./moduls/project.js";
import {walls} from "./moduls/walls.js";

export default createStore({
    modules: {
        loading,
        auth,
        reports,
        user,
        project,
        walls
    },
});
