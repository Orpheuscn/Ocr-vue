<template>
  <Transition name="slide-fade">
    <div v-if="isVisible" class="notification" :class="type">
      {{ message }}
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue';

const props = defineProps({
  message: { type: String, default: '' },
  type: { type: String, default: 'info' }, // info, success, error
  visible: { type: Boolean, default: false },
  duration: { type: Number, default: 3000 } // Auto-hide duration
});

const isVisible = ref(props.visible);
let timeoutId = null;

watch(() => props.visible, (newVal) => {
  isVisible.value = newVal;
  if (newVal) {
    // Clear previous timeout if a new notification comes in quickly
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      isVisible.value = false;
    }, props.duration);
  } else {
    clearTimeout(timeoutId); // Clear timeout if visibility is set to false externally
  }
}, { immediate: true }); // immediate:true needed if initial visible state needs timeout

// Cleanup timeout on unmount
onUnmounted(() => {
  clearTimeout(timeoutId);
});

</script>

<style scoped>
/* Using global styles defined in base.css for .notification */
/* Add transition styles */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.4s cubic-bezier(1, 0.5, 0.8, 1); /* Smoother exit */
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(30px); /* Slide in/out from right */
  opacity: 0;
}
</style>