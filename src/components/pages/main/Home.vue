<template>
  <layout>
    <div class="home d-flex justify-content-center align-items-start flex-column p-5">
      <div class="mt-5 ms-5">
        <div class="title-text primary-white-text">Вітаємо, {{ getUserFullName }}</div>
        <button-action label="Створити новий проєкт" @click="goToProject" icon="fa-solid fa-plus" class="set-min-width mt-3"/>
      </div>
    </div>
    <h3 class="text-center my-3">Мої проєкти</h3>
    <hr>
    <div v-if="error" class="alert alert-danger text-center" role="alert">
      {{ error }}
    </div>
    <div v-else-if="loading" class="text-center">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Завантаження...</span>
      </div>
    </div>
    <div v-else-if="projects.length === 0" class="text-center">
      <p>У вас ще немає проєктів. Створіть свій перший проєкт!</p>
    </div>
    <div v-else class="projects d-flex row row-cols-4 align-items-center justify-content-center gap-4 mx-5 px-5">
      <item-card
        v-for="project in formattedProjects"
        :key="project.id"
        src="../public/images/plan.jpg"
        :last-changes="formatDate(project.updatedAt)"
        :title="project.name"
        :customer="project.customer"
        @click="openProject(project.id)"
        @edit="editProject(project)"
        @delete="deleteProject(project.id)"
      />
    </div>

    <project-data-modal
      :show="showProjectDataModal"
      :initial-project-name="editingProject.name"
      :initial-customer-name="editingProject.customer"
      @save="handleProjectDataSave"
      @close="showProjectDataModal = false"
    />
  </layout>
</template>
<script>
import Layout from "../../UI/layouts/Layout.vue";
import ButtonAction from "../../UI/buttons/ButtonAction.vue";
import ItemCard from "../../UI/elements/ItemCard.vue";
import ProjectDataModal from "../../UI/modals/ProjectDataModal.vue";
import {mapGetters} from "vuex";
import router from "../../../router/index.js";
import { ProjectApi } from "../../../api/api";

export default {
  name: "Profile",
  components: {
    Layout,
    ButtonAction,
    ItemCard,
    ProjectDataModal
  },
  data() {
    return {
      projects: [],
      loading: true,
      error: null,
      showProjectDataModal: false,
      editingProject: {
        id: null,
        name: '',
        customer: ''
      }
    };
  },
  computed: {
    ...mapGetters('user', {
      getUserFullName: 'getUserFullName',
    }),
    formattedProjects() {
      return this.projects.map(project => ({
        id: project.id,
        name: project.name || 'Проект без назви',
        customer: project.customer || 'Без замовника',
        updatedAt: project.updatedAt,
        data: project.data || {}
      }));
    }
  },
  methods: {
    goToProject() {
      router.push('/plan-editor');
    },
    openProject(id) {
      router.push(`/plan-editor/${id}`);
    },
    editProject(project) {
      this.editingProject = { ...project };
      this.showProjectDataModal = true;
    },
    async handleProjectDataSave({ projectName, customerName }) {
      try {
        this.loading = true;
        // Get the current project data first
        const currentProject = await ProjectApi.getProject(this.editingProject.id);
        
        // Update only name and customer while preserving the existing data
        await ProjectApi.saveProject({
          id: this.editingProject.id,
          name: projectName,
          customer: customerName,
          data: currentProject.data.data, // Preserve the existing project data
          createdAt: currentProject.data.createdAt,
          updatedAt: new Date().toISOString()
        });
        
        await this.loadProjects(); // Reload the projects list
        this.showProjectDataModal = false;
      } catch (error) {
        console.error('Failed to update project:', error);
        this.error = 'Не вдалося оновити проект. Спробуйте пізніше.';
      } finally {
        this.loading = false;
      }
    },
    async deleteProject(id) {
      try {
        if (!confirm('Ви впевнені, що хочете видалити цей проект?')) {
          return;
        }
        
        this.loading = true;
        await ProjectApi.deleteProject(id);
        await this.loadProjects(); // Reload the projects list
      } catch (error) {
        console.error('Failed to delete project:', error);
        this.error = 'Не вдалося видалити проект. Спробуйте пізніше.';
      } finally {
        this.loading = false;
      }
    },
    formatDate(dateString) {
      if (!dateString) return 'Ніколи';
      const date = new Date(dateString);
      return date.toLocaleDateString('uk-UA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    async loadProjects() {
      try {
        this.loading = true;
        this.error = null;
        const response = await ProjectApi.getAllProjects();
        this.projects = response.data.projectShortResponses || [];
        if (this.error) {
          console.error('Error message:', this.error);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
        this.error = 'Не вдалося завантажити проекти. Спробуйте пізніше.';
      } finally {
        this.loading = false;
      }
    },
  },
  mounted() {
    this.loadProjects();
  },
}
</script>

<style scoped>
.home {
  min-height: 200px;
}

.projects {
  min-height: 200px;
}

.title-text {
  font-size: 2rem;
  font-weight: bold;
}
</style>