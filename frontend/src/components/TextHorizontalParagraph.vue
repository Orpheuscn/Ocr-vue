<template>
  <div class="text-output" :class="{ 'rtl-text': isRtl }">
    {{ paragraphText }}
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useOcrStore } from '@/stores/ocrStore'
import { processSymbolText, formatParagraphText, shouldSkipSymbol } from '@/utils/textProcessors'
import { isCJKLanguage } from '@/services/languageService'

defineProps({
  isRtl: {
    type: Boolean,
    default: false,
  },
})

const store = useOcrStore()

const paragraphText = computed(() => {
  // Logic adapted from original organizeParagraphText function
  if (!store.fullTextAnnotation?.pages || !store.filteredSymbolsData) {
    return store.hasOcrResult ? '(无符合当前过滤条件的文本)' : '(无识别结果)'
  }

  const paragraphsOutput = []
  // 使用工具函数判断是否为 CJK 语言
  const isCurrentLangCJK = isCJKLanguage(store.detectedLanguageCode)

  store.fullTextAnnotation.pages.forEach((page) => {
    page.blocks?.forEach((block) => {
      block.paragraphs?.forEach((paragraph) => {
        let currentParagraphText = ''
        let paragraphHasFilteredContent = false
        let paragraphMinY = Infinity

        // Try to get paragraph bounding box Y for sorting
        if (paragraph.boundingBox?.vertices) {
          paragraphMinY = Math.min(...paragraph.boundingBox.vertices.map((v) => v?.y ?? Infinity))
        }

        paragraph.words?.forEach((word) => {
          word.symbols?.forEach((symbol) => {
            // Find the corresponding symbol in filteredSymbolsData
            // This relies on filteredSymbolsData being generated correctly
            const symbolData = store.filteredSymbolsData.find(
              (fd) =>
                fd.text === symbol.text &&
                Math.abs(
                  fd.midX -
                    (symbol.boundingBox
                      ? (Math.min(...symbol.boundingBox.vertices.map((v) => v?.x ?? Infinity)) +
                          Math.max(...symbol.boundingBox.vertices.map((v) => v?.x ?? -Infinity))) /
                        2
                      : -Infinity),
                ) < 5 && // 比较 midX，容忍度设为 5
                Math.abs(
                  fd.midY -
                    (symbol.boundingBox
                      ? (Math.min(...symbol.boundingBox.vertices.map((v) => v?.y ?? Infinity)) +
                          Math.max(...symbol.boundingBox.vertices.map((v) => v?.y ?? -Infinity))) /
                        2
                      : -Infinity),
                ) < 5, // 比较 midY，容忍度设为 5
            )
            console.log(
              'Paragraph: Found symbolData:',
              symbolData
                ? {
                    text: symbolData.text,
                    isFiltered: symbolData.isFiltered,
                    originalIndex: symbolData.originalIndex,
                  }
                : undefined,
            )

            if (symbolData?.isFiltered) {
              // Check if the symbol passed the filters
              const breakType = symbolData.detectedBreak

              // 使用工具函数判断是否应该跳过该符号
              if (shouldSkipSymbol(symbol.text, store.detectedLanguageCode, breakType)) {
                // 跳过连字符和空格的添加
                paragraphHasFilteredContent = true // 仍然标记段落包含过滤内容
              } else {
                // 使用工具函数处理符号文本
                const { processedText, needSpace } = processSymbolText(symbol.text, store.detectedLanguageCode, breakType)
                currentParagraphText += processedText
                
                paragraphHasFilteredContent = true
                
                // 如果需要添加空格
                if (needSpace) {
                  currentParagraphText += ' '
                }
              }
            } else if (!symbolData) {
              console.warn('Paragraph: Symbol NOT FOUND in filteredSymbolsData:', symbol.text)
            }
          }) // End symbols loop
        }) // End words loop

        if (paragraphHasFilteredContent) {
          let cleanedText = currentParagraphText.replace(/\s+/g, ' ').trim() // Clean up spaces
          if (cleanedText.length > 0) {
            paragraphsOutput.push({
              text: cleanedText,
              y: isFinite(paragraphMinY) ? paragraphMinY : Infinity,
            })
          }
        }
      }) // End paragraphs loop
    }) // End blocks loop
  }) // End pages loop

  if (paragraphsOutput.length === 0) {
    return '(无符合当前过滤条件的文本)'
  }

  // Sort paragraphs by their vertical position (top to bottom)
  paragraphsOutput.sort((a, b) => a.y - b.y)

  // 使用工具函数格式化段落文本
  return formatParagraphText(paragraphsOutput, store.detectedLanguageCode)
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
