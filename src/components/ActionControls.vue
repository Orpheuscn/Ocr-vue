<template>
  <div class="action-controls-wrapper">
    <div class="display-options-container">
      <span>初始识别方向:</span>
      <label>
        <input
          type="radio"
          name="initialTextDirection"
          value="horizontal"
          :checked="selectedDirection === 'horizontal'"
          :disabled="isProcessing"
          @change="updateDirection('horizontal')"
        /> 正常
      </label>
      <label>
        <input
          type="radio"
          name="initialTextDirection"
          value="vertical"
          :checked="selectedDirection === 'vertical'"
          :disabled="isProcessing"
          @change="updateDirection('vertical')"
        /> 竖排
      </label>
    </div>

    <div class="action-buttons">
      <button
        class="primary-button"
        :disabled="!canStart || isProcessing"
        @click="startOcr"
      >
        {{ isProcessing ? '处理中...' : '开始识别' }}
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