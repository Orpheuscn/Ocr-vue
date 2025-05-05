<template>
  <div class="text-output" :class="{ 'rtl-text': isRtl }">
    <pre v-if="fullText">{{ fullText }}</pre>
    <p v-else>{{ noResultsMessage }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';

const props = defineProps({
  isRtl: {
    type: Boolean,
    default: false
  }
});

const store = useOcrStore();

// 直接使用OCR返回的原始完整文本
const fullText = computed(() => {
  // 从store中获取原始文本
  const rawText = store.fullTextAnnotation?.text || '';
  
  // 如果存在文本并且过滤器设置为默认值，直接返回完整文本
  const isDefaultFilter = checkIfDefaultFilter();
  
  if (rawText && isDefaultFilter) {
    return rawText;
  }
  
  // 否则使用过滤后的文本
  return store.originalFullText ? generateFilteredText() : '';
});

// 检查是否使用默认过滤器设置
function checkIfDefaultFilter() {
  // 简单检查过滤器设置是否为全部显示
  const { filterSettings, filterBounds } = store;
  
  if (!filterSettings || !filterBounds) return true;
  
  // 检查当前过滤器是否是最大范围（即全部显示）
  return (
    filterSettings.minWidth === filterBounds.width?.min &&
    filterSettings.maxWidth === filterBounds.width?.max &&
    filterSettings.minX === filterBounds.x?.min &&
    filterSettings.maxX === filterBounds.x?.max &&
    filterSettings.minY === filterBounds.y?.min &&
    filterSettings.maxY === filterBounds.y?.max
  );
}

// 生成过滤后的文本
function generateFilteredText() {
  const symbolsToProcess = store.filteredSymbolsData;
  if (!symbolsToProcess || symbolsToProcess.length === 0) {
    return '';
  }
  
  let text = '';
  symbolsToProcess.forEach(symbol => {
    if (symbol.isFiltered) {
      text += symbol.text;
      const breakType = symbol.detectedBreak;
      if (breakType === 'SPACE' || breakType === 'EOL_SURE_SPACE') {
        text += ' ';
      } else if (breakType === 'LINE_BREAK' || breakType === 'HYPHEN') {
        text += '\n';
      }
    }
  });
  
  return text.replace(/ +/g, ' ').replace(/\n+/g, '\n').trim();
}

// 无结果时的提示信息
const noResultsMessage = computed(() => {
  return store.hasOcrResult ? '(无符合当前过滤条件的文本)' : '(无识别结果)';
});
</script>

<style scoped>
.text-output {
  font-size: 1rem;
  line-height: 1.5;
  padding: 1rem;
  border-radius: 4px;
  background-color: transparent; /* 透明背景 */
  color: var(--bc, inherit); /* 使用主题颜色变量 */
}

pre {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  font-family: inherit; /* 使用普通字体而不是等宽字体 */
  color: var(--bc, inherit); /* 使用主题颜色变量 */
}

/* RTL文本样式 */
.rtl-text {
  text-align: right;
  direction: rtl;
  font-family: 'Arial', 'Tahoma', 'Noto Sans Arabic', 'Noto Sans Hebrew', sans-serif;
  /* 使用更适合阿拉伯文和希伯来文显示的字体 */
}
</style>