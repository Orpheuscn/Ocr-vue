<template>
  <div class="card bg-base-100 shadow-md w-full h-full flex flex-col" ref="textManagerRef">
    <div class="card-body p-4 flex flex-col h-full overflow-hidden">
      <!-- 信息标题区 -->
      <div class="flex flex-wrap justify-between text-xs text-opacity-70 mb-2 flex-shrink-0">
        <div class="badge badge-neutral">{{ i18n.t('size') }}: {{ store.imageDimensions.width || '?' }}×{{ store.imageDimensions.height || '?' }}px</div>
        <div class="badge badge-neutral">
          {{ i18n.t('language') }}: {{ displayLanguageName }} ({{ store.detectedLanguageCode }})
          <span v-if="isRtlText" class="ml-1">←</span>
        </div>
        <div class="badge badge-neutral">{{ i18n.t('statistics') }}: {{ store.textStats.words }} {{ i18n.t('words') }}, {{ store.textStats.chars }} {{ i18n.t('characters') }}</div>
      </div>

      <!-- 控制区 -->
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2 flex-shrink-0">
        <div class="btn-group" v-if="store.recognitionMode !== 'table'">
          <button 
            :class="[
              'btn btn-xs',
              store.textDisplayMode === 'parallel' ? 'btn-accent' : 'btn-outline'
            ]"
            @click="updateDisplayMode('parallel')"
          >
            {{ i18n.t('parallel') }}
          </button>
          <button 
            :class="[
              'btn btn-xs',
              store.textDisplayMode === 'paragraph' ? 'btn-accent' : 'btn-outline'
            ]"
            @click="updateDisplayMode('paragraph')"
          >
            {{ i18n.t('paragraph') }}
          </button>
        </div>
        
        <!-- 表格模式标识 -->
        <div v-if="store.recognitionMode === 'table'" class="badge badge-outline">
          {{ i18n.t('table') }}
        </div>
        
        <!-- 复制按钮和下拉菜单 -->
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-xs btn-outline gap-1 m-1"
            :class="{'btn-success': copyStatus === 'success'}"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {{ copyButtonText }}
          </div>
          <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
            <li v-if="store.recognitionMode === 'table'">
              <a @click="copyText('markdown')">{{ i18n.t('copyMarkdownTable') || '复制Markdown表格' }}</a>
            </li>
            <li><a @click="copyText('original')">{{ i18n.t('copyOriginalText') }}</a></li>
            <li><a @click="copyText('filtered')">{{ i18n.t('copyFilteredText') }}</a></li>
          </ul>
        </div>
      </div>

      <div class="divider my-0 flex-shrink-0"></div>

      <!-- 文本内容区 -->
      <div 
        class="flex-1 overflow-y-auto p-2 text-content-area bg-base-100"
        :dir="textDirection"
        ref="textContentRef"
      >
        <div v-if="!store.hasOcrResult && store.currentFiles.length > 0" class="flex flex-col items-center justify-center h-full text-center opacity-70">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>{{ i18n.t('pleaseStartOcr') }}</p>
        </div>
        
        <div v-else-if="store.isLoading && !store.hasOcrResult" class="flex flex-col items-center justify-center h-full text-center">
          <span class="loading loading-dots loading-md"></span>
          <p class="mt-2">{{ i18n.t('recognizing') }}</p>
        </div>
        
        <div v-else-if="store.hasOcrResult">
          <component :is="activeTextComponent" ref="textComponent" :is-rtl="isRtlText" />
        </div>
        
        <div v-else class="flex flex-col items-center justify-center h-full text-center opacity-70">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>{{ i18n.t('resultsWillShowHere') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';
import { useI18nStore } from '@/stores/i18nStore';
import { isRtlLanguage, getLanguageName } from '@/services/visionApi';

// Import the four specialized text components
import TextHorizontalParallel from './TextHorizontalParallel.vue';
import TextHorizontalParagraph from './TextHorizontalParagraph.vue';
import TextVerticalParallel from './TextVerticalParallel.vue';
import TextVerticalParagraph from './TextVerticalParagraph.vue';
import TextTable from './TextTable.vue'; // 导入表格组件

const props = defineProps({
  containerHeight: {
    type: Number,
    default: 0
  }
});

const store = useOcrStore();
const i18n = useI18nStore();
const textComponent = ref(null);
const textManagerRef = ref(null);
const textContentRef = ref(null); // 添加对文本内容区域的引用
const copyStatus = ref('idle'); // 'idle', 'success', 'error'
const lastCopyType = ref('original'); // 记录上次复制的类型，默认为原始文本

// 使用计算属性获取当前语言下的语言名称
const displayLanguageName = computed(() => {
  if (!store.detectedLanguageCode || store.detectedLanguageCode === 'und') {
    return i18n.t('undetermined');
  }
  return getLanguageName(store.detectedLanguageCode);
});

// 监听语言变化
watch(() => i18n.currentLang, () => {
  // 语言切换时更新语言名称会自动通过计算属性更新
}, { immediate: true });

// 判断是否为RTL文本
const isRtlText = computed(() => {
  // 首先检查识别的主要语言是否为RTL语言
  const isRtlLanguageDetected = isRtlLanguage(store.detectedLanguageCode);
  
  // 如果检测到的主要语言是RTL语言，再根据文本内容确认是否需要RTL方向
  if (isRtlLanguageDetected) {
    // 当文本很短或没有文本时，直接使用语言判断结果
    if (!store.originalFullText || store.originalFullText.length < 10) {
      return true;
    }
    
    // 对于较长文本，分析文本内容确认是否真的需要RTL方向
    return rtlDirectionNeeded(store.originalFullText);
  }
  
  return false;
});

// 分析文本内容，判断是否需要RTL方向
function rtlDirectionNeeded(text) {
  if (!text) return false;
  
  // RTL字符范围（阿拉伯文、希伯来文等）的Unicode正则表达式
  const rtlCharsRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0590-\u05FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
  
  // 统计RTL字符数量
  const rtlCharMatches = text.match(rtlCharsRegex);
  const rtlCharCount = rtlCharMatches ? rtlCharMatches.length : 0;
  
  // 如果RTL字符占比超过30%，则认为需要RTL方向
  return rtlCharCount > text.length * 0.3;
}

// 设置文本方向
const textDirection = computed(() => {
  return isRtlText.value ? 'rtl' : 'ltr';
});

// 监听容器高度变化
watch(() => props.containerHeight, (newHeight) => {
  if (newHeight > 0) {
    textManagerRef.value.style.height = `${newHeight}px`;
  }
}, { immediate: true });

// 在组件挂载后初始化高度
onMounted(() => {
  // 如果已经有传入的容器高度，立即更新
  if (props.containerHeight > 0) {
    textManagerRef.value.style.height = `${props.containerHeight}px`;
  }
});

// Determine which component to render dynamically
const activeTextComponent = computed(() => {
  // 首先检查是否是表格模式
  if (store.recognitionMode === 'table') {
    return TextTable;
  }

  // 如果不是表格模式，则按原逻辑处理文本方向和显示模式
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

// 获取原始文本
const getOriginalText = () => {
  // 如果是表格模式，返回 Markdown 格式的表格
  if (store.recognitionMode === 'table' && textComponent.value && textComponent.value.getMarkdownTable) {
    return textComponent.value.getMarkdownTable();
  }
  
  // 根据当前显示模式返回合适的原始文本
  if (store.textDisplayMode === 'parallel') {
    // 原排版模式
    return store.fullTextAnnotation?.text || '';
  } else {
    // 分段模式，将连续空行合并为一个空行
    const originalText = store.originalFullText || '';
    return originalText.replace(/\n+/g, '\n\n').trim();
  }
};

// 获取过滤后的文本
const getFilteredText = () => {
  // 如果是表格模式，返回 Markdown 格式的表格
  if (store.recognitionMode === 'table' && textComponent.value && textComponent.value.getMarkdownTable) {
    return textComponent.value.getMarkdownTable();
  }

  // 从DOM中获取当前显示的文本
  if (textComponent.value && textComponent.value.$el) {
    const text = textComponent.value.$el.textContent || '';
    if (text.trim()) {
      return text.trim();
    }
  }
  
  // 如果无法从DOM获取，则使用fallback生成过滤后的文本
  return generateFilteredText();
};

// 生成过滤后的文本（fallback方法）
const generateFilteredText = () => {
  const symbolsToProcess = store.filteredSymbolsData;
  if (!symbolsToProcess || symbolsToProcess.length === 0) {
    return '';
  }
  
  let text = '';
  symbolsToProcess.forEach(symbol => {
    if (symbol.isFiltered) {
      text += symbol.text;
      const breakType = symbol.detectedBreak;
      if (breakType === 'SPACE' || breakType === 'EOL_SURE_SPACE') {
        text += ' ';
      } else if (breakType === 'LINE_BREAK' || breakType === 'HYPHEN') {
        text += '\n';
      }
    }
  });
  
  return text.replace(/ +/g, ' ').replace(/\n+/g, '\n').trim();
};

// 复制按钮文本
const copyButtonText = computed(() => {
  if (copyStatus.value === 'success') {
    return i18n.t('copied');
  }
  
  if (store.recognitionMode === 'table') {
    return i18n.t('copyMarkdownTable') || '复制表格';
  }
  
  return i18n.t('copy');
});

// 复制文本方法，根据类型选择复制内容
const copyText = async (type = '') => {
  if (!store.hasOcrResult) return;
  
  // 如果没有指定类型，使用上次的类型
  if (!type) {
    type = lastCopyType.value;
  } else {
    // 保存当前使用的类型
    lastCopyType.value = type;
  }
  
  // 根据类型获取要复制的文本
  let textToCopy = '';
  if (type === 'original') {
    textToCopy = getOriginalText();
  } else if (type === 'filtered') {
    textToCopy = getFilteredText();
  } else if (type === 'markdown') {
    // 表格模式下复制 Markdown 表格
    if (textComponent.value && textComponent.value.getMarkdownTable) {
      textToCopy = textComponent.value.getMarkdownTable();
    } else {
      textToCopy = getFilteredText();
    }
  }
  
  if (!textToCopy) return;
  
  try {
    await navigator.clipboard.writeText(textToCopy);
    copyStatus.value = 'success';
    
    // 3秒后重置状态
    setTimeout(() => {
      copyStatus.value = 'idle';
    }, 3000);
    
    // 显示成功提示
    store._showNotification(i18n.t('textCopied'), 'success');
  } catch (e) {
    copyStatus.value = 'error';
    console.error('复制失败:', e);
    
    // 显示错误提示
    store._showNotification(i18n.t('copyFailed'), 'error');
    
    // 3秒后重置状态
    setTimeout(() => {
      copyStatus.value = 'idle';
    }, 3000);
  }
};
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 600px;
  overflow: hidden;
}

.card-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.text-content-area {
  flex: 1;
  overflow-y: auto;
  color: var(--bc, inherit);
  transition: background-color 0.3s;
  word-break: break-word;
  white-space: pre-wrap;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  min-height: 400px;
  padding: 1rem;
  border-radius: 0.375rem;
}

.divider {
  border: none;
  border-top: 1px solid var(--b3, var(--border-color));
  margin: 10px 0 15px 0;
}

.badge {
  font-size: 0.75rem;
}

.btn-group {
  display: flex;
  gap: 0.25rem;
}

.copy-button {
  display: flex;
  align-items: center;
  gap: 5px;
  background-color: var(--primary, var(--primary-color));
  color: var(--primary-content, white);
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.copy-button:hover:not(:disabled) {
  background-color: var(--primary-focus, var(--hover-color));
}

.copy-button:disabled {
  background-color: var(--b3, #cccccc);
  cursor: not-allowed;
  opacity: 0.7;
}
</style>