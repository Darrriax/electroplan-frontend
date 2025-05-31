<template>
  <div class="nav-container">
    <div class="nav-box add-radius border-radius-1 m-auto text-center">
      <!-- Лого зліва -->
      <div class="navbar-left">
        <span class="logo">ElectroPlanner</span>
      </div>

      <!-- Кнопки справа -->
      <div class="navbar-right">
        <button class="btn btn-outline-secondary">Тема</button>
        <button class="btn btn-outline-secondary">Мова</button>
        <button class="btn btn-outline-dark" @click="goToHome">Проєкти</button>
        <button class="btn btn-outline-dark" @click="goToProfile">Профіль</button>
        <button class="btn btn-dark" @click="logoutBtn">Вийти</button>
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