<template>
  <div class="card bg-base-100 shadow-md w-full h-full flex flex-col" ref="textManagerRef">
    <div class="card-body p-4 flex flex-col h-full overflow-hidden">
      <!-- 信息标题区 -->
      <div class="flex flex-wrap justify-between text-xs text-opacity-70 mb-2 flex-shrink-0">
        <div class="badge badge-neutral">
          {{ i18n.t('size') }}: {{ store.imageDimensions.width || '?' }}×{{
            store.imageDimensions.height || '?'
          }}px
        </div>
        <div class="badge badge-neutral">
          {{ i18n.t('language') }}: {{ displayLanguageName }} ({{ store.detectedLanguageCode }})
          <span v-if="isRtlText" class="ml-1">←</span>
        </div>
        <div class="badge badge-neutral">
          {{ i18n.t('statistics') }}: {{ store.textStats.words }} {{ i18n.t('words') }},
          {{ store.textStats.chars }} {{ i18n.t('characters') }}
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
            {{ i18n.t('parallel') }}
          </button>
          <button
            :class="[
              'btn btn-xs',
              store.textDisplayMode === 'paragraph' ? 'btn-accent' : 'btn-outline',
            ]"
            @click="updateDisplayMode('paragraph')"
          >
            {{ i18n.t('paragraph') }}
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
            {{ i18n.t('planA') }}
          </button>
          <button
            :class="[
              'btn btn-xs',
              activeTextComponent === TextTablePlanB ? 'btn-accent' : 'btn-outline',
            ]"
            @click="setTableComponent('planB')"
          >
            {{ i18n.t('planB') }}
          </button>
        </div>

        <!-- 复制按钮和下拉菜单 -->
        <div class="dropdown dropdown-end">
          <div
            tabindex="0"
            role="button"
            class="btn btn-xs btn-outline gap-1 m-1"
            :class="{ 'btn-success': copyStatus === 'success' }"
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
            {{ copyButtonText }}
          </div>
          <ul
            tabindex="0"
            class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
          >
            <li v-if="store.recognitionMode === 'table'">
              <a @click="copyText('markdown')">{{
                i18n.t('copyMarkdownTable') || '复制Markdown表格'
              }}</a>
            </li>
            <li>
              <a @click="copyText('original')">{{ i18n.t('copyOriginalText') }}</a>
            </li>
            <li>
              <a @click="copyText('filtered')">{{ i18n.t('copyFilteredText') }}</a>
            </li>
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
          <p>{{ i18n.t('pleaseStartOcr') }}</p>
        </div>

        <div
          v-else-if="store.isLoading && !store.hasOcrResult"
          class="flex flex-col items-center justify-center h-full text-center"
        >
          <span class="loading loading-dots loading-md"></span>
          <p class="mt-2">{{ i18n.t('recognizing') }}</p>
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
            <p>{{ i18n.t('noFilteredText') || '无符合当前过滤条件的文本' }}</p>
            <button class="btn btn-sm btn-outline mt-4" @click="resetFilters">
              {{ i18n.t('resetFilters') || '重置过滤器' }}
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
          <p>{{ i18n.t('resultsWillShowHere') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useOcrStore } from '@/stores/ocrStore'
import { useI18nStore } from '@/stores/i18nStore'
import { isRtlLanguageSync, getLanguageName } from '@/services/languageService'

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

// 使用计算属性获取当前语言下的语言名称
// 创建一个响应式变量存储语言名称
const languageName = ref('')

// 当语言代码变化时更新语言名称
watch(
  [() => store.detectedLanguageCode, () => i18n.currentLang],
  async ([code, lang]) => {
    if (!code || code === 'und') {
      languageName.value = i18n.t('undetermined')
      return
    }
    try {
      // 使用当前界面语言作为首选语言
      const preferredLang = i18n.currentLang === 'en' ? 'en' : 'zh'
      languageName.value = await getLanguageName(code, preferredLang)
    } catch (error) {
      console.error('获取语言名称错误:', error)
      languageName.value = code // 出错时显示语言代码
    }
  },
  { immediate: true }
)

// 计算属性返回当前语言名称
const displayLanguageName = computed(() => languageName.value)

// 监听语言变化
watch(
  () => i18n.currentLang,
  () => {
    // 语言切换时更新语言名称会自动通过计算属性更新
  },
  { immediate: true },
)

// 判断是否为RTL文本
const isRtlText = computed(() => {
  // 首先检查识别的主要语言是否为RTL语言
  const isRtlLanguageDetected = isRtlLanguageSync(store.detectedLanguageCode)

  // 如果检测到的主要语言是RTL语言，再根据文本内容确认是否需要RTL方向
  if (isRtlLanguageDetected) {
    // 当文本很短或没有文本时，直接使用语言判断结果
    if (!store.originalFullText || store.originalFullText.length < 10) {
      return true
    }

    // 对于较长文本，分析文本内容确认是否真的需要RTL方向
    return rtlDirectionNeeded(store.originalFullText)
  }

  return false
})

// 分析文本内容，判断是否需要RTL方向
function rtlDirectionNeeded(text) {
  if (!text) return false

  // RTL字符范围（阿拉伯文、希伯来文等）的Unicode正则表达式
  const rtlCharsRegex =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0590-\u05FF\uFB50-\uFDFF\uFE70-\uFEFF]/g

  // 统计RTL字符数量
  const rtlCharMatches = text.match(rtlCharsRegex)
  const rtlCharCount = rtlCharMatches ? rtlCharMatches.length : 0

  // 如果RTL字符占比超过30%，则认为需要RTL方向
  return rtlCharCount > text.length * 0.3
}

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
    return store.fullTextAnnotation?.text || ''
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

