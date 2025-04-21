<template>
  <button
      class="button-default-background fa-lg d-flex gap-2 align-items-center"
      :class="classes"
      :title="label"
      @hover="$emit('hover')"
  >
    <font-awesome-icon :icon="icon" v-if="icon" class="icon-size-md"/>
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