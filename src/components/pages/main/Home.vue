<template>
  <layout>
    <div class="home d-flex justify-content-center align-items-start flex-column p-5">
      <div class="mt-5 ms-5">
        <div class="title-text primary-white-text">Hi there, {{ getUserFullName }}</div>
        <button-action label="Create new project" @click="goToProject" icon="fa-solid fa-plus" class="set-min-width mt-3"/>
      </div>
    </div>
    <h3 class="text-center my-3">My projects</h3>
    <hr>
    <div v-if="error" class="alert alert-danger text-center" role="alert">
      {{ error }}
    </div>
    <div v-else-if="loading" class="text-center">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
    <div v-else-if="projects.length === 0" class="text-center">
      <p>You don't have any projects yet. Create your first project!</p>
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
      />
    </div>
  </layout>
</template>
<script>
import Layout from "../../UI/layouts/Layout.vue";
import ButtonAction from "../../UI/buttons/ButtonAction.vue";
import ItemCard from "../../UI/elements/ItemCard.vue";
import {mapGetters} from "vuex";
import router from "../../../router/index.js";
import { ProjectApi } from "../../../api/api";

export default {
  name: "Profile",
  components: {
    Layout,
    ButtonAction,
    ItemCard,
  },
  data() {
    return {
      projects: [],
      loading: true,
      error: null,
    };
  },
  computed: {
    ...mapGetters('user', {
      getUserFullName: 'getUserFullName',
    }),
    formattedProjects() {
      return this.projects.map(project => ({
        id: project.id,
        name: project.name || 'Untitled Project',
        customer: project.customer || 'No Customer',
        updatedAt: project.updatedAt,
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
    formatDate(dateString) {
      if (!dateString) return 'Never';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
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
        this.error = 'Failed to load projects. Please try again later.';
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