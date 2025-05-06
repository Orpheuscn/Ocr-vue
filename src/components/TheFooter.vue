<template>
  <footer class="py-4 text-center text-sm text-base-content opacity-70">
    {{ i18n.t('copyright') }} &copy; {{ i18n.t('appTitle') }} 2025
  </footer>
</template>

<script setup>
import { useI18nStore } from '@/stores/i18nStore';

const i18n = useI18nStore();
</script> 