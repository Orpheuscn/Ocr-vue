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
// 导入RTL支持，但要注意垂直排版通常不与RTL混用
// 如需之后扩展，可以增加垂直RTL的特殊处理逻辑
const store = useOcrStore();

// Helper function (can be moved to composable or utils if reused)
const getAverageCharWidth = (symbols) => {
    if (!symbols || symbols.length === 0) return 15; // Default width
    const validSymbols = symbols.filter(s => s.width > 0 && isFinite(s.width));
    const widthsPerChar = validSymbols
        .filter(s => s.text?.length > 0)
        .map(s => s.width / s.text.length);
    if (widthsPerChar.length > 0) {
        return widthsPerChar.reduce((a, b) => a + b, 0) / widthsPerChar.length;
    } else if (validSymbols.length > 0) {
        // Fallback: average symbol width if no text length
        return validSymbols.reduce((a,b) => a + b.width, 0) / validSymbols.length;
    } else {
        return 15; // Default fallback
    }
};

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