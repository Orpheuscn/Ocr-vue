<template>
  <div class="min-h-screen bg-base-200 flex flex-col">
    <TheHeader />

    <!-- 主要内容区域 -->
    <main class="container mx-auto p-2 sm:p-4 flex-1 flex flex-col">
      <div class="flex-1 flex flex-col space-y-4">
        <!-- 文件上传区 -->
        <FileUpload @files-selected="handleFilesSelected" />

        <!-- 操作控制区，当有文件上传后显示 -->
        <transition name="slide-up" mode="out-in">
          <ActionControls
            v-if="store.currentFiles.length > 0"
            :can-start="store.canStartOcr"
            :is-processing="store.isLoading"
            :initial-direction="store.initialTextDirection"
            :initial-mode="store.recognitionMode || 'text'"
            :has-ocr-result="store.hasOcrResult"
            @start-ocr="handleStartOcr"
          />
        </transition>

        <!-- 结果展示区 -->
        <transition name="slide-up" mode="out-in">
          <div
            v-if="store.currentFiles.length > 0 || store.hasOcrResult"
            class="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1"
          >
            <!-- 图像显示区域 -->
            <div class="flex flex-col h-full relative" ref="imageCanvasRef">
              <transition name="slide-up" mode="out-in">
                <PdfControls
                  v-if="store.isPdfFile"
                  :current-page="store.currentPage"
                  :total-pages="store.totalPages"
                  :is-loading="store.isLoading"
                  @page-change="store.changePdfPage"
                  @height-change="handlePdfControlsHeightChange"
                />
              </transition>
              <ImageCanvas
                :src="store.processedPreviewUrl || store.filePreviewUrl"
                :is-pdf="store.isPdfFile"
                @dimensions-known="handleDimensionsKnown"
                @container-height-update="updateImageContainerHeight"
              />
            </div>

            <!-- 文本输出区 -->
            <div class="flex flex-col h-full">
              <TextOutputManager
                v-if="store.hasOcrResult || store.currentFiles.length > 0"
                :container-height="imageContainerHeight"
              />
            </div>
          </div>
        </transition>
      </div>
    </main>

    <!-- 遮挡工具组件 -->
    <MaskingTool />

    <!-- 坐标查看和过滤控制浮动按钮 -->
    <CoordinateView v-if="store.hasOcrResult" />
    <FilterControls
      v-if="store.hasOcrResult"
      :bounds="store.filterBounds"
      :initial-filters="store.filterSettings"
      @filters-changed="handleFiltersChanged"
    />

    <!-- 加载中遮罩 -->
    <LoadingOverlay :is-loading="store.isLoading" :message="store.loadingMessage" />

    <!-- 通知栏 -->
    <NotificationBar
      :key="store.notification.key"
      :message="store.notification.message"
      :type="store.notification.type"
      :visible="store.notification.visible"
    />

    <!-- 教程组件 -->
    <Tutorial ref="tutorialRef" />

    <!-- 页脚 -->
    <TheFooter @open-tutorial="openTutorial" />
  </div>
</template>

<script setup>
import { useOcrStore } from '@/stores/ocrStore'
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'

// 导入组件
import TheHeader from './components/common/TheHeader.vue'
import FileUpload from './components/ImageTools/FileUpload.vue'
import ActionControls from './components/ImageTools/ActionControls.vue'
import ImageCanvas from './components/ImageTools/ImageCanvas.vue'
import PdfControls from './components/ImageTools/PdfControls.vue'
import TextOutputManager from './components/TextLayout/TextOutputManager.vue'
import CoordinateView from './components/CoordinateTools/CoordinateView.vue'
import FilterControls from './components/FilterTools/FilterControls.vue'
import LoadingOverlay from './components/common/LoadingOverlay.vue'
import NotificationBar from './components/common/NotificationBar.vue'
import MaskingTool from './components/ImageTools/MaskingTool.vue'
import TheFooter from './components/common/TheFooter.vue'
import Tutorial from './components/common/Tutorial.vue'

