<template>
  <div class="text-output" :class="{ 'rtl-text': isRtl }">
    {{ horizontalParallelText }}
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useOcrStore } from '@/stores/ocrStore'
import { processHorizontalParallelText } from '@/utils/textProcessors'

defineProps({
  isRtl: { type: Boolean, default: false },
})

const store = useOcrStore()

// 使用工具函数处理水平并行文本
const horizontalParallelText = computed(() => {
  if (!store.filteredSymbolsData) {
    return store.hasOcrResult ? '(无符合当前过滤条件的文本)' : '(无识别结果)'
  }
  
  // 使用工具函数处理水平并行文本
  // 现在 processHorizontalParallelText 函数的参数与 processHorizontalParagraphText 保持一致
  const resultText = processHorizontalParallelText(
    store.fullTextAnnotation, 
    store.filteredSymbolsData, 
    store.detectedLanguageCode
  );
  return resultText || '(无符合当前过滤条件的文本)';
})

// 错误信息已经集成到 horizontalParallelText 中
</script>

<style scoped>
.text-output {
  font-size: 1rem;
  line-height: 1.5;
  padding: 1rem;
  border-radius: 4px;
  background-color: transparent; /* 透明背景 */
  color: var(--bc, inherit); /* 使用主题颜色变量 */
  white-space: pre-wrap; /* 保留空格和换行 */
  word-wrap: break-word; /* 允许长单词换行 */
}

/* 对内容容器的样式 */
.text-output > div {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  font-family: inherit; /* 使用普通字体而不是等宽字体 */
  color: var(--bc, inherit); /* 使用主题颜色变量 */
}

/* RTL文本样式 */
.rtl-text {
  direction: rtl;
  font-family: 'Arial', 'Tahoma', 'Noto Sans Arabic', 'Noto Sans Hebrew', sans-serif;
  /* 使用更适合阿拉伯文和希伯来文显示的字体 */
}
</style>
