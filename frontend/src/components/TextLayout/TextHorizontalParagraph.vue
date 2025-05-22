<template>
  <div class="text-output" :class="{ 'rtl-text': isRtl }">
    {{ paragraphText }}
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useOcrStore } from '@/stores/ocrStore'
import { processHorizontalParagraphText } from '@/utils/textProcessors'

defineProps({
  isRtl: {
    type: Boolean,
    default: false,
  },
})

const store = useOcrStore()

const paragraphText = computed(() => {
  if (!store.fullTextAnnotation?.pages || !store.filteredSymbolsData) {
    return store.hasOcrResult ? '(无符合当前过滤条件的文本)' : '(无识别结果)'
  }
  
  // 直接使用工具函数处理水平段落文本
  // 这样可以避免重复逻辑，确保所有文本处理都在工具函数中进行
  const resultText = processHorizontalParagraphText(
    store.fullTextAnnotation, 
    store.filteredSymbolsData, 
    store.detectedLanguageCode
  );
  
  return resultText || '(无符合当前过滤条件的文本)';
})
</script>

<style scoped>
.text-output {
  font-size: 1rem;
  line-height: 1.5;
  padding: 1rem;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--bc, inherit); /* 使用主题颜色变量 */
  background-color: transparent; /* 透明背景 */
}

/* RTL文本样式 */
.rtl-text {
  text-align: right;
  direction: rtl;
  font-family: 'Arial', 'Tahoma', 'Noto Sans Arabic', 'Noto Sans Hebrew', sans-serif;
  /* 使用更适合阿拉伯文和希伯来文显示的字体 */
}
</style>