const store = useOcrStore()
const i18n = useI18nStore()
const imageCanvasRef = ref(null)
const imageContainerHeight = ref(0)
let resizeObserver = null
const tutorialRef = ref(null)
const apiCheckStatus = ref('pending') // 'pending', 'success', 'error'

// 调试模式开关，设置为true时才会输出调试日志
const DEBUG_MODE = false

// 自定义日志函数，只在调试模式下输出
const debugLog = (message, ...args) => {
  if (DEBUG_MODE) {
    console.log(message, ...args)
  }
}

// 更新ImageCanvas容器的高度
const updateImageContainerHeight = (height) => {
  if (height > 0) {
    debugLog(`接收到图像容器高度更新: ${height}px`)

    // 计算总高度（如果有PDF控件，则加上控件高度）
    let totalHeight = height
    if (store.isPdfFile && imageCanvasRef.value) {
      const pdfControls = imageCanvasRef.value.querySelector('.card-title')
      if (pdfControls) {
        const pdfControlsHeight = pdfControls.offsetHeight
        totalHeight += pdfControlsHeight
        debugLog(`PDF控件高度: ${pdfControlsHeight}px, 总高度: ${totalHeight}px`)
      }
    }

    // 更新存储的高度值，并立即同步到文本区
    if (totalHeight !== imageContainerHeight.value) {
      imageContainerHeight.value = totalHeight

      // 延迟同步两个组件的高度，确保DOM更新完成
      nextTick(() => {
        syncComponentHeights()
      })
    }
  }
}

// 创建ResizeObserver来监听ImageCanvas容器的大小变化
function setupResizeObserver() {
  // 确保浏览器支持ResizeObserver
  if (!window.ResizeObserver) return

  // 首先清理现有的ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect()
  }

  // 如果是PDF，监听整个image-display-wrapper，否则监听image-canvas-container
  let targetElement

  if (store.isPdfFile && imageCanvasRef.value) {
    // 对于PDF，监听整个wrapper
    targetElement = imageCanvasRef.value
  } else {
    // 对于普通图像，监听canvas容器
    targetElement = document.querySelector('.card-body')
  }

  if (!targetElement) return

  // 创建ResizeObserver
  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (entry && entry.contentRect) {
      if (store.isPdfFile) {
        // 对于PDF，直接获取整个wrapper的高度
        updateImageContainerHeight(entry.contentRect.height)
      } else {
        // 对于普通图像，重新计算高度
        adjustImageHeight()
      }
    }
  })

  // 开始观察
  resizeObserver.observe(targetElement)
}

// 辅助函数: 调整图像高度
function adjustImageHeight() {
  if (store.imageDimensions.width && store.imageDimensions.height) {
    const imageCanvasElement = document.querySelector('.card')
    if (imageCanvasElement) {
      // 使用容器宽度和图像比例计算合适的高度
      const containerWidth = imageCanvasElement.clientWidth - 32 // 减去左右padding
      const aspectRatio = store.imageDimensions.height / store.imageDimensions.width
      const calculatedContentHeight = containerWidth * aspectRatio

      // 确保高度适中，并考虑padding
      const paddingOffset = 32 // 上下各16px的padding
      const finalContentHeight = Math.max(
        300,
        Math.min(window.innerHeight * 0.8, calculatedContentHeight),
      )
      const finalHeight = finalContentHeight + paddingOffset

      // 更新高度
      updateImageContainerHeight(finalHeight)
    }
  }
}

