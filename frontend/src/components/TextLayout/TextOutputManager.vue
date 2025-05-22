<template>
  <div class="card bg-base-100 shadow-md w-full h-full flex flex-col" ref="textManagerRef">
    <div class="card-body p-4 flex flex-col h-full overflow-hidden">
      <!-- 信息标题区 -->
      <div
        v-if="store.hasOcrResult"
        class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs overflow-hidden text-gray-500 mb-2"
      >
        <!-- 图片尺寸 -->
        <div class="flex items-center overflow-hidden whitespace-nowrap">
          {{ uiTexts.size }}: {{ store.imageDimensions.width || '?' }}×{{
            store.imageDimensions.height || '?'
          }}px
        </div>

        <!-- 语言信息 -->
        <div class="flex items-center overflow-hidden whitespace-nowrap">
          {{ uiTexts.language }}: {{ displayLanguageName }} ({{ store.detectedLanguageCode }})
          <span v-if="isRtlText" class="ml-1">←</span>
        </div>

        <!-- 文本统计 -->
        <div class="flex items-center overflow-hidden whitespace-nowrap">
          {{ uiTexts.statistics }}: {{ store.textStats.words }} {{ uiTexts.words }},
          {{ store.textStats.chars }} {{ uiTexts.characters }}
        </div>
      </div>

      <!-- 控制区 -->
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2 flex-shrink-0">
        <div class="btn-group" v-if="store.recognitionMode !== 'table'">
          <button
            :class="[
              'btn btn-xs',
              store.textDisplayMode === 'parallel' ? 'btn-accent' : 'btn-outline',
            ]"
            @click="updateDisplayMode('parallel')"
          >
            {{ uiTexts.parallel }}
          </button>
          <button
            :class="[
              'btn btn-xs',
              store.textDisplayMode === 'paragraph' ? 'btn-accent' : 'btn-outline',
            ]"
            @click="updateDisplayMode('paragraph')"
          >
            {{ uiTexts.paragraph }}
          </button>
        </div>

        <!-- 表格模式标识 -->
        <div v-if="store.recognitionMode === 'table'" class="btn-group">
          <button
            :class="[
              'btn btn-xs',
              activeTextComponent === TextTable ? 'btn-accent' : 'btn-outline',
            ]"
            @click="setTableComponent('planA')"
          >
            {{ uiTexts.planA }}
          </button>
          <button
            :class="[
              'btn btn-xs',
              activeTextComponent === TextTablePlanB ? 'btn-accent' : 'btn-outline',
            ]"
            @click="setTableComponent('planB')"
          >
            {{ uiTexts.planB }}
          </button>
        </div>

        <!-- 复制按钮 -->
        <button
          class="btn btn-xs btn-outline gap-1 m-1"
          :class="{ 'btn-success': copyStatus === 'success' }"
          @click="copyText('filtered')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          {{ uiTexts.copy }}
        </button>
      </div>

      <div class="divider my-0 flex-shrink-0"></div>

      <!-- 文本内容区 -->
      <div
        class="flex-1 overflow-y-auto p-2 text-content-area bg-base-100"
        :dir="textDirection"
        ref="textContentRef"
      >
        <div
          v-if="!store.hasOcrResult && store.currentFiles.length > 0"
          class="flex flex-col items-center justify-center h-full text-center opacity-70"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-12 w-12 mb-2 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>{{ uiTexts.pleaseStartOcr }}</p>
        </div>

        <div
          v-else-if="store.isLoading && !store.hasOcrResult"
          class="flex flex-col items-center justify-center h-full text-center"
        >
          <span class="loading loading-dots loading-md"></span>
          <p class="mt-2">{{ uiTexts.recognizing }}</p>
        </div>

        <div v-else-if="store.hasOcrResult">
          <div
            v-if="!hasFilteredText"
            class="flex flex-col items-center justify-center h-full text-center opacity-70"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-12 w-12 mb-2 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p>{{ uiTexts.noFilteredText }}</p>
            <button class="btn btn-sm btn-outline mt-4" @click="resetFilters">
              {{ uiTexts.resetFilters }}
            </button>
          </div>
          <component v-else :is="activeTextComponent" ref="textComponent" :is-rtl="isRtlText" />
        </div>

        <div v-else class="flex flex-col items-center justify-center h-full text-center opacity-70">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-12 w-12 mb-2 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>{{ uiTexts.resultsWillShowHere }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useOcrStore } from '@/stores/ocrStore'
