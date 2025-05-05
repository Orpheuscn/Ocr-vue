<template>
  <div class="text-output vertical-paragraph">
    {{ verticalParagraphText }}
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';

const store = useOcrStore();

// ... existing code ...
const verticalParagraphText = computed(() => {
  if (!store.fullTextAnnotation?.pages || !store.filteredSymbolsData) {
    return store.hasOcrResult ? '(无符合当前过滤条件的文本)' : '(无识别结果)';
  }

  // 添加辅助函数
  const getAverageCharWidth = (symbols) => {
    if (!symbols || symbols.length === 0) return 15;
    const validSymbols = symbols.filter(s => s.width > 0 && isFinite(s.width));
    const widthsPerChar = validSymbols
      .filter(s => s.text?.length > 0)
      .map(s => s.width / s.text.length);
    if (widthsPerChar.length > 0) {
      return widthsPerChar.reduce((a, b) => a + b, 0) / widthsPerChar.length;
    } else if (validSymbols.length > 0) {
      return validSymbols.reduce((a,b) => a + b.width, 0) / validSymbols.length;
    } else {
      return 15;
    }
  };

  const paragraphTextArray = []; // 存储每个段落的文本和位置
  
  // 1. 遍历原始的段落结构
  store.fullTextAnnotation.pages.forEach(page => {
    page.blocks?.forEach(block => {
      block.paragraphs?.forEach(paragraph => {
        const symbolsInParagraph = [];
        let paragraphHasFilteredContent = false;
        
        // 获取段落左上角x坐标（用于段落排序）
        let paraX = 0;
        if (paragraph.boundingBox?.vertices?.length) {
          paraX = Math.min(...paragraph.boundingBox.vertices.map(v => v?.x ?? 0));
        }
        
        // 收集段落内所有通过过滤的符号并清理换行符
        paragraph.words?.forEach(word => {
          word.symbols?.forEach(symbol => {
            const symbolData = store.filteredSymbolsData.find(fd =>
              fd.originalIndex !== undefined &&
              fd.text === symbol.text &&
              Math.abs(fd.x - (symbol.boundingBox?.vertices?.[0]?.x ?? -1)) < 2 &&
              Math.abs(fd.y - (symbol.boundingBox?.vertices?.[0]?.y ?? -1)) < 2
            );
            
            if (symbolData?.isFiltered) {
              // 只清理段落内的换行符
              const cleanedSymbol = {
                ...symbolData,
                text: (symbolData.text || '').replace(/[\r\n]/g, '')
              };
              symbolsInParagraph.push(cleanedSymbol);
              paragraphHasFilteredContent = true;
            }
          });
        });
        
        if (paragraphHasFilteredContent && symbolsInParagraph.length > 0) {
          // 使用与generateVerticalParallelText相同的列分割逻辑
          const avgWidth = getAverageCharWidth(symbolsInParagraph);
          const columnThreshold = avgWidth * 0.75;
          
          // 排序：按X坐标（右到左），次要按Y坐标（上到下）
          symbolsInParagraph.sort((a, b) => {
            const colDiff = Math.abs(a.midX - b.midX);
            if (colDiff > columnThreshold) {
              return b.midX - a.midX;
            }
            return a.midY - b.midY;
          });
          
          // 分列
          const columns = [];
          let currentColumn = [];
          
          if (symbolsInParagraph.length > 0) {
            currentColumn.push(symbolsInParagraph[0]);
            let lastMidX = symbolsInParagraph[0].midX;
            
            for (let i = 1; i < symbolsInParagraph.length; i++) {
              const sym = symbolsInParagraph[i];
              
              if (Math.abs(sym.midX - lastMidX) < columnThreshold) {
                currentColumn.push(sym);
                lastMidX = currentColumn.reduce((sum, s) => sum + s.midX, 0) / currentColumn.length;
              } else {
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
          
          // 按列的X坐标排序（右到左）
          columns.sort((a, b) => {
            const avgXa = a.reduce((s, c) => s + c.midX, 0) / a.length;
            const avgXb = b.reduce((s, c) => s + c.midX, 0) / b.length;
            return avgXb - avgXa;
          });
          
          // 拼接结果，列之间不用空格分隔（如果需要空格，可以改回 join(' ')）
          const paragraphText = columns.map(col => 
            col.map(s => s.text).join('')
          ).join('');
          
          paragraphTextArray.push({ text: paragraphText, paraX });
        }
      });
    });
  });
  
  if (paragraphTextArray.length === 0) {
    return '(无符合当前过滤条件的文本)';
  }
  
  // 2. 段落排序：按x坐标从大到小
  paragraphTextArray.sort((a, b) => b.paraX - a.paraX);
  
  // 3. 拼接结果，段落之间用换行符连接
  const resultText = paragraphTextArray
    .map(pd => pd.text)
    .join('\n\n');  // 使用换行符连接段落
  
  return resultText.length > 0 ? resultText : '(无符合当前过滤条件的文本)';
});

// 添加isRtl属性以保持组件接口一致性
defineProps({
  isRtl: {
    type: Boolean,
    default: false
    // 注意：垂直排版模式下RTL通常不适用
  }
});

</script>

<style scoped>
.text-output {
  white-space: pre-wrap; /* 保留换行符 */
  font-size: 1rem;
  line-height: 1.5;
  padding: 1rem;
  color: var(--bc, inherit); /* 使用主题颜色变量 */
  background-color: transparent; /* 透明背景 */
}

.vertical-paragraph {
  writing-mode: vertical-rl;
  text-orientation: upright;
}
</style>