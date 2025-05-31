<template>
  <layout>
    <div class="profile d-flex justify-content-center align-items-start flex-column p-5">
      <div class="row gap-3 justify-content-center pt-5 pt-md-0">
        <!-- Personal Information Column -->
        <div class="card-box px-3 px-md-4 col-sm-12 col-md-5 col-lg-4 col-xxl-4 text-center">
          <h3 class="my-4 ms-3 text-center">Особиста інформація</h3>
          <form @submit.prevent="updateUser($event)" class="d-flex flex-column justify-content-between h-100">
            <div class="row row-cols-md-1 row-cols-1 gap-2">
              <div class="col-md">
                <text-field
                    placeholder="Ваше ім'я..."
                    icon="fa-solid fa-user"
                    v-model="user.name"
                    :error="error['name']"/>
              </div>
              <div class="col-md">
                <text-field
                    placeholder="Ваше прізвище..."
                    icon="fa-solid fa-user"
                    v-model="user.surname"
                    :error="error['surname']"/>
              </div>
              <phone-field
                  id="phoneNumber"
                  v-model="user.phoneNumber"
                  :error="error['phoneNumber']"
              />
              <text-field
                  placeholder="Електронна пошта"
                  icon="fa-solid fa-at"
                  v-model="user.email"
                  :error="error['email']"/>
            </div>
            <div class="mt-auto pt-3">
              <button-simple
                  label="Змінити"
                  class="set-min-width"
                  type="submit"/>
            </div>
          </form>
        </div>

        <!-- Change Password Column -->
        <div class="card-box px-3 px-md-4 col-sm-12 col-md-5 col-lg-4 col-xxl-4 text-center">
          <h3 class="my-4 ms-3 text-center">Зміна паролю</h3>
          <form @submit.prevent="changePassword($event)" class="d-flex flex-column justify-content-between h-100">
            <div class="row row-cols-md-1 row-cols-1 gap-2">
              <password-field
                  placeholder="Введіть поточний пароль..."
                  v-model="oldPassword"
                  :error="error['oldPassword']"/>
              <password-field
                  placeholder="Введіть новий пароль..."
                  v-model="password"
                  :error="error['password']"/>
              <password-field
                  placeholder="Повторіть новий пароль..."
                  v-model="passwordConfirmation"
                  :error="error['passwordConfirmation']"/>
            </div>
            <div class="mt-auto pt-3">
              <button-simple
                  label="Змінити"
                  class="set-min-width"
                  type="submit"/>
            </div>
          </form>
        </div>
      </div>
    </div>
    <message :label="message"/>
  </layout>
</template>

<script>
import Message from "../../UI/elements/Message.vue";
import TextField from "../../UI/inputs/TextField.vue";
import PasswordField from "../../UI/inputs/PasswordField.vue";
import PhoneField from "../../UI/inputs/PhoneField.vue";
import ButtonSimple from "../../UI/buttons/ButtonSimple.vue";
import errorShow from "../../../mixins/errorShow";
import AuthLayout from "../../UI/layouts/AuthLayout.vue";
import Layout from "../../UI/layouts/Layout.vue";
import {mapActions, mapGetters, mapState} from "vuex";

export default {
  name: "profile",
  components: {
    Layout,
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
    ...mapState('user', {
      user: state => state.user,
    }),
    max() {
      return new Date().toISOString().split('T')[0];
    },
  },
  data() {
    return {
      password: '',
      oldPassword: '',
      passwordConfirmation: '',
      // fields with verification
      fields: ['name', 'surname', 'phoneNumber', 'email', 'password', 'passwordConfirmation', 'oldPassword'],
    }
  },
  methods: {
    ...mapActions('user', {
      onGetUser: 'onGetUser',
      onUpdateUser: 'onUpdateUser',
      onUpdatePassword: 'onUpdatePassword',
    }),
    updateUser() {
      this.onUpdateUser(this.user);
    },
    changePassword() {
      this.onUpdatePassword({
        oldPassword: this.oldPassword,
        password: this.password,
        passwordConfirmation: this.passwordConfirmation,
      }).then(() => {
        event.target.reset()
      });
    },
  },
  created() {
    this.onGetUser();
  },
}
</script>

