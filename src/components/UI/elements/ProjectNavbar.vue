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
          @click="selectOriginalPlan"
          :class="{ 'active-mode': isActiveMode('original-plan') }"
        />
        <button-default 
          icon="fa-solid fa-plug" 
          label="Power Sockets" 
          @click="selectPowerSockets"
          :class="{ 'active-mode': isActiveMode('power-sockets') }"
        />
        <button-default 
          icon="fa-solid fa-lightbulb" 
          label="Lighting" 
          @click="selectLight"
          :class="{ 'active-mode': isActiveMode('lighting') }"
        />
        <button-default 
          icon="fa-solid fa-toggle-on" 
          label="Switches" 
          @click="selectSwitches"
          :class="{ 'active-mode': isActiveMode('switches') }"
        />

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
import { mapGetters } from 'vuex'

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
  computed: {
    ...mapGetters('project', ['isActiveMode'])
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
    undoAction() {
      // Emit an event to be caught by parent components
      this.$emit('undo');
    },
    redoAction() {
      // Emit an event to be caught by parent components
      this.$emit('redo');
    },
    selectOriginalPlan() {
      this.$store.commit('project/setActiveMode', 'original-plan');
    },
    selectPowerSockets() {
      this.$store.commit('project/setActiveMode', 'power-sockets');
    },
    selectLight() {
      this.$store.commit('project/setActiveMode', 'lighting');
    },
    selectSwitches() {
      this.$store.commit('project/setActiveMode', 'switches');
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
  background-color: #ff9800 !important;
  padding: 4px 8px;
  color: white !important;
}

.active-mode:hover {
  background-color: #f57c00 !important;
}
</style>
