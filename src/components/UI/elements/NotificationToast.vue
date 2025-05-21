<template>
  <div class="notification-container">
    <transition-group name="notification">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="['notification', notification.type]"
        @click="removeNotification(notification.id)"
      >
        {{ notification.message }}
      </div>
    </transition-group>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';

export default {
  name: 'NotificationToast',
  computed: {
    ...mapState('notifications', ['notifications'])
  },
  methods: {
    ...mapActions('notifications', ['removeNotification'])
  },
  watch: {
    notifications: {
      handler(newNotifications) {
        // Auto-dismiss notifications after their duration
        newNotifications.forEach(notification => {
          if (notification.duration) {
            setTimeout(() => {
              this.removeNotification(notification.id);
            }, notification.duration);
          }
        });
      },
      deep: true,
      immediate: true
    }
  }
};
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification {
  padding: 12px 24px;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  min-width: 200px;
  max-width: 400px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.notification.error {
  background-color: #dc3545;
}

.notification.success {
  background-color: #28a745;
}

.notification.info {
  background-color: #17a2b8;
}

/* Transition animations */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style> 