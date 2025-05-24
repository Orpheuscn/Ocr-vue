<template>
  <Transition name="fade">
    <div v-if="isLoading" class="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50">
      <div class="card bg-base-100 p-8 max-w-sm text-center shadow-xl">
        <div class="flex justify-center items-center">
          <span class="loading loading-bars loading-xl text-accent mb-4"></span>
        </div>
        <p class="text-lg font-medium">{{ message || '处理中...' }}</p>
      </div>
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
/* 只保留过渡动画相关的样式 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>