<template>
  <div class="input-wrapper">
    <div :class="['input-container', { 'has-error': error }]">
      <div class="icon">
        <font-awesome-icon :icon="icon"/>
      </div>
    <input
        class="input-field"
        style="font-size: var(--font-size-xs)"
        :class="[classes, error ? 'form-control-error' : '']"
        :type="type"
        :id="id"
        :value="modelValue"
        :placeholder="placeholder"
        :maxlength="maxlength"
        :minlength="minlength"
        :max="max"
        :min="min"
        :disabled="disabled"
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
    type: {type: String, required: false},
    maxlength: {type: String, required: false},
    minlength: {type: String, required: false},
    max: {type: String, required: false},
    min: {type: String, required: false},
    classes: {required: false},
    modelValue: {type: String, required: false},
    placeholder: {type: String, default: 'Input text...', required: true},
    icon: {type: [Array, String], default: 'fa-solid fa-search'},
    disabled: {type: Boolean, default: false},
    error: {type: String, default: ''},
  },
  methods: {
    submitValue(event, value) {
      this.$emit('submit', event);
      this.$emit('update:modelValue', value);
    },
  },
}
</script>