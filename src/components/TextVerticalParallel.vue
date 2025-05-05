<template>
  <div class="text-output vertical-parallel">
    {{ verticalParallelText }}
  </div>
</template>
<script setup>
import { computed } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';
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
  
  // 1. 计算平均字符宽度
  const avgWidth = getAverageCharWidth(symbolsToProcess);
  const columnThreshold = avgWidth * 0.75; // 统一使用这个阈值
  
  // 2. 初始排序：使用与新代码相同的逻辑
  symbolsToProcess.sort((a, b) => {
    const colDiff = Math.abs(a.midX - b.midX);
    if (colDiff > columnThreshold) { // 使用相同的阈值
      return b.midX - a.midX;
    }
    return a.midY - b.midY;
  });
  
  // 3. 分列：根据 X 坐标将字符分组
  const columns = [];
  let currentColumn = [];
  
  if (symbolsToProcess.length > 0) {
    currentColumn.push(symbolsToProcess[0]);
    let lastMidX = symbolsToProcess[0].midX; // 使用与新代码相同的变量名
    
    for (let i = 1; i < symbolsToProcess.length; i++) {
      const sym = symbolsToProcess[i];
      
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