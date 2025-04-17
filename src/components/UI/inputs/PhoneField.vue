<template>
  <div class="input-wrapper">
    <div :class="['input-container', { 'has-error': error }]">
      <div class="icon">
        <font-awesome-icon :icon="icon"/>
      </div>
      <input
          class="input-field"
          :class="[classes, error ? 'form-control-error' : '']"
          :id="id"
          :placeholder="placeholder"
          :value="modelValue"
          v-mask="'38(0##)###-##-##'"
          @input="$emit('update:modelValue', $event.target.value)"
          @change="$emit('change', $event.target.value)"
          @keydown.enter="submitValue"
      />
    </div>
    <p v-if="error" class="error-message">{{ error }}</p>
  </div>
</template>

<script>
import {mask} from 'vue-the-mask'

export default {
  props: {
    id: {type: String, required: false},
    modelValue: {type: String, required: false},
    classes: {required: false},
    placeholder: {type: String, default: '38(0__)___-__-__'},
    disabled: {type: Boolean, default: false},
    error: {type: String, default: ''},
    icon: {type: [Array, String], default: 'fa-solid fa-phone'},
  },
  directives: {mask},
  methods: {
    submitValue(event, value) {
      this.$emit('submit', event);
      this.$emit('update:modelValue', value);
    },
  }
}
</script>