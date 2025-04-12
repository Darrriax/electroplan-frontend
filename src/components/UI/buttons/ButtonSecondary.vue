<template>
  <button
      class="btn btn-primary rounded-pill align-items-center row-cols-2"
      :class="classes"
      :title="label"
      @hover="$emit('hover')"
  >
    <font-awesome-icon :icon="icon" v-if="!label && icon" class="w100 min-w-20"/>
    <font-awesome-icon :icon="icon" v-if="label && icon" class="w-auto m-r-15"/>
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