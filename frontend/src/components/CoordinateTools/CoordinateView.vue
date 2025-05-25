<template>
  <FloatingButton
    type="secondary"
    position="bottom-right"
    :offset="{ x: 4, y: 4 }"
    :visible="store.hasOcrResult"
    @click="toggleCoordinateView"
  >
    <template #icon>
      <FloatingButtonIcons type="coordinate" />
    </template>
  </FloatingButton>

  <div
    v-if="showCoordinateView && store.hasOcrResult"
    class="fixed inset-0 z-40 pointer-events-none flex items-center justify-center bg-base-300 bg-opacity-50"
  >
    <!-- 使用pointer-events-auto可以让坐标视图窗口接收鼠标事件，而背景则不会阻挡其他元素 -->
    <div
      class="card bg-base-100 shadow-xl w-[90%] h-[90%] max-w-7xl max-h-[90vh] flex flex-col pointer-events-auto"
      ref="coordViewContainer"
    >
      <div class="card-title p-4 justify-between items-center border-b border-base-300">
        <h3 class="text-lg font-medium">{{ i18n.t('coordinateView') }}</h3>

        <div class="flex items-center gap-2">
          <!-- 调试信息 -->
          <div class="text-xs bg-base-200 px-2 py-1 rounded">
            <span>{{ i18n.t('cachedPolygons') }}: {{ blockBoundaries.length }}, </span>
            <span>{{ i18n.t('visiblePolygons') }}: {{ visibleBlockBoundaries.length }}</span>
          </div>

          <!-- 缩放控制按钮 -->
          <div class="flex items-center gap-1 mx-2">
            <button class="btn btn-sm btn-circle" @click="zoomOut" :disabled="zoomLevel <= 0.2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20 12H4"
                />
              </svg>
            </button>
            <span class="text-xs">{{ Math.round(zoomLevel * 100) }}%</span>
            <button class="btn btn-sm btn-circle" @click="zoomIn" :disabled="zoomLevel >= 2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>

          <!-- 全屏按钮 -->
          <button
            class="btn btn-sm btn-circle"
            @click="toggleFullscreen"
            :title="isFullscreen ? i18n.t('exitFullscreen') : i18n.t('fullscreenMode')"
          >
            <svg
              v-if="!isFullscreen"
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 8V4m0 4h4M4 4h4m-4 0L8 8m12-4v4m0-4h-4m4 4h-4m4-4l-4 4M4 16v4m0-4h4m-4 4h4m-4 0l4-4m12 4v-4m0 4h-4m4-4h-4m4 4l-4-4"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div class="flex items-center gap-2">
            <span class="text-sm">{{ i18n.t('blockLevel') }}:</span>
            <select v-model="selectedBlockLevel" class="select select-sm select-bordered">
              <option value="blocks">{{ i18n.t('blocks') }}</option>
              <option value="paragraphs">{{ i18n.t('paragraphs') }}</option>
              <option value="words">{{ i18n.t('words') }}</option>
              <option value="symbols">{{ i18n.t('symbols') }}</option>
            </select>
          </div>

          <!-- 使用GridAlignmentTool组件替换原来的对齐按钮 -->
          <GridAlignmentTool
            v-model:selectedBlockLevel="selectedBlockLevel"
            :filteredSymbolsData="store.filteredSymbolsData"
            ref="gridAlignmentToolRef"
            :xAxisOffset="30"
            @gridAlignChange="handleGridAlignChange"
            v-model:alignedSymbols="alignedSymbols"
          />

          <button class="btn btn-sm" @click="toggleBlockVisibility">
            {{ showBounds ? i18n.t('hideBlocks') : i18n.t('showBlocks') }}
          </button>

          <button class="btn btn-sm btn-ghost btn-circle" @click="closeCoordinateView">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="card-body p-4 overflow-auto">
        <div class="coordinate-system-wrapper" ref="coordSystemWrapper">
          <div
            class="coordinate-system"
            ref="coordSystemRef"
            :class="{ 'with-grid': gridAlignmentToolRef?.showGridAlign }"
            :style="{
              width: systemWidth + 'px',
              height: systemHeight + 'px',
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left',
              willChange: 'transform',
              backgroundSize: gridAlignmentToolRef?.showGridAlign
                ? `${gridAlignmentToolRef.gridCellSize}px ${gridAlignmentToolRef.gridCellSize}px`
                : 'auto',
            }"
            @transitionend="handleTransformEnd"
          >
            <div class="y-axis" :style="{ height: store.imageDimensions.height + 'px' }"></div>
            <div class="x-axis" :style="{ width: store.imageDimensions.width + 'px' }"></div>

            <div
              v-for="label in xAxisLabels"
              :key="'x' + label.pos"
              class="axis-label x-label"
              :style="{ left: label.pos + 'px' }"
            >
              {{ label.text }}
            </div>
            <div
              v-for="label in yAxisLabels"
              :key="'y' + label.pos"
              class="axis-label y-label"
              :style="{ top: label.pos + 'px' }"
            >
              {{ label.text }}
            </div>

            <svg
              class="block-svg"
              :viewBox="`0 0 ${systemWidth} ${systemHeight}`"
              preserveAspectRatio="none"
            >
              <!-- 单层多边形设计 - 添加一个始终可点击的透明层 -->
              <g
                v-for="(block, index) in visibleBlockBoundaries"
                :key="`block-${selectedBlockLevel}-${index}`"
              >
                <!-- 可见边界 -->
                <polygon
                  class="block-polygon"
                  :class="{ 'polygon-hover': index === activePolygonIndex }"
                  :points="block.points"
                  :data-index="index"
                  :data-tooltip="block.tooltip"
                  @click="copyBlockText(block.text, $event)"
                  :style="{ display: showBounds ? 'block' : 'none' }"
                />

                <!-- 始终存在的隐形点击层 -->
                <polygon
                  class="block-polygon-click-layer"
                  :points="block.points"
                  @mouseenter="showPolygonHover(index, $event, block.tooltip)"
                  @mousemove="updateTooltipPosition"
                  @mouseleave="hidePolygonHover"
                  @click="copyBlockText(block.text, $event)"
                />
              </g>
            </svg>

            <!-- 使用从GridAlignmentTool获取的数据渲染字符 -->
            <div
              v-for="(symbol, index) in alignedSymbols"
              :key="`symbol-${index}`"
              class="text-block"
              :style="{
                left: `${(symbol.x || 0) + 30}px` /* 加30px是Y轴标签的偏移 */,
                top: `${symbol.y || 0}px`,
                width: `${symbol.width}px`,
                height: `${symbol.height}px`,
                fontSize: symbol.fontSize || '12px',
                border: gridAlignmentToolRef?.showGridAlign
                  ? '1px solid rgba(200, 200, 200, 0.3)'
                  : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: gridAlignmentToolRef?.showGridAlign ? 'normal' : 'inherit',
                fontFamily: gridAlignmentToolRef?.showGridAlign
                  ? '\'Arial\', sans-serif'
                  : 'inherit',
                letterSpacing: gridAlignmentToolRef?.showGridAlign ? 'normal' : 'inherit',
                backgroundColor: symbol.backgroundColor || 'transparent',
              }"
            >
              {{ symbol.text }}
            </div>

            <!-- 调试信息悬浮块 -->
            <div v-if="blockBoundaries.length > 0" class="debug-info">
              {{ i18n.t('cachedPolygons') }}: {{ blockBoundaries.length }}<br />
              {{ i18n.t('visiblePolygons') }}: {{ visibleBlockBoundaries.length }}<br />
              {{ i18n.t('zoom') }}: {{ Math.round(zoomLevel * 100) }}%
            </div>

            <!-- 复制成功的通知将紧贴鼠标位置显示 -->
            <div v-if="showCopySuccess" class="mouse-follow-toast" :style="copyToastPosition">
              <div class="alert alert-success shadow-lg p-2 text-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>{{ i18n.t('textCopied') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useOcrStore } from '@/stores/ocrStore'
