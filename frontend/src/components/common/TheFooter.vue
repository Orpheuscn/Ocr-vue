<template>
  <footer class="py-4 text-center text-sm text-base-content opacity-70">
    <div>
      <a href="#" class="text-accent hover:underline mr-2" @click.prevent="openTutorial">{{ i18n.t('tutorial') }}</a>
      <span>|</span>
      <span class="ml-2">{{ i18n.t('copyright') }} &copy; {{ i18n.t('appTitle') }} 2025</span>
    </div>
  </footer>
</template>

<script setup>
import { useI18nStore } from '@/stores/i18nStore';

const i18n = useI18nStore();

// 定义打开教程的方法
const emit = defineEmits(['open-tutorial']);

const openTutorial = () => {
  emit('open-tutorial');
};
</script> 