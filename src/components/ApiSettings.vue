<template>
  <div class="card bg-base-100 shadow-lg p-6 max-w-xl mx-auto my-6">
    <div class="card-body p-0">
      <h2 class="card-title mb-4">{{ i18n.t('welcomeToOcr') }}</h2>
      <p class="mb-4 text-sm opacity-80">{{ i18n.t('enterApiKeyPrompt') }}</p>
      
      <form @submit.prevent="saveKey" class="space-y-4">
        <div style="position: absolute; left: -9999px;" aria-hidden="true">
          <label for="fakeUsername">Username</label>
          <input type="text" id="fakeUsername" name="username" autocomplete="username" tabindex="-1">
        </div>
        
        <div class="form-control w-full">
          <label for="apiKeyInput" class="label">
            <span class="label-text">{{ i18n.t('apiKeyLabel') }}</span>
          </label>
          <div class="relative">
            <input
              :type="isPasswordVisible ? 'text' : 'password'"
              id="apiKeyInput"
              v-model="apiKeyLocal"
              :placeholder="i18n.t('apiKeyPlaceholder')"
              autocomplete="current-password"
              class="input input-bordered w-full pr-10" />
            <button 
              type="button" 
              class="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
              @click="togglePasswordVisibility"
            >
              <svg v-if="isPasswordVisible" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
          <label class="label">
            <span class="label-text-alt text-info">{{ i18n.t('apiKeySavedLocally') }}</span>
          </label>
        </div>
        
        <div class="card-actions justify-end mt-4">
          <button type="button" class="btn btn-error btn-outline" @click="clearApiKey">{{ i18n.t('clearApiKey') }}</button>
          <button type="submit" class="btn btn-accent">{{ i18n.t('getStarted') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useI18nStore } from '@/stores/i18nStore';

const props = defineProps({
  initialApiKey: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['save-api-key']);
const i18n = useI18nStore();

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

const clearApiKey = () => {
  localStorage.removeItem('googleVisionApiKey');
  apiKeyLocal.value = '';
  emit('save-api-key', '');
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