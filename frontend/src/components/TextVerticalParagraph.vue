<template>
  <div class="text-output vertical-paragraph">
    {{ verticalParagraphText }}
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';
import { processSymbolText, cleanLineBreaks, shouldSkipSymbol, processVerticalParagraphText } from '@/utils/textProcessors';
import { isCJKLanguage } from '@/services/languageService';

const store = useOcrStore();

// ... existing code ...
const verticalParagraphText = computed(() => {
  if (!store.fullTextAnnotation?.pages || !store.filteredSymbolsData) {
    return store.hasOcrResult ? '(无符合当前过滤条件的文本)' : '(无识别结果)';
  }

  // 使用工具函数处理垂直段落文本
  const resultText = processVerticalParagraphText(store.fullTextAnnotation, store.filteredSymbolsData, store.detectedLanguageCode);
  return resultText || '(无符合当前过滤条件的文本)';
});

// 添加isRtl属性以保持组件接口一致性
defineProps({
  isRtl: {
    type: Boolean,
    default: false
    // 注意：垂直排版模式下RTL通常不适用
  }
});

</script>

<style scoped>
.text-output {
  white-space: pre-wrap; /* 保留换行符 */
  font-size: 1rem;
  line-height: 1.5;
  padding: 1rem;
  color: var(--bc, inherit); /* 使用主题颜色变量 */
  background-color: transparent; /* 透明背景 */
}

.vertical-paragraph {
  writing-mode: vertical-rl;
  text-orientation: upright;
}
</style>