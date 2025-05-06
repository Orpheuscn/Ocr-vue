<template>
  <button 
    @click="toggleLanguage" 
    class="btn btn-ghost btn-circle"
    :title="i18n.t('switchLanguage')"
  >
    <span class="font-bold text-base">
      {{ i18n.currentLang === 'zh' ? 'EN' : '中' }}
    </span>
  </button>
</template>

<script setup>
import { useI18nStore } from '@/stores/i18nStore';

const i18n = useI18nStore();

const toggleLanguage = () => {
  i18n.toggleLanguage();
};
</script>

<style scoped>
/* 可选的自定义样式 */
</style> 