// 垂直平行模式的格式化函数 - 复制自TextVerticalParallel组件的逻辑
const formatTextAsVerticalParallel = (symbols) => {
  if (!symbols || symbols.length === 0) {
    return ''
  }

  // 1. 计算平均字符宽度
  const getAverageCharWidth = (syms) => {
    if (!syms || syms.length === 0) return 15 // 默认宽度
    const validSymbols = syms.filter((s) => s.width > 0 && isFinite(s.width))
    const widthsPerChar = validSymbols
      .filter((s) => s.text?.length > 0)
      .map((s) => s.width / s.text.length)
    if (widthsPerChar.length > 0) {
      return widthsPerChar.reduce((a, b) => a + b, 0) / widthsPerChar.length
    } else if (validSymbols.length > 0) {
      return validSymbols.reduce((a, b) => a + b.width, 0) / validSymbols.length
    } else {
      return 15 // 默认值
    }
  }

  const avgWidth = getAverageCharWidth(symbols)
  const columnThreshold = avgWidth * 0.75

  // 2. 初始排序：按X坐标（右到左），次要按Y坐标（上到下）
  const sortedSymbols = [...symbols].sort((a, b) => {
    const colDiff = Math.abs(a.midX - b.midX)
    if (colDiff > columnThreshold) {
      return b.midX - a.midX // 从右到左
    }
    return a.midY - b.midY // 同一列内从上到下
  })

  // 3. 分列：根据X坐标将字符分组
  const columns = []
  let currentColumn = []

  if (sortedSymbols.length > 0) {
    currentColumn.push(sortedSymbols[0])
    let lastMidX = sortedSymbols[0].midX

    for (let i = 1; i < sortedSymbols.length; i++) {
      const sym = sortedSymbols[i]

      if (Math.abs(sym.midX - lastMidX) < columnThreshold) {
        currentColumn.push(sym)
        // 更新参考点（使用平均值）
        lastMidX = currentColumn.reduce((sum, s) => sum + s.midX, 0) / currentColumn.length
      } else {
        // 开始新列
        currentColumn.sort((a, b) => a.midY - b.midY)
        columns.push(currentColumn)
        currentColumn = [sym]
        lastMidX = sym.midX
      }
    }
    // 处理最后一列
    currentColumn.sort((a, b) => a.midY - b.midY)
    columns.push(currentColumn)
  }

  // 4. 按列的X坐标排序（右到左）
  columns.sort((a, b) => {
    const avgXa = a.reduce((s, c) => s + c.midX, 0) / a.length
    const avgXb = b.reduce((s, c) => s + c.midX, 0) / b.length
    return avgXb - avgXa
  })

  // 5. 拼接结果：每列一行，列间用换行符连接
  const resultText = columns.map((col) => col.map((s) => s.text).join('')).join('\n')
  return resultText.length > 0 ? resultText : ''
}

