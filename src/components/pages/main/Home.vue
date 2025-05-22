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
    <div v-if="loading" class="text-center">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
    <div v-else-if="projects.length === 0" class="text-center">
      <p>You don't have any projects yet. Create your first project!</p>
    </div>
    <div v-else class="projects d-flex row row-cols-4 align-items-center justify-content-center gap-4 mx-5 px-5">
      <item-card
        v-for="project in projects"
        :key="project.id"
        src="../public/images/plan.jpg"
        :last-changes="project.lastUpdated"
        :title="project.title"
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
    };
  },
  computed: {
    ...mapGetters('user', {
      getUserFullName: 'getUserFullName',
    }),
  },
  methods: {
    goToProject() {
      router.push('/plan-editor');
    },
    openProject(id) {
      router.push(`/plan-editor/${id}`);
    },
    async loadProjects() {
      try {
        this.loading = true;
        const response = await ProjectApi.getAllProjects();
        this.projects = response.data.projectShortResponses;
      } catch (error) {
        console.error('Failed to load projects:', error);
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