// 强制同步两个组件的高度，更适应新布局
function syncComponentHeights() {
  nextTick(() => {
    // 获取两个容器元素
    const imageContainer = document.querySelector('.grid > div:first-child')
    const textContainer = document.querySelector('.grid > div:last-child')

    if (!imageContainer || !textContainer) {
      debugLog('无法找到容器进行高度同步:', { imageContainer, textContainer })
      return
    }

    // 获取图片卡片元素
    const imageCard = imageContainer.querySelector('.card')
    if (!imageCard) {
      debugLog('找不到图片卡片元素')
      return
    }

    // 获取文本卡片元素
    const textCard = textContainer.querySelector('.card')
    if (!textCard) {
      debugLog('找不到文本卡片元素')
      return
    }

    // 获取当前高度
    const imageHeight = imageCard.offsetHeight
    const textHeight = textCard.offsetHeight
    debugLog(`当前高度 - 图像: ${imageHeight}px, 文本: ${textHeight}px`)

    // 计算合适的高度：使用较大值，但至少是视窗高度的80%
    const viewportHeight = window.innerHeight
    const minDesiredHeight = Math.floor(viewportHeight * 0.8)
    const targetHeight = Math.max(imageHeight, textHeight, minDesiredHeight)

    debugLog(
      `目标高度: ${targetHeight}px (视窗高度: ${viewportHeight}px, 最小期望: ${minDesiredHeight}px)`,
    )

    // 容器高度保持不变
    textContainer.style.height = `${targetHeight}px`
    imageContainer.style.height = `${targetHeight}px`

    // 为卡片高度留出padding空间
    const paddingOffset = 32 // 上下各16px的padding
    const cardHeight = targetHeight

    // 设置卡片高度
    textCard.style.height = `${cardHeight}px`
    imageCard.style.height = `${cardHeight}px`

    // 设置卡片内部内容区域的高度
    const imageCardBody = imageCard.querySelector('.card-body')
    const textCardBody = textCard.querySelector('.card-body')

    if (imageCardBody) {
      imageCardBody.style.height = `${cardHeight - paddingOffset}px`
    }

    if (textCardBody) {
      textCardBody.style.height = `${cardHeight - paddingOffset}px`
    }

    // 更新存储的高度
    imageContainerHeight.value = targetHeight

    // 通知其他组件高度已更新
    if (store.hasOcrResult) {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, 100)
    }
  })
}

onMounted(() => {
  // 初始化语言设置
  store.initSelectedLanguages()

  // 添加一个立即执行的API检查
  ;(async function checkApiImmediately() {
    try {
      console.log('立即检查API状态...')
      apiCheckStatus.value = 'pending'

      // 使用相对路径而不是硬编码URL
      const baseUrl = window.location.origin || ''
      const response = await fetch(`${baseUrl}/api/ocr/apiStatus`)

      if (!response.ok) {
        throw new Error(`API状态检查请求失败: ${response.status}`)
      }

      const data = await response.json()
      console.log('手动API检查结果:', data)

      if (data && data.success) {
        apiCheckStatus.value = 'success'
        store.serverApiAvailable = data.data.apiAvailable
        console.log('手动设置API状态为:', store.serverApiAvailable ? '可用' : '不可用')
      } else {
        apiCheckStatus.value = 'error'
        console.error('API状态检查返回失败结果:', data)
      }
    } catch (error) {
      apiCheckStatus.value = 'error'
      console.error('无法手动检查API状态:', error)
      // 显示通知提醒用户API连接问题
      store._showNotification('API连接失败，可能影响OCR功能', 'warning')
    }
  })()

  // 初始化API状态
  store
    .initApiStatus()
    .then(() => {
      console.log('API状态初始化完成')
    })
    .catch((error) => {
      console.error('API状态初始化失败:', error)
    })

  // 在组件挂载后设置ResizeObserver
  setTimeout(setupResizeObserver, 500) // 给一些时间让DOM渲染完成
  // 初始加载后
  setTimeout(syncComponentHeights, 500)
})

onUnmounted(() => {
  // 清理ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  window.removeEventListener('resize', () => {
    clearTimeout(resizeTimer)
  })
})

const handleFilesSelected = (files) => {
  store.loadFiles(files)
}

const handleFiltersChanged = (newFilters) => {
  store.applyFilters(newFilters)
}

// Handle dimensions from ImageCanvas once image/pdf is loaded
const handleDimensionsKnown = ({ width, height }) => {
  debugLog(`图像尺寸信息: 宽=${width}, 高=${height}`)
  store.setImageDimension('width', width)
  store.setImageDimension('height', height)

  // 图像加载完成后更新组件高度
  nextTick(() => {
    if (imageCanvasRef.value) {
      const imageContainer = imageCanvasRef.value.querySelector('.card-body')
      if (imageContainer) {
        // 使用容器宽度和图像比例计算高度
        const containerWidth = imageContainer.clientWidth
        const aspectRatio = height / width
        const calculatedContentHeight = containerWidth * aspectRatio

        // 添加上下padding空间
        const paddingOffset = 32 // 上下各16px
        const finalHeight = calculatedContentHeight + paddingOffset

        // 更新高度，使用合理的限制
        updateImageContainerHeight(finalHeight)

        // 强制同步文本区域的高度
        syncComponentHeights()
      }
    }
  })
}

