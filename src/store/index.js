import {createStore} from "vuex";
import {loading} from "./moduls/loading";

export default createStore({
    modules: {
        loading,
    },
});
