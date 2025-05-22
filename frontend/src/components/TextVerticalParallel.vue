<template>
  <div class="text-output vertical-parallel">
    {{ verticalParallelText }}
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { useOcrStore } from '@/stores/ocrStore'
import { isNoSpaceLanguage } from '@/services/languageService';
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

const verticalParallelText = computed(() => {
  const symbolsToProcess = store.filteredSymbolsData.filter(s => s.isFiltered);
  if (symbolsToProcess.length === 0) {
    return store.hasOcrResult ? '(无符合当前过滤条件的文本)' : '(无识别结果)';
  }
  
  // 创建一个新数组，不修改原始数据
  const processedSymbols = symbolsToProcess.map(symbol => {
    // 使用 languageService 中的函数判断是否为不使用空格的语言
    let processedText = '';
    
    // 使用与 TextHorizontalParagraph 相同的逻辑处理 CJK 标点符号
    if (isNoSpaceLanguage(store.detectedLanguageCode)) {
      // 替换西方标点为 CJK 标点
      if (symbol.text === ',') {
        processedText = '，'; // 替换逗号
      } else if (symbol.text === '-') {
        processedText = '——'; // 替换连字符为破折号
      } else if (symbol.text === ';') {
        processedText = '；'; // 替换分号
      } else if (symbol.text === '!') {
        processedText = '！'; // 替换感叹号
      } else if (symbol.text === '?') {
        processedText = '？'; // 替换问号
      } else if (symbol.text === ':') {
        processedText = '：'; // 替换冒号
      } else {
        processedText = symbol.text;
      }
    } else {
      processedText = symbol.text;
    }
    
    return { ...symbol, text: processedText };
  });
  
  // 1. 计算平均字符宽度
  const avgWidth = getAverageCharWidth(processedSymbols);
  const columnThreshold = avgWidth * 0.75; // 统一使用这个阈值
  
  // 2. 初始排序：使用与新代码相同的逻辑
  processedSymbols.sort((a, b) => {
    const colDiff = Math.abs(a.midX - b.midX);
    if (colDiff > columnThreshold) { // 使用相同的阈值
      return b.midX - a.midX;
    }
    return a.midY - b.midY;
  });
  
  // 3. 分列：根据 X 坐标将字符分组
  const columns = [];
  let currentColumn = [];
  
  if (processedSymbols.length > 0) {
    currentColumn.push(processedSymbols[0]);
    let lastMidX = processedSymbols[0].midX; // 使用与新代码相同的变量名
    
    for (let i = 1; i < processedSymbols.length; i++) {
      const sym = processedSymbols[i];
      
      if (Math.abs(sym.midX - lastMidX) < columnThreshold) {
        currentColumn.push(sym);
        // 更新参考点（使用平均值）
        lastMidX = currentColumn.reduce((sum, s) => sum + s.midX, 0) / currentColumn.length;
      } else {
        // 开始新列
        currentColumn.sort((a, b) => a.midY - b.midY);
        columns.push(currentColumn);
        currentColumn = [sym];
        lastMidX = sym.midX;
      }
    }
    // 处理最后一列
    currentColumn.sort((a, b) => a.midY - b.midY);
    columns.push(currentColumn);
  }
  
  // 4. 按列的 X 坐标排序（右到左）
  columns.sort((a, b) => {
    const avgXa = a.reduce((s, c) => s + c.midX, 0) / a.length;
    const avgXb = b.reduce((s, c) => s + c.midX, 0) / b.length;
    return avgXb - avgXa;
  });
  
  // 5. 拼接结果
  const resultText = columns.map(col => col.map(s => s.text).join('')).join('\n');
  return resultText.length > 0 ? resultText : '(无符合当前过滤条件的文本)';
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