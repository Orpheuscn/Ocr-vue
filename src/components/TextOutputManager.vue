<template>
  <div class="card bg-base-100 shadow-md w-full h-full flex flex-col" ref="textManagerRef">
    <div class="card-body p-4 flex flex-col h-full overflow-hidden">
      <!-- 信息标题区 -->
      <div class="flex flex-wrap justify-between text-xs text-opacity-70 mb-2 flex-shrink-0">
        <div class="badge badge-neutral">尺寸: {{ store.imageDimensions.width || '?' }}×{{ store.imageDimensions.height || '?' }}px</div>
        <div class="badge badge-neutral">
          语言: {{ store.detectedLanguageName || '未确定' }} ({{ store.detectedLanguageCode }})
          <span v-if="isRtlText" class="ml-1">🔄</span>
        </div>
        <div class="badge badge-neutral">统计: {{ store.textStats.words }} 词, {{ store.textStats.chars }} 字</div>
      </div>

      <!-- 控制区 -->
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2 flex-shrink-0">
        <div class="btn-group">
          <button 
            :class="[
              'btn btn-xs',
              store.textDisplayMode === 'parallel' ? 'btn-primary' : 'btn-outline'
            ]"
            @click="updateDisplayMode('parallel')"
          >
            原排版
          </button>
          <button 
            :class="[
              'btn btn-xs',
              store.textDisplayMode === 'paragraph' ? 'btn-primary' : 'btn-outline'
            ]"
            @click="updateDisplayMode('paragraph')"
          >
            分段
          </button>
        </div>
        
        <button 
          class="btn btn-xs btn-outline gap-1"
          @click="copyText" 
          :disabled="!copyableText"
          :class="{'btn-success': copyStatus === 'success'}"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {{ copyButtonText }}
        </button>
      </div>

      <div class="divider my-0 flex-shrink-0"></div>

      <!-- 文本内容区 -->
      <div 
        class="flex-1 overflow-y-auto p-2 text-content-area bg-base-100"
        :dir="textDirection"
      >
        <div v-if="!store.hasOcrResult && store.currentFiles.length > 0" class="flex flex-col items-center justify-center h-full text-center opacity-70">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>请点击"开始识别"</p>
        </div>
        
        <div v-else-if="store.isLoading && !store.hasOcrResult" class="flex flex-col items-center justify-center h-full text-center">
          <span class="loading loading-dots loading-md"></span>
          <p class="mt-2">正在识别中...</p>
        </div>
        
        <div v-else-if="store.hasOcrResult">
          <component :is="activeTextComponent" ref="textComponent" :is-rtl="isRtlText" />
        </div>
        
        <div v-else class="flex flex-col items-center justify-center h-full text-center opacity-70">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>识别结果将显示在此处</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';
import { isRtlLanguage } from '@/services/visionApi';

// Import the four specialized text components
import TextHorizontalParallel from './TextHorizontalParallel.vue';
import TextHorizontalParagraph from './TextHorizontalParagraph.vue';
import TextVerticalParallel from './TextVerticalParallel.vue';
import TextVerticalParagraph from './TextVerticalParagraph.vue';

const props = defineProps({
  containerHeight: {
    type: Number,
    default: 0
  }
});

const store = useOcrStore();
const textComponent = ref(null);
const textManagerRef = ref(null);
const copyStatus = ref('idle'); // 'idle', 'success', 'error'

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
      return text.trim();
    }
  }
  
  // 回退方案：根据当前显示模式返回合适的原始文本
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

// 复制文本方法
const copyText = async () => {
  if (!copyableText.value) return;
  
  try {
    await navigator.clipboard.writeText(copyableText.value);
    copyStatus.value = 'success';
    
    // 3秒后重置状态
    setTimeout(() => {
      copyStatus.value = 'idle';
    }, 3000);
  } catch (e) {
    copyStatus.value = 'error';
    console.error('复制失败:', e);
    
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