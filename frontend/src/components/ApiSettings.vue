<template>
  <div class="card bg-base-100 shadow-lg p-6 max-w-xl mx-auto my-6">
    <div class="card-body p-0">
      <h2 class="card-title mb-4">{{ i18n.t('welcomeToOcr') }}</h2>
      <p class="mb-4 text-sm opacity-80">{{ i18n.t('enterApiKeyPrompt') }}</p>
      
      <form @submit.prevent="saveKey" class="space-y-4">
        <div class="form-control w-full">
          <p class="text-md mb-4">
            本应用将使用服务器配置的API密钥进行OCR识别服务，无需手动输入密钥。
          </p>
          <p class="text-xs opacity-70 mt-1">
            系统将自动使用服务器配置的API密钥，为您提供OCR服务。
          </p>
        </div>
        
        <div class="card-actions justify-end mt-4">
          <button type="submit" class="btn btn-accent">{{ i18n.t('getStarted') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18nStore } from '@/stores/i18nStore';

const emit = defineEmits(['save-api-key']);
const i18n = useI18nStore();

const saveKey = () => {
  // 标记使用服务器API密钥
  localStorage.setItem('useServerApiKey', 'true');
  localStorage.removeItem('googleVisionApiKey');
  emit('save-api-key', '');
};

// 初始化设置
localStorage.setItem('useServerApiKey', 'true');
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