import { useI18nStore } from '@/stores/i18nStore'
import FloatingButton from '@/components/UI/FloatingButton.vue'
import FloatingButtonIcons from '@/components/UI/FloatingButtonIcons.vue'
import GridAlignmentTool from './GridAlignmentTool.vue'
// 导入拆分的样式文件
import './styles/index.css'
// 导入 composables
import {
  useCoordinateSystem,
  useBlockBoundaries,
  useViewportManagement,
  usePolygonInteraction,
  useFullscreenMode,
  useCoordinateView,
  useGridAlignment,
  useNotifications,
} from './composables/index.js'

const store = useOcrStore()
const i18n = useI18nStore()
const coordSystemRef = ref(null)
const coordSystemWrapper = ref(null)
const coordViewContainer = ref(null)

// 使用 composables
const { showNotification } = useNotifications(store)

// 全屏模式管理
const {
  isFullscreen,
  toggleFullscreen,
  forceExitFullscreen,
  addFullscreenListeners,
  removeFullscreenListeners,
} = useFullscreenMode(coordViewContainer)

// 坐标视图控制
const {
  showCoordinateView,
  showBounds,
  selectedBlockLevel,
  showCopySuccess,
  toggleCoordinateView,
  closeCoordinateView,
  toggleBlockVisibility,
} = useCoordinateView(forceExitFullscreen)

