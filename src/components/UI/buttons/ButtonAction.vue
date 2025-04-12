<template>
  <button
      class="create-new"
      :class="classes"
      :title="label"
      @hover="$emit('hover')"
  >
    <font-awesome-icon :icon="icon" v-if="icon" class="me-2"/>
    {{ label }}
  </button>
</template>

<script>
export default {
  name: "Button",
  props: {
    label: {
      type: String,
      required: false
    },
    classes: {
      required: false
    },
    icon: {
      type: String,
      required: false
    },
  }
}
</script>