// 垂直段落模式的格式化函数 - 复制自TextVerticalParagraph组件的逻辑
const formatTextAsVerticalParagraph = () => {
  if (!store.fullTextAnnotation?.pages || !store.filteredSymbolsData) {
    return ''
  }
  
  // 添加安全检查，确保 filteredSymbolsData 是数组
  if (!Array.isArray(store.filteredSymbolsData)) {
    console.error('错误: formatTextAsVerticalParagraph - filteredSymbolsData 不是数组', store.filteredSymbolsData)
    return ''
  }

  // 辅助函数：计算平均字符宽度
  const getAverageCharWidth = (symbols) => {
    if (!symbols || symbols.length === 0) return 15
    const validSymbols = symbols.filter((s) => s.width > 0 && isFinite(s.width))
    const widthsPerChar = validSymbols
      .filter((s) => s.text?.length > 0)
      .map((s) => s.width / s.text.length)
    if (widthsPerChar.length > 0) {
      return widthsPerChar.reduce((a, b) => a + b, 0) / widthsPerChar.length
    } else if (validSymbols.length > 0) {
      return validSymbols.reduce((a, b) => a + b.width, 0) / validSymbols.length
    } else {
      return 15
    }
  }

  const paragraphTextArray = [] // 存储每个段落的文本和位置

  // 1. 遍历原始的段落结构
  store.fullTextAnnotation.pages.forEach((page) => {
    page.blocks?.forEach((block) => {
      block.paragraphs?.forEach((paragraph) => {
        const symbolsInParagraph = []
        let paragraphHasFilteredContent = false

        // 获取段落左上角x坐标（用于段落排序）
        let paraX = 0
        if (paragraph.boundingBox?.vertices?.length) {
          paraX = Math.min(...paragraph.boundingBox.vertices.map((v) => v?.x ?? 0))
        }

        // 收集段落内所有通过过滤的符号并清理换行符
        paragraph.words?.forEach((word) => {
          word.symbols?.forEach((symbol) => {
            const symbolData = store.filteredSymbolsData.find(
              (fd) =>
                fd.originalIndex !== undefined &&
                fd.text === symbol.text &&
                Math.abs(fd.x - (symbol.boundingBox?.vertices?.[0]?.x ?? -1)) < 2 &&
                Math.abs(fd.y - (symbol.boundingBox?.vertices?.[0]?.y ?? -1)) < 2,
            )

            if (symbolData?.isFiltered) {
              // 只清理段落内的换行符
              const cleanedSymbol = {
                ...symbolData,
                text: (symbolData.text || '').replace(/[\r\n]/g, ''),
              }
              symbolsInParagraph.push(cleanedSymbol)
              paragraphHasFilteredContent = true
            }
          })
        })

        if (paragraphHasFilteredContent && symbolsInParagraph.length > 0) {
          // 使用与generateVerticalParallelText相同的列分割逻辑
          const avgWidth = getAverageCharWidth(symbolsInParagraph)
          const columnThreshold = avgWidth * 0.75

          // 排序：按X坐标（右到左），次要按Y坐标（上到下）
          symbolsInParagraph.sort((a, b) => {
            const colDiff = Math.abs(a.midX - b.midX)
            if (colDiff > columnThreshold) {
              return b.midX - a.midX
            }
            return a.midY - b.midY
          })

          // 分列
          const columns = []
          let currentColumn = []

          if (symbolsInParagraph.length > 0) {
            currentColumn.push(symbolsInParagraph[0])
            let lastMidX = symbolsInParagraph[0].midX

            for (let i = 1; i < symbolsInParagraph.length; i++) {
              const sym = symbolsInParagraph[i]

              if (Math.abs(sym.midX - lastMidX) < columnThreshold) {
                currentColumn.push(sym)
                lastMidX = currentColumn.reduce((sum, s) => sum + s.midX, 0) / currentColumn.length
              } else {
                currentColumn.sort((a, b) => a.midY - b.midY)
                columns.push(currentColumn)
                currentColumn = [sym]
                lastMidX = sym.midX
              }
            }
            // 处理最后一列
            currentColumn.sort((a, b) => a.midY - b.midY)
            columns.push(currentColumn)
          }

          // 按列的X坐标排序（右到左）
          columns.sort((a, b) => {
            const avgXa = a.reduce((s, c) => s + c.midX, 0) / a.length
            const avgXb = b.reduce((s, c) => s + c.midX, 0) / b.length
            return avgXb - avgXa
          })

          // 拼接结果，列之间不用空格分隔
          const paragraphText = columns.map((col) => col.map((s) => s.text).join('')).join('')

          paragraphTextArray.push({ text: paragraphText, paraX })
        }
      })
    })
  })

  if (paragraphTextArray.length === 0) {
    return ''
  }

  // 2. 段落排序：按x坐标从大到小
  paragraphTextArray.sort((a, b) => b.paraX - a.paraX)

  // 3. 拼接结果，段落之间用双换行符连接
  const resultText = paragraphTextArray.map((pd) => pd.text).join('\n\n')

  return resultText.length > 0 ? resultText : ''
}

