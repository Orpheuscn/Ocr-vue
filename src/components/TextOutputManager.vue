<template>
  <div class="text-output-manager">
    <div class="info-header">
       <div><strong>尺寸:</strong> {{ store.imageDimensions.width || '?' }}×{{ store.imageDimensions.height || '?' }}px</div>
       <div><strong>语言:</strong> {{ store.detectedLanguageName || '未确定' }} ({{ store.detectedLanguageCode }})</div>
       <div><strong>统计:</strong> {{ store.textStats.words }} 词, {{ store.textStats.chars }} 字</div>
    </div>

    <div class="text-display-toggle">
      <div class="toggle-options">
        <span>排版方式:</span>
        <label>
          <input type="radio" name="textDisplay" value="parallel" :checked="store.textDisplayMode === 'parallel'" @change="updateDisplayMode('parallel')"> 原排版
        </label>
        <label>
          <input type="radio" name="textDisplay" value="paragraph" :checked="store.textDisplayMode === 'paragraph'" @change="updateDisplayMode('paragraph')"> 分段
        </label>
      </div>
      <button 
        class="copy-button" 
        @click="copyText" 
        :disabled="!copyableText"
        :title="copyButtonTooltip"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        {{ copyButtonText }}
      </button>
    </div>

    <hr class="divider">

    <div class="text-content-area">
       <div v-if="!store.hasOcrResult && store.currentFiles.length > 0" class="text-placeholder">
           <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
           <p>请点击"开始识别"</p>
       </div>
       <div v-else-if="store.isLoading && !store.hasOcrResult" class="text-placeholder">
           <p>正在识别中...</p>
       </div>
       <div v-else-if="store.hasOcrResult">
            <component :is="activeTextComponent" ref="textComponent" />
            </div>
        <div v-else class="text-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <p>识别结果将显示在此处</p>
        </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';

// Import the four specialized text components
import TextHorizontalParallel from './TextHorizontalParallel.vue';
import TextHorizontalParagraph from './TextHorizontalParagraph.vue';
import TextVerticalParallel from './TextVerticalParallel.vue';
import TextVerticalParagraph from './TextVerticalParagraph.vue';

const store = useOcrStore();
const textComponent = ref(null);
const copyStatus = ref('idle'); // 'idle', 'success', 'error'

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

// 在组件挂载后获取格式化文本
const getFormattedText = () => {
  // 从DOM获取文本内容是最可靠的方法
  if (textComponent.value && textComponent.value.$el) {
    // 获取文本节点内容，跳过可能存在的HTML标签
    const text = textComponent.value.$el.textContent || '';
    if (text.trim()) {
      console.log('从组件DOM获取文本内容');
      return text.trim();
    }
  }
  
  // 回退方案：根据当前显示模式返回合适的原始文本
  console.log('使用回退方案获取文本');
  if (store.textDisplayMode === 'parallel') {
    // 原排版模式
    return store.fullTextAnnotation?.text || '';
  } else {
    // 分段模式，将连续空行合并为一个空行
    const originalText = store.originalFullText || '';
    return originalText.replace(/\n+/g, '\n\n').trim();
  }
};

// 获取当前可复制的文本
const copyableText = computed(() => {
  if (!store.hasOcrResult) return '';
  return getFormattedText();
});

// 复制按钮文本
const copyButtonText = computed(() => {
  if (copyStatus.value === 'success') {
    return '已复制';
  } else {
    return '复制';
  }
});

// 复制按钮工具提示文本
const copyButtonTooltip = computed(() => {
  if (copyStatus.value === 'success') {
    return '已复制!';
  } else if (copyStatus.value === 'error') {
    return '复制失败，请重试';
  } else if (!copyableText.value) {
    return '无可复制内容';
  } else {
    return '复制文本';
  }
});

// 复制文本方法
const copyText = async () => {
  if (!copyableText.value) return;
  
  console.log('正在复制文本, 排版模式:', store.textDisplayMode);
  console.log('文本组件类型:', activeTextComponent.value.name || '未知组件');
  
  try {
    await navigator.clipboard.writeText(copyableText.value);
    copyStatus.value = 'success';
    
    // 显示通知
    store._showNotification('文本已复制到剪贴板', 'success');
    
    // 2秒后重置状态
    setTimeout(() => {
      copyStatus.value = 'idle';
    }, 2000);
  } catch (err) {
    console.error('复制失败:', err);
    copyStatus.value = 'error';
    
    // 显示错误通知
    store._showNotification('复制失败，请重试', 'error');
    
    // 2秒后重置状态
    setTimeout(() => {
      copyStatus.value = 'idle';
    }, 2000);
  }
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
    justify-content: space-between;
    margin-bottom: 10px;
    padding: 5px 0;
    flex-wrap: wrap;
}

.toggle-options {
    display: flex;
    align-items: center;
    gap: 15px;
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

.copy-button {
    display: flex;
    align-items: center;
    gap: 5px;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 5px 10px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background-color 0.3s;
}

.copy-button:hover:not(:disabled) {
    background-color: var(--hover-color);
}

.copy-button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
    opacity: 0.7;
}

.copy-button svg {
    width: 16px;
    height: 16px;
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