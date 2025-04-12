<template>
  <div class="message-wrapper">
    <div
        :class="[classes, messageDisplay, (/помилка/i.test(label)) ? 'message-error' : '']"
        class="message-card"
    >
      <small class="message-text">{{ label }}</small>
    </div>
  </div>
</template>

<script>
export default {
  name: "Message",
  props: {
    classes: {required: false},
    label: {type: String, required: true},
  },
  computed: {
    messageDisplay() {
      return this.label !== "" ? 'show-message' : 'hide-message';
    },
  },
}
</script>