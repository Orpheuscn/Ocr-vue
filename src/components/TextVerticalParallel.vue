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
  // Logic adapted from original organizeVerticalText function
  const symbolsToProcess = store.filteredSymbolsData.filter(s => s.isFiltered);

  if (symbolsToProcess.length === 0) {
    return store.hasOcrResult ? '(无符合当前过滤条件的文本)' : '(无识别结果)';
  }

  // 1. 计算平均字符宽度，用于判断是否在同一列
  const avgWidth = getAverageCharWidth(symbolsToProcess);
  const columnThreshold = avgWidth * 0.75; // 阈值，小于这个 X 差值可能属于同一列

  // 2. 初始排序：主要按 X 坐标（右到左），次要按 Y 坐标（上到下）
  //    这模拟了从右向左阅读的竖排文本的列顺序
  symbolsToProcess.sort((a, b) => {
    const colDiff = Math.abs(a.midX - b.midX);
    // 如果 X 坐标差异很大，则按 X 降序排（右边的列在前）
    if (colDiff > columnThreshold * 2) { // Use a larger threshold for initial column sort
        return b.midX - a.midX;
    }
    // 如果 X 坐标相近，则按 Y 升序排（同一列内，上边的字符在前）
    return a.midY - b.midY;
  });

  // 3. 分列：根据 X 坐标将字符分组
  const columns = [];
  let currentColumn = [];
  if (symbolsToProcess.length > 0) {
      currentColumn.push(symbolsToProcess[0]);
      let currentColumnAvgX = symbolsToProcess[0].midX;

      for (let i = 1; i < symbolsToProcess.length; i++) {
          const sym = symbolsToProcess[i];
          // 如果当前字符的 X 中点与当前列的平均 X 中点足够接近，则加入当前列
          if (Math.abs(sym.midX - currentColumnAvgX) < columnThreshold) {
              currentColumn.push(sym);
              // 更新当前列的平均 X (可选，但可能更准确)
              currentColumnAvgX = currentColumn.reduce((sum, s) => sum + s.midX, 0) / currentColumn.length;
          } else {
              // 否则，开始一个新列
              // 在将旧列存入前，确保列内按 Y 坐标排序
              currentColumn.sort((a, b) => a.midY - b.midY);
              columns.push(currentColumn);
              // 开始新列
              currentColumn = [sym];
              currentColumnAvgX = sym.midX;
          }
      }
      // 不要忘记最后一列
      currentColumn.sort((a, b) => a.midY - b.midY);
      columns.push(currentColumn);
  }

  // 4. 按列的 X 坐标排序（右到左）
  columns.sort((a, b) => {
       const avgXa = a.reduce((s, c) => s + c.midX, 0) / a.length;
       const avgXb = b.reduce((s, c) => s + c.midX, 0) / b.length;
       return avgXb - avgXa; // 降序，右边的列在前
   });

  // 5. 拼接结果，每列之间用换行符分隔
  const resultText = columns.map(col => col.map(s => s.text).join('')).join('\n');

  return resultText.length > 0 ? resultText : '(无符合当前过滤条件的文本)';
});

</script>

<style scoped>
.text-output {
  /* 可以设置特定的字体，如宋体、楷体，以获得更好的竖排效果 */
  /* font-family: 'SimSun', 'KaiTi', serif; */
  white-space: pre-wrap; /* 保留换行符 */
}
/* 如果需要模拟更真实的竖排效果（字符旋转等），需要更复杂的CSS， */
/* 但这里主要处理的是文本内容的顺序 */
</style>