// 特别添加对PDF页面变化的处理
watch(
  () => store.currentPage,
  (newPage, oldPage) => {
    if (newPage !== oldPage && store.isPdfFile) {
      debugLog(`PDF页面变化: ${oldPage} -> ${newPage}`)

      // PDF页面变化后，给足够时间让新页面渲染并重新计算高度
      setTimeout(() => {
        debugLog('PDF页面变化后重新计算高度')

        // 手动触发一次高度更新
        if (store.imageDimensions.width && store.imageDimensions.height) {
          const width = store.imageDimensions.width
          const height = store.imageDimensions.height
          debugLog(`使用PDF尺寸: ${width}x${height}`)

          // 重新触发图片容器高度调整，会连带更新文本区高度
          if (imageCanvasRef.value) {
            // 模拟一个resize事件触发容器重新计算高度
            window.dispatchEvent(new Event('resize'))

            // 额外延迟同步高度确保两边一致
            setTimeout(() => {
              syncComponentHeights()
            }, 300)
          }
        }
      }, 300)
    }
  },
  { immediate: false },
)

// 文件预览URL变化时
watch(
  () => store.filePreviewUrl,
  () => {
    setTimeout(syncComponentHeights, 500)
  },
)

// OCR结果变化时
watch(
  () => store.hasOcrResult,
  () => {
    setTimeout(syncComponentHeights, 500)
  },
)

// 窗口大小变化时
let resizeTimer
onMounted(() => {
  window.addEventListener('resize', () => {
    // 使用防抖避免频繁触发
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      syncComponentHeights()
      // 如果有图片尺寸信息，也重新计算图片容器高度
      if (store.imageDimensions.width && store.imageDimensions.height) {
        const width = store.imageDimensions.width
        const height = store.imageDimensions.height

        if (imageCanvasRef.value) {
          const imageContainer = imageCanvasRef.value.querySelector('.card-body')
          if (imageContainer) {
            // 使用容器宽度和图像比例计算高度
            const containerWidth = imageContainer.clientWidth
            const aspectRatio = height / width
            const calculatedContentHeight = containerWidth * aspectRatio

            // 添加padding空间
            const paddingOffset = 32 // 上下各16px
            const finalHeight = calculatedContentHeight + paddingOffset

            updateImageContainerHeight(finalHeight)
          }
        }
      }
    }, 200)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', () => {
    clearTimeout(resizeTimer)
  })
})

// 处理PDF控件高度变化
const handlePdfControlsHeightChange = (height) => {
  debugLog(`PDF控件高度变化: ${height}px`)
  // 如果高度发生变化，重新同步组件高度
  nextTick(() => {
    syncComponentHeights()
  })
}

// 打开教程弹窗
const openTutorial = () => {
  if (tutorialRef.value) {
    tutorialRef.value.openModal()
  }
}

// 新增处理函数
const handleStartOcr = (params) => {
  console.log('MainOcrApp收到start-ocr事件:', params)

  // 确保参数格式正确
  const validParams = params && (typeof params === 'string' || typeof params === 'object')
  if (!validParams) {
    console.error('OCR参数格式错误:', params)
    store._showNotification('OCR参数格式错误', 'error')
    return
  }

  try {
    // 直接调用store方法并传递参数
    store.startOcrProcess(params)
  } catch (error) {
    console.error('OCR处理错误:', error)
    store._showNotification(`OCR处理失败: ${error.message}`, 'error')
  }
}

// 监听语言变化
watch(
  () => i18n.currentLang.value,
  (newLang) => {
    // 当语言变化时，通知应用其他部分可能需要更新
    debugLog(`语言已切换为: ${newLang}`)
    // 不需要强制重新渲染，因为响应式机制会自动处理
  },
)
</script>
