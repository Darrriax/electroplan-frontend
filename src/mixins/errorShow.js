import {mapGetters} from "vuex";

const errorShow = {
    computed: {
        ...mapGetters('reports', {
            error: 'getFieldErrors',
        }),
    },
    methods: {
        clearError(fieldName, fieldValue) {
            if (fieldValue) {
                delete this.error[fieldName];
            }
        },
    },
    mounted() {
        this.fields.forEach(field => {
            // ! adds field watcher, to monitor user's input
            this.$watch(field, function (newValue) {
                this.clearError(field, newValue);
            });
            // clears errors, prevent saving error's state on another page
            this.clearError(field, true);
        });
    },
};

export default errorShow;