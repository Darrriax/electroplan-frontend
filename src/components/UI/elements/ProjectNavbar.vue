<template>
  <div>
    <div class="nav-container" :class="{ 'blur-effect': showProjectDataModal }">
    <div class="nav-box m-auto d-flex justify-content-between text-center px-2">
      <!-- Ліва панель -->
      <div class="navbar-left d-flex align-items-center gap-2">
        <button-default icon="fa-solid fa-bars" @click="toggleMenu"/>
          <button-default icon="fa-solid fa-floppy-disk" label="Зберегти" @click="handleSaveClick"/>
        <button-default icon="fa-solid fa-rotate-left" label="Відмінити" @click="undoAction"/>
        <button-default icon="fa-solid fa-rotate-right" label="Повторити" @click="redoAction"/>
        <button-default icon="fa-solid fa-rotate" label="Центрувати" @click="centerPlan"/>
      </div>

      <!-- Права панель -->
      <div class="navbar-right d-flex align-items-center gap-2">
        <button-default 
          icon="fa-solid fa-layer-group" 
          label="План квартири" 
          @click="selectOriginalPlan"
          :class="{ 'mode-active': currentMode === 'original-plan' }"
        />
        <button-default 
          icon="fa-solid fa-plug" 
          label="Розетки" 
          @click="selectPowerSockets"
          :class="{ 'mode-active': currentMode === 'power-sockets' }"
        />
        <button-default 
          icon="fa-solid fa-lightbulb" 
          label="Освітлення" 
          @click="selectLight"
          :class="{ 'mode-active': currentMode === 'light' }"
        />
        <button-default 
          icon="fa-solid fa-toggle-on" 
          label="Вимикачі" 
          @click="selectSwitches"
          :class="{ 'mode-active': currentMode === 'switches' }"
        />

        <div class="divider"/>

        <button-default 
          icon="fa-solid fa-route" 
          label="Автоматичне планування" 
          @click="selectAutoRouting"
          :class="{ 'mode-active': currentMode === 'auto-routing' }"
        />

        <div class="divider"/>

        <!-- Одиниці виміру -->
        <select v-model="selectedUnit" class="unit-select">
          <option value="mm">мм</option>
          <option value="cm">см</option>
        </select>
        
        <button-default 
          icon="fa-solid fa-info-circle" 
          @click="openProjectInfo"
          :disabled="currentMode !== 'auto-routing'"
          :class="{ 'info-active': currentMode === 'auto-routing' }"
        />
      </div>
    </div>
    </div>

    <!-- Project Data Modal -->
    <project-data-modal
      :show="showProjectDataModal"
      :initial-project-name="projectName"
      :initial-customer-name="customerName"
      @save="handleProjectDataSave"
      @close="showProjectDataModal = false"
    />

    <!-- Project Info Modal -->
    <project-info-modal
      :show="showProjectInfoModal"
      @close="showProjectInfoModal = false"
    />
  </div>
</template>

<script>
import ButtonDefault from "../buttons/ButtonDefault.vue"
import ProjectDataModal from "../modals/ProjectDataModal.vue"
import ProjectInfoModal from "../modals/ProjectInfoModal.vue"
import { mapActions, mapState } from "vuex"

export default {
  name: "ProjectNavbar",
  components: {
    ButtonDefault,
    ProjectDataModal,
    ProjectInfoModal
  },
  data() {
    return {
      selectedUnit: 'cm',
      showProjectDataModal: false,
      showProjectInfoModal: false
    }
  },
  computed: {
    ...mapState('project', [
      'currentMode',
      'projectName',
      'customer'
    ]),
    customerName() {
      return this.customer
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
    ...mapActions({
      setMode: 'project/setMode',
      saveProject: 'project/saveProject'
    }),
    toggleMenu() {
      this.$store.commit('project/toggleMenu')
    },
    startAutoCableRouting() {
      this.isRoutingActive = !this.isRoutingActive;
      if (this.isRoutingActive) {
        // Start the automatic cable routing process
        this.$store.dispatch('project/startCableRouting');
      } else {
        // Cancel the routing process if it's active
        this.$store.dispatch('project/cancelCableRouting');
      }
    },
    centerPlan() {},
    async handleSaveClick() {
      // Check if we have project name and customer
      if (!this.projectName || !this.customer) {
        this.showProjectDataModal = true;
      } else {
        await this.saveProjectToBackend();
      }
    },
    async handleProjectDataSave({ projectName, customerName }) {
      // Initialize empty project structure first
      this.$store.commit('project/initializeProjectData', {
        name: projectName,
        customer: customerName,
        data: {
          walls: [],
          doors: [],
          windows: [],
          rooms: [],
          panels: [],
          sockets: [],
          switches: { switches: [] },
          lights: {
            ceilingLights: [],
            wallLights: [],
            lightGroups: []
          },
          scale: 1,
          unit: this.selectedUnit
        }
      });
      
      // Then sync with all modules to gather any existing data
      await this.$store.dispatch('project/initializeProjectData');
      
      this.showProjectDataModal = false;
      await this.saveProjectToBackend();
    },
    async saveProjectToBackend() {
      try {
        await this.saveProject();
        this.$store.dispatch('reports/showMessage', 'Проект успішно збережено');
      } catch (error) {
        this.$store.dispatch('reports/showMessage', 'Помилка: Не вдалося зберегти проект: ' + (error.message || 'Невідома помилка'));
      }
    },
    undoAction() {
      // Emit an event to be caught by parent components
      this.$emit('undo');
    },
    redoAction() {
      // Emit an event to be caught by parent components
      this.$emit('redo');
    },
    selectOriginalPlan() {
      this.setMode('original-plan');
    },
    selectPowerSockets() {
      this.setMode('power-sockets');
    },
    selectLight() {
      this.setMode('light');
    },
    selectSwitches() {
      this.setMode('switches');
    },
    selectAutoRouting() {
      if (this.currentMode === 'auto-routing') {
        // If already in auto-routing mode, switch back to original plan
        this.setMode('original-plan');
      } else {
        // Switch to auto-routing mode
        this.setMode('auto-routing');
      }
    },
    view2D() {},
    view3D() {},
    openSettings() {},
    openProjectInfo() {
      // Only toggle the info panel if in auto-routing mode
      if (this.currentMode === 'auto-routing') {
        this.showProjectInfoModal = !this.showProjectInfoModal;
      }
    },
  }
}
</script>

<style scoped>
.nav-container {
  position: fixed;
  top: 58px;
  left: 0;
  right: 0;
  background: white;
  z-index: 10000;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: filter 0.3s ease;
}

.blur-effect {
  filter: blur(5px);
  pointer-events: none;
}

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

.mode-active {
  background-color: orange !important;
  color: white !important;
  padding: 10px;
  border-radius: 10px;
}

.info-active {
  cursor: pointer;
  opacity: 1;
}

button-default[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
