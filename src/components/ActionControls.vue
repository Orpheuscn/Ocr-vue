<template>
  <div class="card bg-base-100 shadow-sm p-4">
    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <span class="text-sm font-medium">识别方向:</span>
        <div class="btn-group">
          <button 
            :class="[
              'btn btn-sm',
              selectedDirection === 'horizontal' ? 'btn-primary' : 'btn-outline'
            ]"
            :disabled="isProcessing"
            @click="updateDirection('horizontal')"
          >
            正常
          </button>
          <button 
            :class="[
              'btn btn-sm',
              selectedDirection === 'vertical' ? 'btn-primary' : 'btn-outline'
            ]"
            :disabled="isProcessing" 
            @click="updateDirection('vertical')"
          >
            竖排
          </button>
        </div>
      </div>

      <button
        class="btn btn-primary w-full md:w-auto"
        :class="{'btn-disabled': !canStart || isProcessing, 'loading': isProcessing}"
        :disabled="!canStart || isProcessing"
        @click="startOcr"
      >
        {{ isProcessing ? '识别中...' : '开始识别' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  canStart: { type: Boolean, default: false },
  isProcessing: { type: Boolean, default: false },
  initialDirection: { type: String, default: 'horizontal' } // From store
});

const emit = defineEmits(['start-ocr']);

const selectedDirection = ref(props.initialDirection);

// Update local state if prop changes (e.g., on reset)
watch(() => props.initialDirection, (newVal) => {
  selectedDirection.value = newVal;
});

const updateDirection = (direction) => {
  selectedDirection.value = direction;
};

const startOcr = () => {
  emit('start-ocr', selectedDirection.value);
};
</script>

<style scoped>
/* Styles from original .action-buttons and .display-options-container */
.action-controls-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.display-options-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    padding: 0.5rem;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    flex-wrap: wrap; /* Allow wrapping */
}
.display-options-container span {
    font-weight: 500;
    font-size: 0.9rem;
}
.display-options-container label {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.9rem;
}
.display-options-container input[type="radio"] {
    cursor: pointer;
}
.display-options-container input[type="radio"]:disabled {
    cursor: not-allowed;
}
.display-options-container label:has(input:disabled) { /* Style label when radio is disabled */
     color: #aaa;
     cursor: not-allowed;
}


.action-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem; /* If more buttons are added */
}

.primary-button {
    background-color: var(--primary-color);
    color: white;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.3s, opacity 0.3s;
    min-width: 150px;
    text-align: center;
}

.primary-button:hover:not(:disabled) {
    background-color: var(--hover-color);
}

.primary-button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
    opacity: 0.7;
}
</style>