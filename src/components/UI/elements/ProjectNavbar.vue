<template>
  <div class="nav-container">
    <div class="nav-box m-auto d-flex justify-content-between text-center px-2">
      <!-- Ліва панель -->
      <div class="navbar-left d-flex align-items-center gap-2">
        <button-default icon="fa-solid fa-bars" @click="toggleMenu"/>
        <button-default icon="fa-solid fa-floppy-disk" label="Save" @click="saveProject"/>
        <button-default icon="fa-solid fa-rotate-left" label="Undo" @click="undoAction"/>
        <button-default icon="fa-solid fa-rotate-right" label="Redo" @click="redoAction"/>
        <button-default icon="fa-solid fa-rotate" label="Center" @click="centerPlan"/>
      </div>

      <!-- Права панель -->
      <div class="navbar-right d-flex align-items-center gap-2">
        <button-default
            icon="fa-solid fa-layer-group"
            label="Original Plan"
            :class="{ 'active-mode': activeMode === 'originalPlan' }"
            @click="selectOriginalPlan"/>
        <button-default
            icon="fa-solid fa-plug"
            label="Power Sockets"
            :class="{ 'active-mode': activeMode === 'powerSockets' }"
            @click="selectPowerSockets"/>
        <button-default
            icon="fa-solid fa-lightbulb"
            label="Light"
            :class="{ 'active-mode': activeMode === 'light' }"
            @click="selectLight"/>
        <button-default
            icon="fa-solid fa-toggle-on"
            label="Switches"
            :class="{ 'active-mode': activeMode === 'switches' }"
            @click="selectSwitches"/>

        <div class="divider"/>

        <button-default icon="fa-solid fa-border-top-left" label="2D" @click="view2D"/>
        <button-default icon="fa-solid fa-cube" label="3D" @click="view3D"/>

        <div class="divider"/>

        <!-- Одиниці виміру -->
        <select v-model="selectedUnit" class="unit-select" @change="changeUnit">
          <option value="мм">мм</option>
          <option value="см">см</option>
        </select>

        <button-default icon="fa-solid fa-gear" @click="openSettings"/>
        <button-default icon="fa-solid fa-info-circle" @click="openProjectInfo"/>
      </div>
    </div>

    <!-- Підключаємо компонент бокового меню -->
    <sidebar-tools-menu />
  </div>
</template>

<script>
import ButtonDefault from "../buttons/ButtonDefault.vue"
import SidebarToolsMenu from "../settings/SidebarToolsMenu.vue"
import { mapState, mapMutations } from 'vuex'

export default {
  name: "ProjectNavbar",
  components: {
    ButtonDefault,
    SidebarToolsMenu
  },
  data() {
    return {
      selectedUnit: 'см' // За замовчуванням використовуємо сантиметри
    }
  },
  computed: {
    ...mapState('editorTools', ['isMenuOpen', 'activeMode']),
    ...mapState('project', ['unit'])
  },
  mounted() {
    // Синхронізуємо локальний вибір з тим, що в сховищі
    this.selectedUnit = this.unit;
  },
  methods: {
    ...mapMutations('editorTools', ['toggleSidebarMenu', 'setActiveMode']),
    ...mapMutations('project', ['setUnit', 'setWallThickness']),

    changeUnit() {
      const oldUnit = this.unit;
      const newUnit = this.selectedUnit;

      if (oldUnit !== newUnit) {
        // Оновлюємо одиниці у сховищі
        this.setUnit(newUnit);
      }
    },

    toggleMenu() {
      this.toggleSidebarMenu()
    },
    centerPlan() {},
    saveProject() {},
    undoAction() {},
    redoAction() {},
    selectOriginalPlan() {
      this.setActiveMode('originalPlan')
      this.$router.push('/plan-editor')
    },
    selectPowerSockets() {
      this.setActiveMode('powerSockets')
    },
    selectLight() {
      this.setActiveMode('light')
    },
    selectSwitches() {
      this.setActiveMode('switches')
    },
    view2D() {},
    view3D() {},
    openSettings() {},
    openProjectInfo() {},
  }
}
</script>

<style scoped>
.divider {
  width: 1px;
  height: 24px;
  background-color: #ccc;
  margin: 0 10px;
}

.unit-select {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  font-size: 14px;
}

.active-mode {
  padding: 10px;
  border-radius: 10px;
  background-color: #ffa500 !important; /* Оранжевий фон */
  border-color: #ff8c00 !important; /* Оранжевий бордер */
}
</style>