<template>
  <div class="text-output-manager">
    <div class="info-header">
       <div><strong>尺寸:</strong> {{ store.imageDimensions.width || '?' }}×{{ store.imageDimensions.height || '?' }}px</div>
       <div><strong>语言:</strong> {{ store.detectedLanguageName || '未确定' }} ({{ store.detectedLanguageCode }})</div>
       <div><strong>统计:</strong> {{ store.textStats.words }} 词, {{ store.textStats.chars }} 字</div>
    </div>

    <div class="text-display-toggle">
      <span>排版方式:</span>
      <label>
        <input type="radio" name="textDisplay" value="parallel" :checked="store.textDisplayMode === 'parallel'" @change="updateDisplayMode('parallel')"> 原排版
      </label>
      <label>
        <input type="radio" name="textDisplay" value="paragraph" :checked="store.textDisplayMode === 'paragraph'" @change="updateDisplayMode('paragraph')"> 分段
      </label>
    </div>

    <hr class="divider">

    <div class="text-content-area">
       <div v-if="!store.hasOcrResult && store.currentFiles.length > 0" class="text-placeholder">
           <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
           <p>请点击“开始识别”</p>
       </div>
       <div v-else-if="store.isLoading && !store.hasOcrResult" class="text-placeholder">
           <p>正在识别中...</p>
       </div>
       <div v-else-if="store.hasOcrResult">
            <component :is="activeTextComponent" />
            </div>
        <div v-else class="text-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <p>识别结果将显示在此处</p>
        </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';

// Import the four specialized text components
import TextHorizontalParallel from './TextHorizontalParallel.vue';
import TextHorizontalParagraph from './TextHorizontalParagraph.vue';
import TextVerticalParallel from './TextVerticalParallel.vue';
import TextVerticalParagraph from './TextVerticalParagraph.vue';

const store = useOcrStore();

// Determine which component to render dynamically
const activeTextComponent = computed(() => {
  const direction = store.initialTextDirection;
  const displayMode = store.textDisplayMode;

  if (direction === 'vertical') {
    return displayMode === 'parallel' ? TextVerticalParallel : TextVerticalParagraph;
  } else { // Default to horizontal
    return displayMode === 'parallel' ? TextHorizontalParallel : TextHorizontalParagraph;
  }
});

const updateDisplayMode = (mode) => {
  store.setTextDisplayMode(mode);
};

</script>

<style scoped>
/* Styles adapted from .text-container and related elements in style.css */
.text-output-manager {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 1rem;
    overflow-y: auto; /* Allow scrolling if content overflows */
    min-height: 300px; /* Ensure minimum height like original */
    display: flex;
    flex-direction: column;
}

.info-header {
    margin-bottom: 15px;
    padding: 10px 0; /* Remove side padding if full width */
    background-color: var(--secondary-color);
    border-radius: 8px;
    display: flex;
    flex-direction: column; /* Stack info items */
    gap: 8px;
    padding: 10px 15px;
    font-size: 14px;
    color: var(--text-color);
}
.info-header div {
    /* Style for each info line */
}
.info-header strong {
    font-weight: 600;
    margin-right: 5px;
}

.text-display-toggle {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 10px;
    padding: 5px 0;
    flex-wrap: wrap;
}
.text-display-toggle span {
    font-weight: 500;
}
.text-display-toggle label {
    cursor: pointer;
    display: inline-flex; /* Align radio and text */
    align-items: center;
    gap: 5px;
}

.divider {
    border: none;
    border-top: 1px solid var(--border-color);
    margin: 10px 0 15px 0; /* Adjusted margin */
}

.text-content-area {
    flex-grow: 1; /* Take remaining space */
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    line-height: 1.6;
    min-height: 50px; /* Minimum height for text */
    overflow-y: auto; /* Scroll text area if it overflows */
}

.text-placeholder {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #a0aec0;
    text-align: center;
    padding: 2rem;
}

.text-placeholder svg {
    margin-bottom: 1rem;
    opacity: 0.5;
}

.text-placeholder p {
    font-size: 0.9rem;
}
</style>