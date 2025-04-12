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
          <h5 class="secondary-text">LOGO?</h5>
          <a href="/registration" class="text-black fw-semibold">Sign up</a>
        </div>
        <!-- Логін -->
        <h3 class="my-4 ms-3 text-start">Log in</h3>

        <!-- Форма -->
        <div class="row mt-2 gap-2">
          <div class="col-md">
            <text-field placeholder="E-mail address" icon="fa-solid fa-at"/>
          </div>
          <!--            v-model="password"-->
          <!--            :error="error['password']"-->
          <password-field
              placeholder="Enter password..."/>
          <!--            v-model="password"-->
          <!--            :error="error['password']"-->
        </div>
        <button-simple label="Continue" class="set-min-width mt-4"/>
      </form>
    </div>
    <message :label="message"/>
  </auth-layout>
</template>
<script setup>
import PasswordField from "../../UI/inputs/PasswordField.vue";
import ButtonSimple from "../../UI/buttons/ButtonSimple.vue";
import TextField from "../../UI/inputs/TextField.vue";
import Message from "../../UI/elements/Message.vue";
import AuthLayout from "../../UI/layouts/AuthLayout.vue";
</script>