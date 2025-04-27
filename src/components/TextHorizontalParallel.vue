<template>
  <div class="text-output">
    {{ parallelText }}
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';

const store = useOcrStore();

// Props if not using store directly
// const props = defineProps({
//   filteredSymbols: {
//     type: Array,
//     required: true,
//     default: () => []
//   },
//   languageCode: {
//     type: String,
//     default: 'und'
//   }
// });

const parallelText = computed(() => {
  // Logic adapted from original generateParallelText function
  let text = '';
  // Use data from store or props
  // const symbolsToProcess = props.filteredSymbols;
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
/* No specific styles needed usually, inherits from parent */
.text-output {
  /* Styles if needed */
}
</style>