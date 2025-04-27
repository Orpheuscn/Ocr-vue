<template>
  <div class="text-output vertical-paragraph">
    {{ verticalParagraphText }}
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';

const store = useOcrStore();

const verticalParagraphText = computed(() => {
  // Logic adapted from original organizeVerticalParagraphText function
  if (!store.fullTextAnnotation?.pages || !store.filteredSymbolsData) {
      return store.hasOcrResult ? '(无符合当前过滤条件的文本)' : '(无识别结果)';
  }

  const paragraphData = []; // Array to hold { symbols: [], midX: number }

  // 1. 遍历原始的段落结构
  store.fullTextAnnotation.pages.forEach(page => {
      page.blocks?.forEach(block => {
          block.paragraphs?.forEach(paragraph => {
              const symbolsInParagraph = []; // 存储本段落内通过过滤的符号
              let paragraphHasFilteredContent = false;
              let pMinX = Infinity, pMaxX = -Infinity; // 用于计算段落的中心 X

              // 2. 收集每个段落内，通过了过滤器设置的符号
              paragraph.words?.forEach(word => {
                  word.symbols?.forEach(symbol => {
                      // 查找 store.filteredSymbolsData 中对应的符号信息
                      const symbolData = store.filteredSymbolsData.find(fd =>
                          fd.originalIndex !== undefined &&
                          fd.text === symbol.text &&
                          // 使用原始索引可能更可靠，坐标匹配作为辅助
                          Math.abs(fd.x - (symbol.boundingBox?.vertices?.[0]?.x ?? -1)) < 2 &&
                          Math.abs(fd.y - (symbol.boundingBox?.vertices?.[0]?.y ?? -1)) < 2
                      );
                      if (symbolData?.isFiltered) {
                          symbolsInParagraph.push(symbolData); // 只收集通过过滤的
                          paragraphHasFilteredContent = true;
                          // 更新段落的 X 范围
                          pMinX = Math.min(pMinX, symbolData.x);
                          pMaxX = Math.max(pMaxX, symbolData.x + symbolData.width);
                      }
                  });
              });

              // 3. 如果该段落有内容通过了过滤
              if (paragraphHasFilteredContent && symbolsInParagraph.length > 0) {
                  // 对段落内的符号按 Y 坐标排序（竖排文字，从上到下）
                  symbolsInParagraph.sort((a, b) => a.midY - b.midY);
                  // 计算段落的中心 X 坐标，用于段落间排序
                  const pMidX = isFinite(pMinX) && isFinite(pMaxX) ? pMinX + (pMaxX - pMinX) / 2 : 0;
                  paragraphData.push({ symbols: symbolsInParagraph, midX: pMidX });
              }
          });
      });
  });

   if (paragraphData.length === 0) {
     return '(无符合当前过滤条件的文本)';
  }

  // 4. 对所有收集到的段落，按中心 X 坐标降序排序（竖排，右边的段落优先）
  paragraphData.sort((a, b) => b.midX - a.midX);

  // 5. 拼接结果，每个段落的文字连接起来，段落之间用换行符分隔
  //    （这里用单个换行符，如果需要段间距更大，可以用 '\n\n'）
  const resultText = paragraphData.map(pd => pd.symbols.map(s => s.text).join('')).join('\n');

  return resultText.length > 0 ? resultText : '(无符合当前过滤条件的文本)';
});

</script>

<style scoped>
.text-output {
  /* font-family: 'SimSun', 'KaiTi', serif; */
  white-space: pre-wrap; /* 保留换行符 */
}
</style>