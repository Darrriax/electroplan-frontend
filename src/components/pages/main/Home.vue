<template>
  <layout>
    <div class="home d-flex justify-content-center align-items-start flex-column p-5">
      <div class="mt-5 ms-5">
        <div class="title-text primary-white-text">Hi there, {{ getUserFullName }}</div>
        <button-action label="Create new project" icon="fa-solid fa-plus" class="set-min-width mt-3"/>
      </div>
    </div>
    <h3 class="text-center my-3">My projects</h3>
    <hr>
    <div class="projects d-flex row row-cols-4 align-items-center justify-content-center gap-4 mx-5 px-5">
      <item-card src="../public/images/plan.jpg" last-changes="20/02/2025, 09:45" title="Some project"
                 customer="Max"/>
      <item-card src="../public/images/plan.jpg" last-changes="20/02/2025, 09:45" title="Some project"
                 customer="Max"/>
      <item-card src="../public/images/plan.jpg" last-changes="20/02/2025, 09:45" title="Some project"
                 customer="Max"/>
      <item-card src="../public/images/plan.jpg" last-changes="20/02/2025, 09:45" title="Some project"
                 customer="Max"/>
      <item-card src="../public/images/plan.jpg" last-changes="20/02/2025, 09:45" title="Some project"
                 customer="Max"/>
    </div>
  </layout>
</template>
<script>
import Layout from "../../UI/layouts/Layout.vue";
import ButtonAction from "../../UI/buttons/ButtonAction.vue";
import ItemCard from "../../UI/elements/ItemCard.vue";
import {mapGetters} from "vuex";

export default {
  name: "Profile",
  components: {
    Layout,
    ButtonAction,
    ItemCard,
  },
  computed: {
    ...mapGetters('user', {
      getUserFullName: 'getUserFullName',
    }),
  }
}
</script>