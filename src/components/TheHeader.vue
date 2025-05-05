<template>
  <header class="navbar bg-base-100 shadow-md px-4 sm:px-6">
    <div class="flex-1">
      <h1 class="text-xl font-semibold text-base-content">OCR 文本识别工具</h1>
    </div>
    <div class="flex-none gap-2">
      <ThemeToggle />
      <button 
        class="btn btn-sm btn-primary" 
        @click="emitToggle">
        {{ store.showApiSettings ? '隐藏' : '设置' }} API
      </button>
    </div>
  </header>
</template>

<script setup>
import { useOcrStore } from '@/stores/ocrStore';
import ThemeToggle from './ThemeToggle.vue';

// Define emits if toggling is handled by parent via event
const emit = defineEmits(['toggle-api']);

// Or directly call the store action (simpler if store is used everywhere)
const store = useOcrStore();
const emitToggle = () => {
  emit('toggle-api'); // 发出事件给父组件
};
</script>

<style scoped>
/* 暗色模式和亮色模式共用样式 */
header {
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap; /* Allow wrapping */
  gap: 1rem; /* Add gap for wrapping */
}

h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0; /* Reset margin */
}

.toggle-button {
  background-color: transparent;
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s, color 0.3s;
  white-space: nowrap;
}

.toggle-button:hover {
  background-color: var(--secondary-color);
}

@media (max-width: 480px) {
  header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>