import { useI18nStore } from '@/stores/i18nStore'
import { shouldUseRtlDirection, getLanguageName } from '@/services/languageService'
import {
  replaceCJKPunctuation,
  processSymbolText,
  formatParagraphText,
  shouldSkipSymbol,
  cleanLineBreaks,
  cleanTextSpaces,
  processHorizontalParallelText,
  processHorizontalParagraphText,
  processVerticalParallelText,
  processVerticalParagraphText,
} from '@/utils/textProcessors'

// Import the four specialized text components
import TextHorizontalParallel from './TextHorizontalParallel.vue'
import TextHorizontalParagraph from './TextHorizontalParagraph.vue'
import TextVerticalParallel from './TextVerticalParallel.vue'
import TextVerticalParagraph from './TextVerticalParagraph.vue'
import TextTable from './TextTable.vue' // 导入表格组件
import TextTablePlanB from './TextTablePlanB.vue' // 导入方案B表格组件

const props = defineProps({
  containerHeight: {
    type: Number,
    default: 0,
  },
})

const store = useOcrStore()
const i18n = useI18nStore()
const textComponent = ref(null)
const textManagerRef = ref(null)
const textContentRef = ref(null) // 添加对文本内容区域的引用
const copyStatus = ref('idle') // 'idle', 'success', 'error'
const lastCopyType = ref('original') // 记录上次复制的类型，默认为原始文本

// 创建计算属性来响应式地获取UI文本
const uiTexts = computed(() => ({
  size: i18n.t('size'),
  language: i18n.t('language'),
  statistics: i18n.t('statistics'),
  words: i18n.t('words'),
  characters: i18n.t('characters'),
  parallel: i18n.t('parallel'),
  paragraph: i18n.t('paragraph'),
  planA: i18n.t('planA'),
  planB: i18n.t('planB'),
  copyMarkdownTable: i18n.t('copyMarkdownTable'),
  copyOriginalText: i18n.t('copyOriginalText'),
  copyFilteredText: i18n.t('copyFilteredText'),
  pleaseStartOcr: i18n.t('pleaseStartOcr'),
  recognizing: i18n.t('recognizing'),
  noFilteredText: i18n.t('noFilteredText') || '无符合当前过滤条件的文本',
  resetFilters: i18n.t('resetFilters') || '重置过滤器',
  resultsWillShowHere: i18n.t('resultsWillShowHere'),
  undetermined: i18n.t('undetermined'),
  copy: i18n.t('copy'),
  copied: i18n.t('copied'),
  textCopied: i18n.t('textCopied'),
  copyFailed: i18n.t('copyFailed'),
  filtersReset: i18n.t('filtersReset') || '过滤器已重置',
}))

// 使用计算属性获取当前语言下的语言名称
// 创建一个响应式变量存储语言名称
const languageName = ref('')

// 当语言代码或界面语言变化时更新语言名称
watch(
  [() => store.detectedLanguageCode, () => i18n.currentLang],
  async ([code, currentLang]) => {
    if (!code || code === 'und') {
      languageName.value = uiTexts.value.undetermined
      return
    }
    try {
      // 使用当前界面语言作为首选语言
      const preferredLang = currentLang === 'en' ? 'en' : 'zh'
      languageName.value = await getLanguageName(code, preferredLang)
    } catch (error) {
      console.error('获取语言名称错误:', error)
      languageName.value = code // 出错时显示语言代码
    }
  },
  { immediate: true },
)

// 计算属性返回当前语言名称
const displayLanguageName = computed(() => languageName.value)

// 监听语言变化
watch(
  () => i18n.currentLang,
  () => {
    // 语言切换时更新语言名称
    if (store.detectedLanguageCode) {
      // 重新触发语言名称更新
      const preferredLang = i18n.currentLang === 'en' ? 'en' : 'zh'
      getLanguageName(store.detectedLanguageCode, preferredLang)
        .then((name) => {
          languageName.value = name
        })
        .catch((error) => {
          console.error('更新语言名称失败:', error)
        })
    }
  },
)

// 判断是否为RTL文本
const isRtlText = computed(() => {
  // 使用集中在 languageService.js 中的函数判断是否需要 RTL 方向
  return shouldUseRtlDirection(store.detectedLanguageCode, store.originalFullText)
})

// 设置文本方向
const textDirection = computed(() => {
  return isRtlText.value ? 'rtl' : 'ltr'
})

// 监听容器高度变化
watch(
  () => props.containerHeight,
  (newHeight) => {
    if (newHeight > 0) {
      textManagerRef.value.style.height = `${newHeight}px`
    }
  },
  { immediate: true },
)

// 在组件挂载后初始化高度
onMounted(() => {
  // 如果已经有传入的容器高度，立即更新
  if (props.containerHeight > 0) {
    textManagerRef.value.style.height = `${props.containerHeight}px`
  }
})