// 坐标系统管理
const {
  zoomLevel,
  systemWidth,
  systemHeight,
  xAxisLabels,
  yAxisLabels,
  zoomIn: baseZoomIn,
  zoomOut: baseZoomOut,
} = useCoordinateSystem(store)

// 包装缩放方法以添加缓存失效和视口更新
const zoomIn = () => {
  baseZoomIn()
  invalidateCache()
  updateViewportRect()
  setTimeout(() => {
    updateViewportRect()
  }, 100)
}

const zoomOut = () => {
  baseZoomOut()
  invalidateCache()
  updateViewportRect()
  setTimeout(() => {
    updateViewportRect()
  }, 100)
}

const handleTransformEnd = () => {
  updateViewportRect()
  invalidateCache()
  nextTick(() => {
    updateViewportRect()
  })
}

// 视口管理
const {
  viewportRect,
  viewportPadding,
  updateViewportRect,
  addScrollListener,
  removeScrollListener,
  addResizeListener,
  removeResizeListener,
} = useViewportManagement(coordSystemWrapper, zoomLevel)

// 多边形交互
const {
  activePolygonIndex,
  copyToastPosition,
  showPolygonHover,
  hidePolygonHover,
  copyBlockText: baseCopyBlockText,
  addMouseListeners,
  removeMouseListeners,
  addTooltipListener,
  removeTooltipListener,
} = usePolygonInteraction()

// 包装复制方法以传递通知函数
const copyBlockText = (text, event) => {
  baseCopyBlockText(text, event, showNotification)
}

// 网格对齐管理
const {
  gridAlignmentToolRef,
  alignedSymbols,
  handleGridAlignChange,
  initializeAlignedSymbols,
  setupWatchers,
  validateGridAlignmentTool,
} = useGridAlignment(store, updateViewportRect)

// 边界数据处理
const { blockBoundaries, visibleBlockBoundaries, invalidateCache } = useBlockBoundaries(
  store,
  selectedBlockLevel,
  zoomLevel,
  viewportRect,
  viewportPadding,
  showBounds,
)

// --- Methods ---
// 旧的重复方法已移动到 composables 中

// 重复的方法已移动到 composables 中

// 重复的方法已移动到 composables 中，使用 composables 提供的方法

// --- Lifecycle Hooks ---
onMounted(() => {
  // 初始化视口信息
  nextTick(() => {
    updateViewportRect()
  })

  // 添加事件监听器
  const scrollHandler = addScrollListener(invalidateCache)
  addResizeListener()
  addFullscreenListeners()
  const mouseHandlers = addMouseListeners()
  addTooltipListener()

  // 验证网格对齐工具
  validateGridAlignmentTool()

  // 初始化对齐符号数据
  initializeAlignedSymbols()

  // 设置监听器
  const stopWatcher = setupWatchers()

  // 保存清理函数
  window._coordinateViewCleanup = {
    scrollHandler,
    mouseHandlers,
    stopWatcher,
  }
})

onUnmounted(() => {
  // 移除事件监听器
  const cleanup = window._coordinateViewCleanup
  if (cleanup) {
    removeScrollListener(cleanup.scrollHandler)
    removeMouseListeners(cleanup.mouseHandlers)
    if (cleanup.stopWatcher) cleanup.stopWatcher()
  }

  removeResizeListener()
  removeFullscreenListeners()
  removeTooltipListener()

  // 清理全局变量
  delete window._coordinateViewCleanup
})

// 监听过滤器变化，更新可视区域
watch(
  () => store.filteredSymbolsData,
  () => {
    invalidateCache() // 强制重新计算缓存
    nextTick(updateViewportRect)
  },
  { deep: true },
)

// 监听区块级别变化，更新缓存
watch(
  () => selectedBlockLevel.value,
  () => {
    // 清除缓存，强制重新计算
    invalidateCache()
  },
)

// 监听缩放级别变化，更新视口和缓存
watch(
  () => zoomLevel.value,
  () => {
    // 清除缓存，强制重新计算
    invalidateCache()
    nextTick(updateViewportRect)
  },
  { flush: 'post' },
)

// 重复的方法已移动到 composables 中
</script>

<style scoped>
/* 确保坐标视图在全屏模式下填满整个屏幕 */
:deep(.fullscreen) {
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  margin: 0 !important;
  border-radius: 0 !important;
}

:deep(.fullscreen) .card-body {
  height: calc(100vh - 60px); /* 减去标题栏高度 */
}

:deep(.fullscreen) .coordinate-system-wrapper {
  height: calc(100vh - 80px); /* 适应全屏模式 */
}

/* 这些样式已经移动到外部CSS文件中，通过import引入 */

/* 组件内部特定的动画定义 - 需要保留在scoped中 */
@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translate(-50%, -40%);
  }
  15% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  85% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -60%);
  }
}
</style>
