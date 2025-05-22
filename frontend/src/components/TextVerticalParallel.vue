<template>
  <div class="text-output vertical-parallel">
    {{ verticalParallelText }}
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { useOcrStore } from '@/stores/ocrStore'
import { processSymbolText, shouldSkipSymbol, processVerticalParallelText } from '@/utils/textProcessors';
import { isCJKLanguage } from '@/services/languageService';

const store = useOcrStore();

// 使用工具函数中的getAverageCharWidth，不再需要在组件中定义

// 使用工具函数处理垂直并行文本
const verticalParallelText = computed(() => {
  const symbolsToProcess = store.filteredSymbolsData.filter(s => s.isFiltered);
  if (symbolsToProcess.length === 0) {
    return store.hasOcrResult ? '(无符合当前过滤条件的文本)' : '(无识别结果)';
  }
  
  // 使用工具函数处理垂直并行文本
  const resultText = processVerticalParallelText(symbolsToProcess, store.detectedLanguageCode, false);
  return resultText || '(无符合当前过滤条件的文本)';
});
</script>
<style scoped>
.text-output {
  white-space: pre-wrap;
  font-size: 1rem;
  line-height: 1.5;
  padding: 1rem;
  color: var(--bc, inherit); /* 使用主题颜色变量 */
  background-color: transparent; /* 透明背景 */
}

.vertical-parallel {
  writing-mode: vertical-rl;
  text-orientation: upright;
}
</style>