// Determine which component to render dynamically
const activeTextComponent = computed(() => {
  // 首先检查是否是表格模式
  if (store.recognitionMode === 'table') {
    return store.currentTableComponent === 'planB' ? TextTablePlanB : TextTable
  }

  // 如果不是表格模式，则按原逻辑处理文本方向和显示模式
  const direction = store.initialTextDirection
  const displayMode = store.textDisplayMode

  if (direction === 'vertical') {
    return displayMode === 'parallel' ? TextVerticalParallel : TextVerticalParagraph
  } else {
    // Default to horizontal
    return displayMode === 'parallel' ? TextHorizontalParallel : TextHorizontalParagraph
  }
})

const updateDisplayMode = (mode) => {
  store.setTextDisplayMode(mode)
}

// 获取原始文本
const getOriginalText = () => {
  // 如果是表格模式，返回 Markdown 格式的表格
  if (
    store.recognitionMode === 'table' &&
    textComponent.value &&
    textComponent.value.getMarkdownTable
  ) {
    return textComponent.value.getMarkdownTable()
  }

  // 根据当前活动组件类型应用对应的格式化策略
  const componentType = activeTextComponent.value

  if (componentType === TextVerticalParallel) {
    // 垂直平行模式
    // 使用filteredSymbolsData而不是rawSymbolsData
    return formatTextAsVerticalParallel(
      store.filteredSymbolsData?.filter((s) => s.isFiltered) || [],
    )
  } else if (componentType === TextVerticalParagraph) {
    // 垂直段落模式
    return formatTextAsVerticalParagraph()
  } else if (componentType === TextHorizontalParagraph) {
    // 水平段落模式
    return formatTextAsHorizontalParagraph()
  } else {
    // 水平平行模式 (TextHorizontalParallel)
    return formatTextAsHorizontalParallel()
  }
}

// 获取过滤后的文本
const getFilteredText = () => {
  // 如果是表格模式，返回 Markdown 格式的表格
  if (
    store.recognitionMode === 'table' &&
    textComponent.value &&
    textComponent.value.getMarkdownTable
  ) {
    return textComponent.value.getMarkdownTable()
  }

  // 根据当前活动组件类型应用对应的格式化策略
  const componentType = activeTextComponent.value

  if (componentType === TextVerticalParallel) {
    // 垂直平行模式
    // 添加安全检查，确保 filteredSymbolsData 是数组
    if (!Array.isArray(store.filteredSymbolsData)) {
      console.error('错误: filteredSymbolsData 不是数组', store.filteredSymbolsData)
      return ''
    }
    return formatTextAsVerticalParallel(store.filteredSymbolsData.filter((s) => s.isFiltered))
  } else if (componentType === TextVerticalParagraph) {
    // 垂直段落模式
    return formatTextAsVerticalParagraph()
  } else if (componentType === TextHorizontalParagraph) {
    // 水平段落模式
    return formatTextAsHorizontalParagraph()
  } else {
    // 水平平行模式 (TextHorizontalParallel)
    return formatTextAsHorizontalParallel()
  }
}

// 垂直平行模式的格式化函数 - 使用工具函数
const formatTextAsVerticalParallel = (symbols) => {
  if (!symbols || symbols.length === 0) {
    return ''
  }

  // 使用工具函数处理垂直并行文本
  return processVerticalParallelText(symbols, store.detectedLanguageCode, false)
}

// 垂直段落模式的格式化函数 - 使用工具函数
const formatTextAsVerticalParagraph = () => {
  if (!store.fullTextAnnotation?.pages || !store.filteredSymbolsData) {
    return ''
  }

  // 使用工具函数处理垂直段落文本
  return processVerticalParagraphText(
    store.fullTextAnnotation,
    store.filteredSymbolsData,
    store.detectedLanguageCode,
  )
}

// 水平段落模式的格式化函数 - 复制自TextHorizontalParagraph组件的逻辑
// 水平段落模式的格式化函数 - 使用工具函数
const formatTextAsHorizontalParagraph = () => {
  // 使用工具函数处理水平段落文本
  return processHorizontalParagraphText(
    store.fullTextAnnotation,
    store.filteredSymbolsData,
    store.detectedLanguageCode,
  )
}