// 水平段落模式的格式化函数 - 复制自TextHorizontalParagraph组件的逻辑
const formatTextAsHorizontalParagraph = () => {
  if (!store.fullTextAnnotation?.pages || !store.filteredSymbolsData) {
    return ''
  }
  
  // 添加安全检查，确保 filteredSymbolsData 是数组
  if (!Array.isArray(store.filteredSymbolsData)) {
    console.error('错误: formatTextAsHorizontalParagraph - filteredSymbolsData 不是数组', store.filteredSymbolsData)
    return ''
  }

  const paragraphsOutput = []
  const noSpaceLanguages = ['zh', 'ja', 'ko', 'th', 'lo', 'my'] // 不使用空格的语言
  const isCJKLanguage = noSpaceLanguages.includes(store.detectedLanguageCode)

  store.fullTextAnnotation.pages.forEach((page) => {
    page.blocks?.forEach((block) => {
      block.paragraphs?.forEach((paragraph) => {
        let currentParagraphText = ''
        let paragraphHasFilteredContent = false
        let paragraphMinY = Infinity

        // 尝试获取段落边界框的Y坐标用于排序
        if (paragraph.boundingBox?.vertices) {
          paragraphMinY = Math.min(...paragraph.boundingBox.vertices.map((v) => v?.y ?? Infinity))
        }

        paragraph.words?.forEach((word) => {
          word.symbols?.forEach((symbol) => {
            // 在filteredSymbolsData中查找对应的符号
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
                ) < 5 &&
                Math.abs(
                  fd.midY -
                    (symbol.boundingBox
                      ? (Math.min(...symbol.boundingBox.vertices.map((v) => v?.y ?? Infinity)) +
                          Math.max(...symbol.boundingBox.vertices.map((v) => v?.y ?? -Infinity))) /
                        2
                      : -Infinity),
                ) < 5,
            )

            if (symbolData?.isFiltered) {
              // 检查符号是否通过过滤
              const breakType = symbolData.detectedBreak

              // 处理非CJK语言中的连字符 (HYPHEN或EOL_SURE_SPACE)
              // 如果不是CJK语言，且当前符号是连字符，且有HYPHEN或EOL_SURE_SPACE断行，则跳过
              if (
                !isCJKLanguage &&
                symbol.text === '-' &&
                (breakType === 'HYPHEN' || breakType === 'EOL_SURE_SPACE')
              ) {
                // 跳过连字符和空格的添加
                paragraphHasFilteredContent = true // 仍然标记段落包含过滤内容
              } else {
                // 正常处理符号文本
                if (isCJKLanguage) {
                  // 替换西文标点为中文标点
                  if (symbol.text === ',') {
                    currentParagraphText += '，' // 替换逗号
                  } else if (symbol.text === '-') {
                    currentParagraphText += '——' // 替换连字符为破折号
                  } else if (symbol.text === ';') {
                    currentParagraphText += '；' // 替换分号
                  } else if (symbol.text === '!') {
                    currentParagraphText += '！' // 替换感叹号
                  } else if (symbol.text === '?') {
                    currentParagraphText += '？' // 替换问号
                  } else if (symbol.text === ':') {
                    currentParagraphText += '：' // 替换冒号
                  } else {
                    currentParagraphText += symbol.text
                  }
                } else {
                  currentParagraphText += symbol.text
                }

                paragraphHasFilteredContent = true

                // 添加空格（如果需要且语言使用空格）
                if ((breakType === 'SPACE' || breakType === 'EOL_SURE_SPACE') && !isCJKLanguage) {
                  currentParagraphText += ' '
                }
              }
            }
          }) // 符号循环结束
        }) // 单词循环结束

        if (paragraphHasFilteredContent) {
          let cleanedText = currentParagraphText.replace(/\s+/g, ' ').trim() // 清理空格
          if (cleanedText.length > 0) {
            paragraphsOutput.push({
              text: cleanedText,
              y: isFinite(paragraphMinY) ? paragraphMinY : Infinity,
            })
          }
        }
      }) // 段落循环结束
    }) // 块循环结束
  }) // 页面循环结束

  if (paragraphsOutput.length === 0) {
    return ''
  }

  // 按垂直位置排序段落（从上到下）
  paragraphsOutput.sort((a, b) => a.y - b.y)

  // 用双换行符连接段落
  return paragraphsOutput.map((p) => p.text).join('\n\n')
}

