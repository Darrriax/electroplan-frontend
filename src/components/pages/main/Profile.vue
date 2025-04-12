<template>
  <layout>
    <div class="profile d-flex justify-content-center align-items-start flex-column p-5">
      <div class="row gap-3 justify-content-center pt-5 pt-md-0">
        <!-- Personal Information Column -->
        <div class="card-box px-3 px-md-5 col-sm-12 col-md-5 col-lg-4 col-xxl-4 text-center">
          <h3 class="my-4 ms-3 text-center">Personal information</h3>
          <form @submit.prevent="submit($event)" class="d-flex flex-column justify-content-between h-100">
            <div class="row row-cols-md-1 row-cols-1 gap-2">
              <text-field placeholder="Your name..." icon="fa-solid fa-user"/>
              <text-field placeholder="Your surname..." icon="fa-solid fa-user"/>
              <phone-field id="phoneNumber" label="Phone"/>
              <text-field placeholder="E-mail address" icon="fa-solid fa-at"/>
            </div>
            <div class="mt-auto pt-3">
              <button-simple label="Change" class="set-min-width"/>
            </div>
          </form>
        </div>

        <!-- Change Password Column -->
        <div class="card-box px-3 px-md-5 col-sm-12 col-md-5 col-lg-4 col-xxl-4 text-center">
          <h3 class="my-4 ms-3 text-center">Change password</h3>
          <form @submit.prevent="submit($event)" class="d-flex flex-column justify-content-between h-100">
            <div class="row row-cols-md-1 row-cols-1 gap-2">
              <password-field placeholder="Enter password..."/>
              <password-field placeholder="Repeat password..."/>
            </div>
            <div class="mt-auto pt-3">
              <button-simple label="Change" class="set-min-width"/>
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
}
</script>
