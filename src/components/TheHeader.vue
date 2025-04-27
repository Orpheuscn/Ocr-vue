<template>
  <header>
    <h1>OCR 文本提取工具</h1>
    <button class="toggle-button" @click="emitToggle">
      {{ store.showApiSettings ? '隐藏' : '显示' }} API 设置
    </button>
  </header>
</template>

<script setup>
import { useOcrStore } from '@/stores/ocrStore';

// Define emits if toggling is handled by parent via event
const emit = defineEmits(['toggle-api']);

// Or directly call the store action (simpler if store is used everywhere)
const store = useOcrStore();
const emitToggle = () => {
  store.toggleApiSettings(); // Call store action directly
  // emit('toggle-api'); // Alternative: Emit event for parent if needed
};
</script>

<style scoped>
/* Styles from original header */
header {
    background-color: white;
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
    color: var(--primary-color);
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