// 水平平行模式的格式化函数 - 复制自TextHorizontalParallel组件的逻辑
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
    return rawText
  }

  // 否则使用过滤后的文本 - 类似generateFilteredText函数
  const symbolsToProcess = store.filteredSymbolsData
  
  // 添加安全检查，确保 filteredSymbolsData 是数组
  if (!Array.isArray(symbolsToProcess)) {
    console.error('错误: formatTextAsHorizontalParallel - filteredSymbolsData 不是数组', symbolsToProcess)
    return ''
  }
  
  if (!symbolsToProcess || symbolsToProcess.length === 0) {
    return ''
  }

  let text = ''
  symbolsToProcess.forEach((symbol) => {
    if (symbol.isFiltered) {
      text += symbol.text
      const breakType = symbol.detectedBreak
      if (breakType === 'SPACE' || breakType === 'EOL_SURE_SPACE') {
        text += ' '
      } else if (breakType === 'LINE_BREAK' || breakType === 'HYPHEN') {
        text += '\n'
      }
    }
  })

  return text.replace(/ +/g, ' ').replace(/\n+/g, '\n').trim()
}

// 添加一个通用的CJK标点符号替换函数
const replaceCJKPunctuation = (text) => {
  if (!text || !store.detectedLanguageCode) return text

  const noSpaceLanguages = ['zh', 'ja', 'ko', 'th', 'lo', 'my']
  if (!noSpaceLanguages.includes(store.detectedLanguageCode)) return text

  // 使用正则表达式替换所有标点符号
  return text
    .replace(/,/g, '，') // 替换逗号
    .replace(/-/g, '——') // 替换连字符为破折号
    .replace(/;/g, '；') // 替换分号
    .replace(/!/g, '！') // 替换感叹号
    .replace(/\?/g, '？') // 替换问号
    .replace(/:/g, '：') // 替换冒号
}

// 复制按钮文本
const copyButtonText = computed(() => {
  if (copyStatus.value === 'success') {
    return i18n.t('copied')
  }

  if (store.recognitionMode === 'table') {
    return i18n.t('copyMarkdownTable') || '复制表格'
  }

  return i18n.t('copy')
})

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
  textToCopy = replaceCJKPunctuation(textToCopy)

  try {
    await navigator.clipboard.writeText(textToCopy)
    copyStatus.value = 'success'

    // 3秒后重置状态
    setTimeout(() => {
      copyStatus.value = 'idle'
    }, 3000)

    // 显示成功提示
    store._showNotification(i18n.t('textCopied'), 'success')
  } catch (e) {
    copyStatus.value = 'error'
    console.error('复制失败:', e)

    // 显示错误提示
    store._showNotification(i18n.t('copyFailed'), 'error')

    // 3秒后重置状态
    setTimeout(() => {
      copyStatus.value = 'idle'
    }, 3000)
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
  store._showNotification(i18n.t('filtersReset') || '过滤器已重置', 'info')
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
