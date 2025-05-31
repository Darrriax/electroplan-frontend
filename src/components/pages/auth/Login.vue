<template>
  <auth-layout>
    <div class="card-box col-sm-8 col-md-6 col-lg-4 col-xxl-4 m-auto text-center">
      <form
          action="#"
          class="login"
          @submit.prevent="submit($event)"
      >
        <!-- Верхній рядок -->
        <div class="d-flex justify-content-between align-items-center ms-4 mt-5">
          <h5 class="secondary-text">ElectroPlanner</h5>
          <a href="/registration" class="text-black fw-semibold">Реєстрація</a>
        </div>
        <!-- Логін -->
        <h3 class="my-4 ms-3 text-start">Вхід</h3>

        <!-- Форма -->
        <div class="row mt-2 gap-2">
          <div class="col-md">
            <text-field
                placeholder="Електронна пошта"
                icon="fa-solid fa-at"
                v-model="email"
                :error="error['email']"/>
          </div>
          <password-field
              placeholder="Введіть пароль..."
              v-model="password"
              :error="error['password']"/>
        </div>
        <button-simple label="Продовжити" class="set-min-width mt-4"/>
      </form>
    </div>
    <message :label="message"/>
  </auth-layout>
</template>
<script>
import AuthLayout from "../../UI/layouts/AuthLayout.vue";
import Message from "../../UI/elements/Message.vue";
import TextField from "../../UI/inputs/TextField.vue";
import PasswordField from "../../UI/inputs/PasswordField.vue";
import ButtonSimple from "../../UI/buttons/ButtonSimple.vue";
import {mapActions, mapGetters} from "vuex";
import errorShow from "../../../mixins/errorShow.js";

export default {
  name: "registration",
  components: {
    AuthLayout,
    Message,
    TextField,
    PasswordField,
    ButtonSimple,
  },
  mixins: [
    errorShow,
  ],
  computed: {
    ...mapGetters('reports', {
      message: 'getMessage',
    }),
  },
  data() {
    return {
      email: '',
      password: '',
      fields: ['email', 'password'],
    }
  },
  methods: {
    ...mapActions('auth', {
      onLogin: 'onLogin',
    }),
    submit() {
      this.onLogin({
        email: this.email,
        password: this.password,
      });
    },
  },
}
</script>