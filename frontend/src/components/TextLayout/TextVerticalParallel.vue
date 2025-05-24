<template>
  <div class="vertical-text-container">
    <div class="vertical-parallel">
      {{ verticalParallelText }}
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { useOcrStore } from '@/stores/ocrStore'
import { processVerticalParallelText } from '@/utils/textProcessors'

const store = useOcrStore()

// 使用工具函数中的getAverageCharWidth，不再需要在组件中定义

// 使用工具函数处理垂直并行文本
const verticalParallelText = computed(() => {
  const symbolsToProcess = store.filteredSymbolsData.filter((s) => s.isFiltered)
  if (symbolsToProcess.length === 0) {
    return store.hasOcrResult ? '(无符合当前过滤条件的文本)' : '(无识别结果)'
  }

  // 使用工具函数处理垂直并行文本
  const resultText = processVerticalParallelText(
    symbolsToProcess,
    store.detectedLanguageCode,
    false,
  )
  return resultText || '(无符合当前过滤条件的文本)'
})
</script>
<style scoped>
.vertical-text-container {
  width: 100%;
  height: 100%;
  overflow-x: auto;
  overflow-y: auto;
  white-space: nowrap;
  padding: 0;
  margin: 0;
  display: block;
  /* 隐藏垂直滚动条但保持滚动功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

/* 隐藏垂直滚动条 */
.vertical-text-container::-webkit-scrollbar {
  display: none; /* Chrome/Safari/Edge */
}

.vertical-parallel {
  display: inline-block;
  writing-mode: vertical-rl;
  text-orientation: upright;
  white-space: pre-wrap;
  font-size: 1rem;
  line-height: 1.5;
  padding: 1rem;
  color: var(--bc, inherit); /* 使用主题颜色变量 */
  background-color: transparent; /* 透明背景 */
  height: fit-content;
  min-width: max-content; /* 确保内容不被压缩 */
}
</style>
