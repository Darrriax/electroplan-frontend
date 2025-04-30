<template>
  <div class="nav-container">
    <div class="nav-box add-radius border-radius-1 m-auto text-center">
      <!-- Лого зліва -->
      <div class="navbar-left">
        <span class="logo">LOGO</span>
      </div>

      <!-- Кнопки справа -->
      <div class="navbar-right">
        <button class="btn btn-outline-secondary">Theme</button>
        <button class="btn btn-outline-secondary">Lang</button>
        <button class="btn btn-outline-dark" @click="goToHome">Projects</button>
        <button class="btn btn-outline-dark" @click="goToProfile">Profile</button>
        <button class="btn btn-dark" @click="logoutBtn">Logout</button>
      </div>
    </div>
  </div>
</template>

<script>
import router from "../../../router/index.js";
import {mapActions} from "vuex";

export default {
  methods: {
    ...mapActions('auth', {
      onLogout: 'onLogout',
    }),
    goToProfile() {
      router.push('/profile');
    },
    goToHome() {
      router.push('/home');
    },
    logoutBtn() {
      this.onLogout();
    },
  }
}
</script>