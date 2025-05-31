<template>
  <div class="image-card" @click="$emit('click')">
    <img :src="src" alt="зображення" class="image"/>
    <div class="description-box d-flex row">
      <div class="col-10">
        <div class="d-flex justify-content-center flex-column align-items-start ms-2">
          <div class="card-title-text primary-text">{{ title }}</div>
          <div class="card-title-text small-text fw-bold">Замовник: {{ customer }}</div>
        </div>
        <div class="d-flex justify-content-center flex-column align-items-start mt-2 ms-2">
          <div class="secondary-text small-text">Останні зміни:</div>
          <div class="secondary-text small-text">{{ lastChanges }}</div>
        </div>
      </div>
      <div class="col-2 d-flex justify-content-center flex-column align-items-center gap-2">
        <button-default icon="fa-solid fa-pen" @click.stop="$emit('edit')"/>
        <button-default icon="fa-solid fa-trash" class="delete-button" @click.stop="$emit('delete')"/>
      </div>
    </div>
  </div>
</template>

<script>
import ButtonSimple from "../../UI/buttons/ButtonSimple.vue";
import ButtonSecondary from "../../UI/buttons/ButtonSecondary.vue";
import ButtonDefault from "../buttons/ButtonDefault.vue";
export default {
  name: "ItemCard",
  components: {
    ButtonSimple,
    ButtonSecondary,
    ButtonDefault
  },
  props: {
    title: {
      type: String,
      required: true
    },
    customer: {
      type: String,
      required: false
    },
    src: {
      type: String,
      required: true
    },
    lastChanges: {
      type: String,
      required: true
    },
  },
  emits: ['edit', 'delete', 'click']
}
</script>

<style scoped>
.image-card {
  width: 250px;
  height: 300px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.image-card:hover {
  transform: translateY(-5px);
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
}

.description-box {
  position: relative;
  background: white;
  height: 100px;
  padding: 10px 0;
  display: flex;
  border-radius: 10px;
  text-align: center;
  z-index: 1;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1), 0 15px 25px rgba(0, 0, 0, 0.15);
}

.delete-button {
  color: #dc3545;
}

.delete-button:hover {
  color: #bb2d3b;
}
</style>