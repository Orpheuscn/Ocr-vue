<template>
  <button @click="toggleLanguage" class="btn btn-ghost btn-circle" :title="switchLanguageText">
    <span class="font-bold text-base">
      {{ i18n.currentLang === 'zh' ? 'EN' : '中' }}
    </span>
  </button>
</template>

<script setup>
import { useI18nStore } from '@/stores/i18nStore'
import { computed } from 'vue'

const i18n = useI18nStore()

// 计算属性获取切换语言的文本
const switchLanguageText = computed(() => i18n.t('switchLanguage'))

const toggleLanguage = () => {
  i18n.toggleLanguage()
  // 语言切换已经在store中处理，不需要在这里做额外处理
  // i18n store 中的 currentLang 变化会自动触发响应
}
</script>

<style scoped>
/* 可选的自定义样式 */
</style>
