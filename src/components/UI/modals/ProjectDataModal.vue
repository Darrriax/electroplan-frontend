<template>
  <div class="modal-wrapper" v-if="show">
    <div class="blur-overlay" @click.self="handleClose"></div>
    <div class="modal-overlay" @click.self="handleClose">
      <div class="card-box col-sm-8 col-md-6 col-lg-4 col-xxl-4 m-auto">
        <div class="d-flex justify-content-between align-items-center p-4">
          <h3 class="mb-0">{{ isEditing ? 'Редагувати дані проекту' : 'Додати дані проекту' }}</h3>
          <button-default 
              @click="handleClose" 
              icon="fa-solid fa-xmark" 
              class="close-btn"
          />
        </div>
        
        <form @submit.prevent="handleSubmit">
          <div class="mt-2">
            <text-field
              placeholder="Назва проекту"
              icon="fa-solid fa-file-signature"
              v-model="projectName"
              :error="errors.projectName"
              class="mb-3"
            />
            <text-field
              placeholder="Ім'я замовника"
              icon="fa-solid fa-user-tie"
              v-model="customerName"
              :error="errors.customerName"
              class="mb-3"
            />
            
            <div class="text-center">
              <button-simple :label="isEditing ? 'Зберегти зміни' : 'Зберегти проект'" class="set-min-width mt-4"/>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import TextField from '../inputs/TextField.vue'
import ButtonSimple from '../buttons/ButtonSimple.vue'
import ButtonDefault from '../buttons/ButtonDefault.vue'

export default {
  name: 'ProjectDataModal',
  components: {
    TextField,
    ButtonSimple,
    ButtonDefault
  },
  props: {
    show: {
      type: Boolean,
      required: true
    },
    initialProjectName: {
      type: String,
      default: ''
    },
    initialCustomerName: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      projectName: '',
      customerName: '',
      errors: {
        projectName: '',
        customerName: ''
      }
    }
  },
  computed: {
    isEditing() {
      return Boolean(this.initialProjectName || this.initialCustomerName);
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        // When modal opens, initialize with provided values
        this.projectName = this.initialProjectName;
        this.customerName = this.initialCustomerName;
        // Reset errors
        this.errors = {
          projectName: '',
          customerName: ''
        };
      }
    }
  },
  methods: {
    handleClose() {
      // Reset form when closing
      this.projectName = '';
      this.customerName = '';
      this.errors = {
        projectName: '',
        customerName: ''
      };
      this.$emit('close');
    },
    handleSubmit() {
      // Reset errors
      this.errors = {
        projectName: '',
        customerName: ''
      }

      // Validate
      let isValid = true
      if (!this.projectName.trim()) {
        this.errors.projectName = 'Назва проекту обов\'язкова'
        isValid = false
      }
      if (!this.customerName.trim()) {
        this.errors.customerName = 'Ім\'я замовника обов\'язкове'
        isValid = false
      }

      if (isValid) {
        this.$emit('save', {
          projectName: this.projectName.trim(),
          customerName: this.customerName.trim()
        });
        
        // Only reset if not editing
        if (!this.isEditing) {
          this.projectName = '';
          this.customerName = '';
        }
      }
    }
  }
}
</script>

<style scoped>
.modal-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
}

.blur-overlay {
  position: fixed;
  top: 58px; /* Height of Navigation component */
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(5px);
  z-index: 9999;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  margin-top: 60px;
  pointer-events: none;
}

.modal-overlay > * {
  pointer-events: auto;
}

.card-box {
  background: rgba(255, 255, 255, 0.7);
}

.close-btn {
  background: none;
}

.close-btn:hover {
  color: var(--text-color-error);
}
</style> 