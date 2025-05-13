<template>
  <div class="small-menu">
    <div class="small-menu-header">WallManager</div>
    <NumberField
        v-model="length"
        placeholder="Enter length"
        type="number"
        :min="0"
        @submit="handleSubmit"
    />
    <div class="actions w-100">
      <button @click="close">Cancel</button>
      <button @click="addWall">Add</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import NumberField from '../inputs/NumberField.vue'

const emit = defineEmits(['add', 'close'])
const length = ref('')

const handleSubmit = () => {
  if (length.value > 0) {
    emit('add', parseFloat(length.value))
    length.value = ''
  }
}

const close = () => emit('close')
</script>

<style scoped>
.actions {
  display: flex;
  justify-content: space-between;
  width: 100%;
  gap: 3px;
}

button {
  background: orange;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  flex: 1;
}

button:hover {
  background: #e57c00;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>