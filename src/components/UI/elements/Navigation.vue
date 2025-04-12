<template>
  <div class="nav-container">
    <div class="nav-box border-radius-1 m-auto text-center">
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
        <button class="btn btn-dark" @click="">Logout</button>
      </div>
    </div>
  </div>
</template>

<script>
import router from "../../../router/index.js";

export default {
  methods: {
    goToProfile() {
      router.push('/profile');
    },
    goToHome() {
      router.push('/home');
    },
  }
}
</script>