<template>
  <Transition name="fade">
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p>{{ message || '处理中...' }}</p>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  isLoading: { type: Boolean, default: false },
  message: { type: String, default: '处理中...' }
});
</script>

<style scoped>
/* Styles from original .loading-overlay */
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.75); /* Slightly darker */
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    color: white;
    /* display: none; Managed by v-if */
}

.spinner {
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white; /* Only top border colored */
    width: 45px;
    height: 45px;
    animation: spin 0.8s linear infinite;
    margin-bottom: 1.2rem;
}

.loading-overlay p {
    font-size: 1rem;
    font-weight: 500;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>