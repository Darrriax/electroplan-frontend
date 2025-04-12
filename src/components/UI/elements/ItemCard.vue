<template>
  <div class="image-card">
    <img :src="src" alt="image" class="image"/>
    <div class="description-box d-flex row">
      <div class="col-10">
        <div class="d-flex justify-content-center flex-column align-items-start ms-2">
          <div class="card-title-text primary-text"> {{ title }}</div>
          <div class="card-title-text small-text fw-bold">Customer: {{ customer }}</div>
        </div>
        <div class="d-flex justify-content-center flex-column align-items-start mt-3 ms-2">
          <div class="secondary-text small-text">Last changes: {{ lastChanges }}</div>
        </div>
      </div>
      <div class="col-2 d-flex justify-content-center flex-column align-items-center gap-2">
        <button-default icon="fa-solid fa-pen"/>
        <button-default icon="fa-solid fa-share-nodes"/>
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
  }
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
  height: 80px;
  display: flex;
  border-radius: 10px;
  text-align: center;
  z-index: 1;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1), 0 15px 25px rgba(0, 0, 0, 0.15);
}
</style>