// 水平并行模式的格式化函数 - 使用工具函数
const formatTextAsHorizontalParallel = () => {
  // 检查是否使用默认过滤器设置
  const checkIfDefaultFilter = () => {
    const { filterSettings, filterBounds } = store

    if (!filterSettings || !filterBounds) return true

    // 检查当前过滤器是否是最大范围（即全部显示）
    return (
      filterSettings.minWidth === filterBounds.width?.min &&
      filterSettings.maxWidth === filterBounds.width?.max &&
      filterSettings.minX === filterBounds.x?.min &&
      filterSettings.maxX === filterBounds.x?.max &&
      filterSettings.minY === filterBounds.y?.min &&
      filterSettings.maxY === filterBounds.y?.max
    )
  }

  // 从store中获取原始文本
  const rawText = store.fullTextAnnotation?.text || ''

  // 如果存在文本并且过滤器设置为默认值，直接返回完整文本
  const isDefaultFilter = checkIfDefaultFilter()

  if (rawText && isDefaultFilter) {
    // 使用工具函数处理标点符号
    return replaceCJKPunctuation(rawText, store.detectedLanguageCode)
  }

  // 否则使用工具函数处理过滤后的文本
  return processHorizontalParallelText(store.filteredSymbolsData, store.detectedLanguageCode, true)
}

// 使用工具函数处理文本

// 复制文本方法，根据类型选择复制内容
const copyText = async (type = '') => {
  if (!store.hasOcrResult) return

  // 保存当前使用的类型（如果指定了类型）
  if (type) {
    lastCopyType.value = type
  } else {
    // 如果没有指定类型，使用上次的类型
    type = lastCopyType.value
  }

  // 根据类型获取要复制的文本
  let textToCopy = ''
  if (type === 'original') {
    textToCopy = getOriginalText()
  } else if (type === 'filtered') {
    textToCopy = getFilteredText()
  } else if (type === 'markdown') {
    // 表格模式下复制 Markdown 表格
    if (textComponent.value && textComponent.value.getMarkdownTable) {
      textToCopy = textComponent.value.getMarkdownTable()
    } else {
      textToCopy = getFilteredText()
    }
  }

  if (!textToCopy) return

  // 应用标点符号替换
  textToCopy = replaceCJKPunctuation(textToCopy, store.detectedLanguageCode)

  try {
    await navigator.clipboard.writeText(textToCopy)
    copyStatus.value = 'success'

    // 3秒后重置状态
    setTimeout(() => {
      copyStatus.value = 'idle'
    }, 3000)

    // 显示成功提示
    store._showNotification(uiTexts.value.textCopied, 'success')

    // 保存OCR结果到本地存储
    await saveOcrResult(textToCopy)
  } catch (e) {
    copyStatus.value = 'error'
    console.error('复制失败:', e)

    // 显示错误提示
    store._showNotification(uiTexts.value.copyFailed, 'error')

    // 3秒后重置状态
    setTimeout(() => {
      copyStatus.value = 'idle'
    }, 3000)
  }
}

// 保存OCR结果到本地存储
const saveOcrResult = async (text) => {
  try {
    // 动态导入保存结果服务和认证服务
    const { saveResult } = await import('@/services/savedResultsService')
    const { isAuthenticated } = await import('@/services/authService')

    // 检查用户是否已登录
    const userIsLoggedIn = isAuthenticated()
    console.log('isAuthenticated:', userIsLoggedIn ? '令牌有效，返回true' : '令牌无效，返回false')

    // 创建结果对象
    const result = {
      text,
      language: store.detectedLanguageCode,
      languageName: languageName.value,
    }

    // 保存结果
    const success = await saveResult(result)
    if (success) {
      console.log('OCR结果已保存')
    } else if (!userIsLoggedIn) {
      // 如果用户未登录，显示提示信息
      store._showNotification('请登录后才能保存OCR结果', 'warning')
    }
  } catch (error) {
    console.error('保存OCR结果时出错:', error)
  }
}

const setTableComponent = (plan) => {
  store.setTableComponent(plan)
}

// 添加检查是否有符合过滤条件的文本的计算属性
const hasFilteredText = computed(() => {
  // 判断是否有符合过滤条件的文本元素
  if (!store.filteredSymbolsData || store.filteredSymbolsData.length === 0) {
    return false
  }

  // 检查是否至少有一个元素通过了过滤
  return store.filteredSymbolsData.some((symbol) => symbol.isFiltered)
})

// 重置过滤器
const resetFilters = () => {
  if (!store.filterBounds) return

  // 使用过滤器范围的最大值重置过滤器
  const resetSettings = {
    minWidth: store.filterBounds.width?.min || 0,
    maxWidth: store.filterBounds.width?.max || 100,
    minX: store.filterBounds.x?.min || 0,
    maxX: store.filterBounds.x?.max || 1000,
    minY: store.filterBounds.y?.min || 0,
    maxY: store.filterBounds.y?.max || 1000,
  }

  // 调用store中的过滤器方法
  store.applyFilters(resetSettings)

  // 显示通知
  store._showNotification(uiTexts.value.filtersReset, 'info')
}
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
