<template>
  <auth-layout>
    <div class="card-box col-sm-10 col-md-8 col-lg-5 col-xxl-5 m-auto text-center">
      <form
          action="#"
          class="register"
          @submit.prevent="submit($event)"
      >
        <!-- Верхній рядок -->
        <div class="d-flex justify-content-between align-items-center ms-4 mt-5">
          <h5 class="secondary-text">ElectroPlanner</h5>
          <a href="/login" class="text-black fw-semibold">Вхід</a>
        </div>
        <!-- Реєстрація -->
        <h3 class="my-4 ms-3 text-start">Реєстрація</h3>

        <!-- Форма -->
        <div class="row row-cols-md-2 row-cols-1 gap-md-0 gap-2">
          <div class="col-md">
            <text-field
                placeholder="Ваше імʼя..."
                icon="fa-solid fa-user"
                v-model="name"
                :error="error['name']"/>
          </div>
          <div class="col-md">
            <text-field
                placeholder="Ваше прізвище..."
                icon="fa-solid fa-user"
                v-model="surname"
                :error="error['surname']"/>
          </div>
        </div>
        <div class="row row-cols-md-2 row-cols-1 mt-2 gap-md-0 gap-2">
          <div class="col-md">
            <phone-field
                id="phoneNumber"
                v-model="phoneNumber"
                :error="error['phoneNumber']"
            />
          </div>
          <div class="col-md">
            <text-field
                placeholder="E-mail..."
                icon="fa-solid fa-at"
                v-model="email"
                :error="error['email']"/>
          </div>
        </div>
        <div class="row mt-2 gap-2">
          <password-field
              placeholder="Введіть пароль..."
              v-model="password"
              :error="error['password']"/>

          <password-field
              placeholder="Повторіть пароль..."
              v-model="passwordConfirmation"
              :error="error['passwordConfirmation']"/>
        </div>
        <button-simple label="Продовжити" class="set-min-width mt-4"/>
      </form>
    </div>
    <message :label="message"/>
  </auth-layout>
</template>

<script>
import Message from "../../UI/elements/Message.vue";
import TextField from "../../UI/inputs/TextField.vue";
import PasswordField from "../../UI/inputs/PasswordField.vue";
import PhoneField from "../../UI/inputs/PhoneField.vue";
import ButtonSimple from "../../UI/buttons/ButtonSimple.vue";
import errorShow from "../../../mixins/errorShow";
import AuthLayout from "../../UI/layouts/AuthLayout.vue";
import {mapActions, mapGetters} from "vuex";

export default {
  name: "registration",
  components: {
    AuthLayout,
    Message,
    TextField,
    PasswordField,
    PhoneField,
    ButtonSimple,
  },
  mixins: [
    errorShow,
  ],
  computed: {
    ...mapGetters('reports', {
      message: 'getMessage',
    }),
    max() {
      return new Date().toISOString().split('T')[0];
    },
  },
  data() {
    return {
      name: '',
      surname: '',
      email: '',
      phoneNumber: '',
      gender: '',
      birthday: '',
      password: '',
      passwordConfirmation: '',
      // fields with verification
      fields: ['name', 'surname', 'phoneNumber', 'email', 'password', 'passwordConfirmation'],
    }
  },
  methods: {
    ...mapActions('auth', {
      onRegister: 'onRegister',
    }),
    submit() {
      if (!this.isLoggedIn) {
        this.onRegister({
              name: this.name,
              surname: this.surname,
              phoneNumber: this.phoneNumber,
              email: this.email,
              password: this.password,
              passwordConfirmation: this.passwordConfirmation,
            }
        );
      }
    },
  },
}
</script>
