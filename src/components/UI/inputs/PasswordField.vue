<template>
  <div class="input-wrapper">
    <div :class="['input-container', { 'has-error': error }]">
      <div class="icon">
        <font-awesome-icon :icon="icon"/>
      </div>
      <input
          class="input-field"
          :class="[classes, error ? 'form-control-error' : '']"
          type="password"
          :id="id"
          :value="modelValue"
          :placeholder="placeholder"
          @input="$emit('update:modelValue', $event.target.value)"
          @change="$emit('change', $event.target.value)"
          @keydown.enter="submitValue($event, modelValue)"
      />
    </div>
    <p v-if="error" class="error-message">{{ error }}</p>
  </div>
</template>

<script>
export default {
  props: {
    id: {type: String, required: false},
    classes: {required: false},
    modelValue: {type: String, required: false},
    placeholder: {type: String, default: 'Введіть пароль...', required: true},
    icon: {type: [Array, String], default: 'fa-solid fa-key'},
    disabled: {type: Boolean, default: false},
    error: {type: String, default: ''},
  },
  methods: {
    submitValue(event, value) {
      this.$emit('submit', event);
      this.$emit('update:modelValue', value);
    },
  }
}
</script>