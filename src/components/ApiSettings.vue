<template>
  <div class="api-container">
    <form @submit.prevent="saveKey">
      <div style="position: absolute; left: -9999px;" aria-hidden="true">
        <label for="fakeUsername">Username</label>
        <input type="text" id="fakeUsername" name="username" autocomplete="username" tabindex="-1">
      </div>
      <div class="api-input-group">
        <label for="apiKeyInput">Google Cloud Vision API 密钥:</label>
        <div class="password-container">
          <input
            :type="isPasswordVisible ? 'text' : 'password'"
            id="apiKeyInput"
            v-model="apiKeyLocal"
            placeholder="输入您的 API 密钥"
            autocomplete="current-password" />
          <button type="button" class="eye-button" @click="togglePasswordVisibility">
            {{ isPasswordVisible ? '🙈' : '👁️' }}
          </button>
        </div>
      </div>
      <button type="submit" class="primary-button">保存</button>
    </form>
  </div>
</template>
<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  initialApiKey: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['save-api-key']);

const apiKeyLocal = ref(props.initialApiKey);
const isPasswordVisible = ref(false);

// Keep local state synced if prop changes externally (e.g., loaded from store)
watch(() => props.initialApiKey, (newVal) => {
  apiKeyLocal.value = newVal;
});

const togglePasswordVisibility = () => {
  isPasswordVisible.value = !isPasswordVisible.value;
};

const saveKey = () => {
  emit('save-api-key', apiKeyLocal.value);
};
</script>

<style scoped>
/* Styles from original .api-container */
.api-container {
    background-color: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-bottom: 1.5rem; /* Or controlled by parent gap */
    /* Animation can be added using Vue's <Transition> in parent */
}

.api-input-group {
    display: flex;
    flex-direction: column;
    margin-bottom: 1rem;
}

.api-input-group label {
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: var(--text-color); /* Ensure text color */
}

.password-container {
    position: relative;
    display: flex;
}

.password-container input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 1rem;
    padding-right: 40px; /* Space for eye button */
}

.eye-button {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 40px; /* Fixed width */
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1.2rem; /* Larger icon */
    color: var(--text-color);
    opacity: 0.7;
    display: flex;
    align-items: center;
    justify-content: center;
}

.eye-button:hover {
    opacity: 1;
}

.primary-button {
    background-color: var(--primary-color);
    color: white;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.3s;
}

.primary-button:hover {
    background-color: var(--hover-color);
}
</style>