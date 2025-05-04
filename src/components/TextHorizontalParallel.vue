<template>
  <div class="text-output">
    <div v-html="formattedText"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';

const store = useOcrStore();

// 计算属性：处理文本以保持原始排版
const formattedText = computed(() => {
  const symbolsToProcess = store.filteredSymbolsData;
  if (!symbolsToProcess || symbolsToProcess.length === 0) {
    return store.hasOcrResult ? '<p>(无符合当前过滤条件的文本)</p>' : '<p>(无识别结果)</p>';
  }

  // 为了保持原始排版，我们需要：
  // 1. 按照y坐标对符号进行分组，形成行
  // 2. 在行内按照x坐标排序
  // 3. 应用适当的换行

  // 第一步：按y坐标将符号分组成行
  // 使用一个行高阈值来决定两个符号是否在同一行
  const lineGroups = {};
  const lineHeightThreshold = 5; // 可调整，表示同一行内y坐标的最大差异
  
  symbolsToProcess.forEach(symbol => {
    if (!symbol.isFiltered) return; // 跳过被过滤的符号
    
    // 查找最接近的行
    let foundLine = false;
    for (const lineY in lineGroups) {
      if (Math.abs(symbol.y - parseFloat(lineY)) <= lineHeightThreshold) {
        lineGroups[lineY].push(symbol);
        foundLine = true;
        break;
      }
    }
    
    // 如果没有找到合适的行，创建新行
    if (!foundLine) {
      lineGroups[symbol.y] = [symbol];
    }
  });
  
  // 第二步：对行按y坐标排序，并对每行内的符号按x坐标排序
  const sortedLines = Object.entries(lineGroups)
    .sort(([y1], [y2]) => parseFloat(y1) - parseFloat(y2))
    .map(([_, symbols]) => 
      symbols.sort((a, b) => a.x - b.x)
    );
  
  // 第三步：生成HTML，保持原始排版
  let htmlOutput = '';
  
  sortedLines.forEach((line, i) => {
    // 创建一个行容器
    let lineText = '<div class="line">';
    
    // 添加该行所有字符
    line.forEach(symbol => {
      lineText += symbol.text;
      
      // 处理行内的空格或分隔符
      if (symbol.detectedBreak === 'SPACE' || symbol.detectedBreak === 'EOL_SURE_SPACE') {
        lineText += ' ';
      }
      // 不处理行尾换行，因为我们已经按行分组并使用div
    });
    
    lineText += '</div>';
    htmlOutput += lineText;
  });
  
  return htmlOutput || '<p>(无符合当前过滤条件的文本)</p>';
});

// 原来的parallelText计算属性
const parallelText = computed(() => {
  // Logic adapted from original generateParallelText function
  let text = '';
  const symbolsToProcess = store.filteredSymbolsData;
  if (!symbolsToProcess || symbolsToProcess.length === 0) {
    return store.hasOcrResult ? '(无符合当前过滤条件的文本)' : '(无识别结果)';
  }
  symbolsToProcess.forEach(symbol => {
    if (symbol.isFiltered) { // Only include non-filtered symbols
      text += symbol.text;
      const breakType = symbol.detectedBreak;
      // Add space/newline based on detected breaks
      if (breakType === 'SPACE' || breakType === 'EOL_SURE_SPACE') {
        text += ' ';
      } else if (breakType === 'LINE_BREAK' || breakType === 'HYPHEN') {
        // Check if HYPHEN break actually corresponds to a hyphen character
        // This logic might need refinement based on API behavior
        text += '\n';
      }
    }
  });
  // Clean up extra spaces/newlines
  const cleanedText = text.replace(/ +/g, ' ').replace(/\n+/g, '\n').trim();
  return cleanedText.length > 0 ? cleanedText : '(无符合当前过滤条件的文本)';
});
</script>

<style scoped>
.text-output {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 1rem;
  line-height: 1.5;
}

.line {
  margin-bottom: 0.2em; /* 行间距 */
}
</style>