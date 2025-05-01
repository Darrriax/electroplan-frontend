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
        <button-default icon="fa-solid fa-layer-group" label="Original Plan" @click="selectOriginalPlan"/>
        <button-default icon="fa-solid fa-plug" label="Power Sockets" @click="selectPowerSockets"/>
        <button-default icon="fa-solid fa-lightbulb" label="Light" @click="selectLight"/>
        <button-default icon="fa-solid fa-toggle-on" label="Switches" @click="selectSwitches"/>

        <div class="divider"/>

        <button-default icon="fa-solid fa-border-top-left" label="2D" @click="view2D"/>
        <button-default icon="fa-solid fa-cube" label="3D" @click="view3D"/>

        <div class="divider"/>

        <!-- Одиниці виміру -->
        <select v-model="selectedUnit" class="unit-select">
          <option value="mm">мм</option>
          <option value="cm">см</option>
        </select>

        <button-default icon="fa-solid fa-gear" @click="openSettings"/>
        <button-default icon="fa-solid fa-info-circle" @click="openProjectInfo"/>
      </div>
    </div>
  </div>
</template>

<script>
import ButtonDefault from "../buttons/ButtonDefault.vue"

export default {
  name: "ProjectNavbar",
  components: {
    ButtonDefault,
  },
  data() {
    return {
      selectedUnit: 'cm'
    }
  },
  watch: {
    selectedUnit(newVal) {
      const oldUnit = this.$store.state.project.unit
      const thickness = this.$store.state.project.wallThickness

      // Конвертація значення при зміні одиниць
      let newThickness = thickness
      if(oldUnit === 'cm' && newVal === 'mm') newThickness = thickness
      if(oldUnit === 'mm' && newVal === 'cm') newThickness = thickness
      if(oldUnit === 'm' && newVal === 'cm') newThickness = thickness * 10
      if(oldUnit === 'cm' && newVal === 'm') newThickness = thickness / 10

      this.$store.commit('project/setUnit', newVal)
      this.$store.commit('project/setWallThickness', Math.round(newThickness))
    }
  },
  methods: {
    toggleMenu() {
      this.$store.commit('project/toggleMenu')
    },
    centerPlan() {},
    saveProject() {},
    undoAction() {},
    redoAction() {},
    selectOriginalPlan() {
      this.$router.push('/plan-editor')
    },
    selectPowerSockets() {},
    selectLight() {},
    selectSwitches() {},
    view2D() {},
    view3D() {},
    openSettings() {},
    openProjectInfo() {},
  }
}
</script>

