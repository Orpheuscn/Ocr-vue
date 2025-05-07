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

// 添加一个专属的标点替换函数，用于处理原始文本中的标点符号
function replaceCJKPunctuationInRawText(text) {
  if (!text || !store.detectedLanguageCode) return text;
  
  const noSpaceLanguages = ['zh', 'ja', 'ko', 'th', 'lo', 'my'];
  if (!noSpaceLanguages.includes(store.detectedLanguageCode)) return text;
  
  // 使用正则表达式一次性替换所有标点符号
  return text
    .replace(/,/g, '，')  // 替换逗号
    .replace(/-/g, '——') // 替换连字符为破折号
    .replace(/;/g, '；')  // 替换分号
    .replace(/!/g, '！')  // 替换感叹号
    .replace(/\?/g, '？') // 替换问号
    .replace(/:/g, '：');  // 替换冒号
}

// 直接使用OCR返回的原始完整文本
const fullText = computed(() => {
  // 从store中获取原始文本
  const rawText = store.fullTextAnnotation?.text || '';
  
  // 如果存在文本并且过滤器设置为默认值，应用标点替换后返回完整文本
  const isDefaultFilter = checkIfDefaultFilter();
  
  if (rawText && isDefaultFilter) {
    // 在返回原始文本前应用标点替换
    return replaceCJKPunctuationInRawText(rawText);
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
  const noSpaceLanguages = ['zh', 'ja', 'ko', 'th', 'lo', 'my']; // 不使用空格的语言
  
  symbolsToProcess.forEach(symbol => {
    if (symbol.isFiltered) {
      // 使用与 TextHorizontalParagraph 相同的逻辑直接处理 CJK 标点符号
      if (noSpaceLanguages.includes(store.detectedLanguageCode)) {
        // 替换西方标点为 CJK 标点
        if (symbol.text === ',') {
          text += '，'; // 替换逗号
        } else if (symbol.text === '-') {
          text += '——'; // 替换连字符为破折号
        } else if (symbol.text === ';') {
          text += '；'; // 替换分号
        } else if (symbol.text === '!') {
          text += '！'; // 替换感叹号
        } else if (symbol.text === '?') {
          text += '？'; // 替换问号
        } else if (symbol.text === ':') {
          text += '：'; // 替换冒号
        } else {
          text += symbol.text;
        }
      } else {
        text += symbol.text;
      }
      
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