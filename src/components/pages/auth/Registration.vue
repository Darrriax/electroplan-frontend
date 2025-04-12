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
          <h5 class="secondary-text">LOGO?</h5>
          <a href="/login" class="text-black fw-semibold">Log in</a>
        </div>
        <!-- Реєстрація -->
        <h3 class="my-4 ms-3 text-start">Sign up</h3>

        <!-- Форма -->
        <div class="row row-cols-md-2 row-cols-1 gap-md-0 gap-2">
          <div class="col-md">
            <!--                v-model="name"-->
            <!--                :error="error['name']"-->
            <text-field
                placeholder="Your name..." icon="fa-solid fa-user"/>
          </div>
          <div class="col-md">
            <!--            v-model="surname"-->
            <!--            :error="error['surname']"-->
            <text-field
                placeholder="Your surname..." icon="fa-solid fa-user"/>
          </div>
        </div>
        <div class="row row-cols-md-2 row-cols-1 mt-2 gap-md-0 gap-2">
          <div class="col-md">
            <!--            v-model="phoneNumber"-->
            <!--            :error="error['phoneNumber']"-->
            <phone-field
                id="phoneNumber"
                label="Phone"
            />
          </div>
          <div class="col-md">
            <text-field placeholder="E-mail address" icon="fa-solid fa-at"/>
          </div>
        </div>
        <div class="row mt-2 gap-2">
          <!--            v-model="password"-->
          <!--            :error="error['password']"-->
          <password-field
              placeholder="Enter password..."/>
          <!--            v-model="password"-->
          <!--            :error="error['password']"-->
          <password-field
              placeholder="Repeat password..."/>
        </div>
        <button-simple label="Continue" class="set-min-width mt-4"/>
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
    max() {
      return new Date().toISOString().split('T')[0];
    },
  },
  data() {
    return {
      name: '',
      surname: '',
      email: '',
      phone: '',
      gender: '',
      birthday: '',
      password: '',
      password_confirmation: '',
      // fields with verification
      fields: ['name', 'surname', 'email', 'phone', 'gender', 'password', 'password_confirmation'],
    }
  },
  // methods: {
  // ...mapActions('auth', {
  //   onRegister: 'onRegister',
  //   onSanctum: 'onSanctum',
  // }),
  // submit() {
  //     if (!this.isLoggedIn) {
  //       this.onRegister({
  //         name: this.name,
  //         surname: this.surname,
  //         email: this.email,
  //         phone: this.phone,
  //         gender: this.gender,
  //         birthday: this.birthday,
  //         password: this.password,
  //         password_confirmation: this.password_confirmation,
  //       }
  //       );
  //     }
  //   },
  // },
  // created() {
  //   this.onSanctum();
  // }
}
</script>
