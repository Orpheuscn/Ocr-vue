<template>
  <div class="text-output">
    {{ paragraphText }}
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';

const store = useOcrStore();

const paragraphText = computed(() => {
  // Logic adapted from original organizeParagraphText function
  if (!store.fullTextAnnotation?.pages || !store.filteredSymbolsData) {
      return store.hasOcrResult ? '(无符合当前过滤条件的文本)' : '(无识别结果)';
  }

  const paragraphsOutput = [];
  const noSpaceLanguages = ['zh', 'ja', 'ko', 'th', 'lo', 'my']; // Languages that don't typically use spaces

  store.fullTextAnnotation.pages.forEach(page => {
      page.blocks?.forEach(block => {
          block.paragraphs?.forEach(paragraph => {
              let currentParagraphText = '';
              let paragraphHasFilteredContent = false;
              let paragraphMinY = Infinity;

              // Try to get paragraph bounding box Y for sorting
              if (paragraph.boundingBox?.vertices) {
                   paragraphMinY = Math.min(...paragraph.boundingBox.vertices.map(v => v?.y ?? Infinity));
              }

              paragraph.words?.forEach(word => {
                  word.symbols?.forEach(symbol => {
                      // Find the corresponding symbol in filteredSymbolsData
                      // This relies on filteredSymbolsData being generated correctly
                      const symbolData = store.filteredSymbolsData.find(fd =>
                          fd.text === symbol.text &&
                          Math.abs(fd.midX - (symbol.boundingBox ? (Math.min(...symbol.boundingBox.vertices.map(v => v?.x ?? Infinity)) + Math.max(...symbol.boundingBox.vertices.map(v => v?.x ?? -Infinity))) / 2 : -Infinity)) < 5 && // 比较 midX，容忍度设为 5
                          Math.abs(fd.midY - (symbol.boundingBox ? (Math.min(...symbol.boundingBox.vertices.map(v => v?.y ?? Infinity)) + Math.max(...symbol.boundingBox.vertices.map(v => v?.y ?? -Infinity))) / 2 : -Infinity)) < 5  // 比较 midY，容忍度设为 5
                      );
                      console.log("Paragraph: Found symbolData:", symbolData ? { text: symbolData.text, isFiltered: symbolData.isFiltered, originalIndex: symbolData.originalIndex } : undefined);

                      if (symbolData?.isFiltered) { // Check if the symbol passed the filters
                           currentParagraphText += (noSpaceLanguages.includes(store.detectedLanguageCode) && symbol.text === ',') 
                              ? '，' 
                              : symbol.text;
                           paragraphHasFilteredContent = true;
                           const breakType = symbolData.detectedBreak;
                           // Add space if needed and language uses spaces
                           if ((breakType === 'SPACE' || breakType === 'EOL_SURE_SPACE') && !noSpaceLanguages.includes(store.detectedLanguageCode)) {
                                currentParagraphText += ' ';
                           }
                           // Note: LINE_BREAK within a paragraph is usually ignored for paragraph mode
                      } else if (!symbolData) {
                           console.warn("Paragraph: Symbol NOT FOUND in filteredSymbolsData:", symbol.text); // 添加未找到的警告
                      } else {
                           // console.log("Paragraph: Symbol found but not filtered:", symbol.text); // 如果需要检查过滤状态
                      }
                  }); // End symbols loop
              }); // End words loop

              if (paragraphHasFilteredContent) {
                  let cleanedText = currentParagraphText.replace(/\s+/g, ' ').trim(); // Clean up spaces
                  if (cleanedText.length > 0) {
                      paragraphsOutput.push({ text: cleanedText, y: isFinite(paragraphMinY) ? paragraphMinY : Infinity });
                  }
              }
          }); // End paragraphs loop
      }); // End blocks loop
  }); // End pages loop

  if (paragraphsOutput.length === 0) {
     return '(无符合当前过滤条件的文本)';
  }

  // Sort paragraphs by their vertical position (top to bottom)
  paragraphsOutput.sort((a, b) => a.y - b.y);

  // Join paragraphs with double newlines
  return paragraphsOutput.map(p => p.text).join('\n\n');
});

</script>

<style scoped>
.text-output {
  /* Inherits styles, specific styles if needed */
}
</style>