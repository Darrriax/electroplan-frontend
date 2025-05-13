<template>
  <div class="small-menu">
    <div class="small-menu-header">WallManager</div>
    <div class="small-menu-item" @click="handleSplit">
      <font-awesome-icon icon="fa-solid fa-scissors" class="orange-icon"/>
      <span>Split wall</span>
    </div>
    <div class="small-menu-item" @click="$emit('add-inner')">
      <font-awesome-icon icon="fa-solid fa-plus" class="orange-icon"/>
      <span>Add inner wall</span>
    </div>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
const emit = defineEmits(['split'])

const handleSplit = () => {
  emit('split')
}
</script>

<style scoped>
.small-menu {
  font-size: 10px;
  background: white;
  border-radius: 5px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  padding: 5px;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.2s ease;
}

.small-menu-header {
  font-weight: bold;
  font-size: 14px;
  color: orange;
  padding-bottom: 4px;
  border-bottom: 1px solid #eee;
  margin-bottom: 4px;
}

.small-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.small-menu-item:hover {
  background: rgba(255, 165, 0, 0.1);
}

.orange-icon {
  color: orange;
  font-size: 15px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
