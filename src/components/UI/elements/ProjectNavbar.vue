<template>
  <div class="nav-container">
    <div class="nav-box border-radius-1 m-auto d-flex justify-content-between text-center px-2">

<!--      ToDO: navbar-left
1. Add project change history
2. Add main menu with tools-->
      <!-- Кнопки зміни обʼєктів -->
      <div class="navbar-left d-flex align-items-center gap-2">
        <button-default icon="fa-solid fa-bars" @click="toggleMenu"/>
        <button-default icon="fa-solid fa-plus" label="New project" @click="createProject"/>
        <button-default icon="fa-solid fa-floppy-disk" label="Save" @click="saveProject"/>
        <button-default icon="fa-solid fa-rotate-left" label="Undo" @click="undoAction"/>
        <button-default icon="fa-solid fa-rotate-right" label="Redo" @click="redoAction"/>
      </div>

<!--      ToDO: navbar-right
1. Add project settings and set measure units and all project information here
2. Add main menu with tools-->
      <!-- Кнопки управління проектом -->
      <div class="navbar-right d-flex align-items-center gap-2">
        <button-default icon="fa-solid fa-object-group" label="Multiple Select" @click="toggleSelectionMode"/>
        <button-default icon="fa-solid fa-house" label="Layout" @click="viewLayout"/>
        <button-default icon="fa-solid fa-cube" label="3D" @click="view3D"/>
        <button-default icon="fa-solid fa-border-top-left" label="2D" @click="view2D"/>
        <button-default icon="fa-solid fa-gear" @click="openSettings"/>
        <button-default icon="fa-solid fa-info-circle" @click="openProjectInfo"/>
      </div>
    </div>
  </div>
</template>

<script>
import ButtonDefault from "../buttons/ButtonDefault.vue";

export default {
  name: "profile",
  components: {
    ButtonDefault,
  },
  methods: {
    toggleMenu() {
      // логіка відкриття бокового меню
    },
    createProject() {
      // логіка створення нового проєкту
    },
    saveProject() {
      // логіка збереження проєкту
    },
    undoAction() {
      // логіка undo
    },
    redoAction() {
      // логіка redo
    },
    toggleSelectionMode() {
      // логіка для режиму множинного вибору
    },
    viewLayout() {
      // показ layout зверху
    },
    view3D() {
      // показ 3D вигляду
    },
    view2D() {
      // показ 2D вигляду (стіна)
    },
    openSettings() {
      // відкриття налаштувань проєкту
    },
    openProjectInfo() {
      // відкриття інформації про проєкт
    },
  }
}
</script>
