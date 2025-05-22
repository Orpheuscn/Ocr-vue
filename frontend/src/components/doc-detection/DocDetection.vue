<template>
  <div class="min-h-screen bg-base-200 flex flex-col">
    <!-- 内容容器 -->
    <div class="container mx-auto px-4 py-6 w-full max-w-full">
      <!-- 标题部分和主题切换 -->
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-accent-focus dark:text-white">文档解析</h1>
        <div class="tooltip" data-tip="切换主题">
          <button class="btn btn-circle btn-ghost" @click="toggleTheme">
            <svg
              v-if="isDarkTheme"
              class="w-6 h-6 fill-current"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path
                d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"
              />
            </svg>
            <svg
              v-else
              class="w-6 h-6 fill-current"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path
                d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-4">
        <!-- 左侧：图片上传和预览区域 -->
        <div class="lg:w-2/3 order-2 lg:order-1">
          <!-- 功能按钮区域 -->
          <div class="card bg-base-100 shadow-xl mb-4">
            <div class="card-body p-4">
              <!-- 修改按钮样式，确保它不是占满整个宽度 -->
              <div class="flex space-x-2">
                <button
                  v-if="hasImage"
                  class="btn btn-accent btn-sm px-4 inline-flex items-center"
                  @click="refreshPage"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>换一张</span>
                </button>

                <!-- 绘制模式切换按钮 -->
                <button
                  v-if="hasImage"
                  class="btn btn-sm"
                  :class="{ 'btn-primary': isDrawingMode, 'btn-outline': !isDrawingMode }"
                  @click="toggleDrawingMode"
                >
                  <span v-if="isDrawingMode">绘制模式: 开启</span>
                  <span v-else>绘制模式: 关闭</span>
                </button>
                <!-- 清空矩形按钮 -->
                <button
                  v-if="hasImage"
                  class="btn btn-error btn-sm px-4 inline-flex items-center"
                  @click="clearAllRectangles"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span>清空矩形</span>
                </button>
                <input
                  type="file"
                  ref="fileInput"
                  accept="image/*"
                  class="hidden"
                  @change="handleImageUpload"
                />
              </div>
            </div>
          </div>

          <!-- Canvas容器 -->
          <div class="card bg-base-100 shadow-xl overflow-hidden h-[70vh] lg:h-[80vh]">
            <div class="card-body p-4">
              <div
                ref="canvasContainer"
                class="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-base-300 rounded-box relative"
                @dragover.prevent="onDragOverHandler"
                @dragleave.prevent="onDragLeaveHandler"
                @drop.prevent="onDropHandler"
                @paste="onPasteHandler"
                @click="onCanvasClick"
                tabindex="0"
                :class="{
                  'cursor-pointer hover:bg-base-300 transition-colors': !hasImage,
                  'cursor-default': hasImage,
                }"
              >
                <!-- 使用矩形绘制工具子组件 -->
                <RectangleDrawingTool
                  ref="rectangleDrawingTool"
                  :hasImage="hasImage"
                  :originalImageWidth="originalImageWidth"
                  :originalImageHeight="originalImageHeight"
                  :containerWidth="canvasContainer?.clientWidth || 0"
                  :containerHeight="canvasContainer?.clientHeight || 0"
                  :currentImageId="currentImageId"
                  @rectangle-added="handleRectangleAdded"
                  @rectangle-deleted="handleRectangleDeleted"
                  @rectangle-highlighted="handleRectangleHighlighted"
                  @rectangle-unhighlighted="handleRectangleUnhighlighted"
                />
                <div v-if="!hasImage" class="text-center">
                  <!-- 显示加载状态或上传提示 -->
                  <div v-if="isLoading" class="flex flex-col items-center justify-center">
                    <span class="loading loading-bars loading-xl text-accent mb-4"></span>
                    <p class="text-base-content/60 italic">
                      {{ statusText }}
                    </p>
                  </div>
                  <div v-else>
                    <div class="text-5xl text-base-content/30 mb-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-24 w-24 mx-auto"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <p class="text-base-content/60 italic mb-2">
                      {{ statusText }}
                    </p>
                    <p class="text-base-content/60 text-sm">
                      点击此区域选择图片，或拖放图片到此处，也可以直接粘贴图片
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：坐标信息 -->
        <div class="lg:w-1/3 order-1 lg:order-2 mb-4 lg:mb-0">
          <div class="card bg-base-100 shadow-xl h-full">
            <div class="card-body">
              <div class="flex justify-between items-center mb-4">
                <h2 class="card-title text-accent">矩形坐标信息</h2>

                <!-- 添加筛选和排序按钮 -->
                <div class="flex gap-2">
                  <!-- 筛选按钮 -->
                  <div class="dropdown dropdown-end">
                    <label tabindex="0" class="btn btn-sm btn-outline">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      筛选
                    </label>
                    <ul
                      id="filterDropdown"
                      tabindex="0"
                      class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
                    >
                      <li><a @click="handleFilterAll">全部</a></li>
                      <li v-for="className in getUniqueClassNames()" :key="className">
                        <a @click="() => handleFilterClass(className)">{{ className }}</a>
                      </li>
                    </ul>
                  </div>

                  <!-- 排序按钮 -->
                  <div class="dropdown dropdown-end">
                    <label tabindex="0" class="btn btn-sm btn-outline">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z"
                        />
                      </svg>
                      排序
                    </label>
                    <ul
                      id="sortDropdown"
                      tabindex="0"
                      class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
                    >
                      <li><a @click="handleSortByClass">按类别</a></li>
                      <li><a @click="handleSortByPosition">按坐标</a></li>
                    </ul>
                  </div>
                </div>
              </div>

              <div id="display-coordinates" class="hidden"></div>
              <div
                ref="originalCoordinates"
                class="space-y-4 overflow-auto max-h-[40vh] lg:max-h-[65vh]"
              >
                <div class="text-base-content">
                  原图尺寸: {{ originalImageWidth }} × {{ originalImageHeight }}
                </div>
                <!-- 每个矩形的信息卡片 -->
                <div
                  v-for="(rect, index) in filteredRectangles"
                  :key="rect.id"
                  class="card bg-base-200 shadow-sm"
                  :class="{ 'border-2 border-accent': rect.isHighlighted }"
                  @mouseenter="highlightRect(rect)"
                  @mouseleave="unhighlightRect(rect)"
                >
                  <!-- 卡片内容 -->
                  <div class="card-body p-4">
                    <!-- 矩形标题和删除按钮 -->
                    <div class="card-title text-sm justify-between items-center mb-2">
                      <!-- 标题与颜色指示器 -->
                      <div class="flex items-center">
                        <div
                          class="w-4 h-3 mr-2 rounded"
                          :style="{ backgroundColor: getRectColor(rect) }"
                        ></div>
                        <span>矩形 #{{ index + 1 }}</span>
                      </div>

                      <!-- 按钮组 -->
                      <div class="flex space-x-1">
                        <!-- 文本按钮 -->
                        <button
                          class="btn btn-xs btn-outline"
                          :class="{ 'btn-primary': rect.showText }"
                          @click="toggleTextView(rect)"
                        >
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
                              d="M4 6h16M4 12h16m-7 6h7"
                            />
                          </svg>
                        </button>

                        <!-- JSON按钮 -->
                        <button
                          class="btn btn-xs btn-outline"
                          :class="{ 'btn-primary': rect.showJson || !rect.showText }"
                          @click="toggleJsonView(rect)"
                        >
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
                              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                            />
                          </svg>
                        </button>

                        <!-- 删除按钮 -->
                        <button
                          class="btn btn-xs btn-error btn-outline"
                          @click="deleteRectangle(rect)"
                        >
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <!-- 坐标信息已移除，默认显示JSON信息 -->

                    <!-- JSON格式显示 -->
                    <pre
                      v-if="rect.showJson || !rect.showText"
                      class="text-xs bg-base-300 p-3 rounded overflow-auto"
                      >{{ formatRectToJSON(rect) }}</pre
                    >

                    <!-- OCR文本显示区域 -->
                    <div v-if="rect.showText" class="text-sm bg-base-300 p-3 rounded">
                      <div v-if="rect.ocrText">
                        <p v-if="rect.class === 'figure'" class="text-base-content/70">
                          【这是一张图片】
                        </p>
                        <p v-else class="text-base-content whitespace-pre-wrap">
                          {{ rect.ocrText }}
                        </p>
                      </div>
                      <p v-else-if="rect.ocrProcessing" class="text-base-content/70">
                        <span class="loading loading-dots loading-xs mr-2"></span>
                        正在识别文本...
                      </p>
                      <p v-else class="text-base-content/70">等待OCR识别...</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex space-x-2">
                <button
                  v-if="rectangles.length > 0"
                  class="btn btn-accent mt-4 flex-1"
                  @click="submitCrop"
                  :disabled="submitting"
                >
                  <span v-if="submitting" class="loading loading-spinner"></span>
                  <template v-else>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5 mr-2"
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
                  </template>
                  {{ submitting ? '处理中...' : '提交切割' }}
                </button>

                <!-- 文本提取按钮 -->
                <button
                  v-if="rectangles.length > 0"
                  class="btn btn-accent mt-4 flex-1"
                  @click="extractText"
                  :disabled="submitting || extractingText"
                >
                  <span v-if="extractingText" class="loading loading-spinner"></span>
                  <template v-else>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </template>
                  {{ extractingText ? '提取中...' : '文本提取' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 结果对话框 -->
    <div
      v-if="showResultDialog"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
    >
      <div
        class="bg-base-100 p-6 rounded-box shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto relative"
      >
        <!-- 关闭按钮 -->
        <button
          class="btn btn-sm btn-circle absolute right-2 top-2"
          @click="showResultDialog = false"
        >
          ✕
        </button>

        <!-- 对话框标题 -->
        <h2 class="text-2xl font-bold mb-4 text-accent">切割完成</h2>

        <!-- 对话框内容 -->
        <div class="space-y-4">
          <p class="text-lg">{{ resultMessage }}</p>

          <!-- 带标注的图像 -->
          <div v-if="annotatedImageUrl || detectImageUrl" class="mt-4">
            <h3 class="text-lg font-semibold mb-2">带标注的图像:</h3>
            <img
              :src="annotatedImageUrl || detectImageUrl"
              class="w-full h-auto rounded-lg border border-base-300"
              style="max-height: 400px; object-fit: contain"
            />
          </div>

          <!-- 下载链接 -->
          <div v-if="zipUrl" class="mt-4 flex justify-center">
            <button @click="downloadZipFile" class="btn btn-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              下载切割结果
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import RectangleDrawingTool from './RectangleDrawingTool.vue'

// 响应式状态
const fileInput = ref(null)
const canvasContainer = ref(null)
const rectangleDrawingTool = ref(null)
const originalCoordinates = ref(null)
const hasImage = ref(false)
const isLoading = ref(false) // 是否正在加载图片
const statusText = ref('请上传或拖入图片，也可以直接粘贴')
const isDarkTheme = ref(false)
const originalImageWidth = ref(0)
const originalImageHeight = ref(0)
const rectangles = ref([])
const currentImageId = ref(null)
const submitting = ref(false)
const extractingText = ref(false) // 是否正在提取文本
const isDrawingMode = ref(false) // 是否处于绘制模式

// 筛选和排序相关状态
const currentFilter = ref('all')
const currentSort = ref('position')
const filteredRectangles = ref([])

// 结果相关状态

// 结果对话框状态
const showResultDialog = ref(false)
const resultMessage = ref('')
const annotatedImageUrl = ref('')
const detectImageUrl = ref('')
const zipUrl = ref('')

// 完全重写主题切换功能
const toggleTheme = () => {
  isDarkTheme.value = !isDarkTheme.value
  const theme = isDarkTheme.value ? 'dark' : 'light'

  // 确保主题应用到正确的元素：html元素
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)

  // 强制整个文档重新应用样式
  document.body.classList.remove('theme-transition')

  // 使用setTimeout确保浏览器有时间处理DOM变化
  setTimeout(() => {
    document.body.classList.add('theme-transition')
  }, 10)
}

// 切换绘制模式
const toggleDrawingMode = () => {
  isDrawingMode.value = !isDrawingMode.value
  console.log('绘制模式:', isDrawingMode.value ? '开启' : '关闭')

  // 调用子组件的方法切换绘制模式
  if (rectangleDrawingTool.value) {
    rectangleDrawingTool.value.toggleDrawingMode()
  }
}

// 处理子组件事件
const handleRectangleAdded = (rect) => {
  rectangles.value.push(rect)
  updateFilteredRectangles()
}

const handleRectangleDeleted = (rect) => {
  const index = rectangles.value.findIndex((r) => r.id === rect.id)
  if (index !== -1) {
    rectangles.value.splice(index, 1)
    updateFilteredRectangles()
  }
}

const handleRectangleHighlighted = (rect) => {
  const index = rectangles.value.findIndex((r) => r.id === rect.id)
  if (index !== -1) {
    rectangles.value[index].isHighlighted = true
  }
}

const handleRectangleUnhighlighted = (rect) => {
  const index = rectangles.value.findIndex((r) => r.id === rect.id)
  if (index !== -1) {
    rectangles.value[index].isHighlighted = false
  }
}

// 组件挂载
onMounted(() => {
  initTheme()

  // 可以在开发环境中测试后端连接
  if (process.env.NODE_ENV === 'development') {
    testBackendConnection()
  }

  // 确保文件输入框始终可用
  nextTick(() => {
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  })

  // 初始化筛选列表
  updateFilteredRectangles()
})

// 刷新页面
const refreshPage = () => {
  window.location.reload()
}

// 获取所有唯一的类别名称
const getUniqueClassNames = () => {
  const classNames = rectangles.value.map((rect) => rect.class || 'unknown').filter(Boolean)

  // 去重
  return [...new Set(classNames)]
}

// 处理筛选"全部"
const handleFilterAll = () => {
  filterRectangles('all')
  document.getElementById('filterDropdown')?.blur()
}

// 处理按类别筛选
const handleFilterClass = (className) => {
  filterRectangles(className)
  document.getElementById('filterDropdown')?.blur()
}

// 处理按类别排序
const handleSortByClass = () => {
  sortRectangles('class')
  document.getElementById('sortDropdown')?.blur()
}

// 处理按坐标排序
const handleSortByPosition = () => {
  sortRectangles('position')
  document.getElementById('sortDropdown')?.blur()
}

// 筛选矩形
const filterRectangles = (className) => {
  currentFilter.value = className
  updateFilteredRectangles()

  // 同时在画布上筛选显示
  updateCanvasRectanglesVisibility()
}

// 排序矩形
const sortRectangles = (sortType) => {
  currentSort.value = sortType
  updateFilteredRectangles()
}

// 更新筛选后的矩形列表
const updateFilteredRectangles = () => {
  // 先筛选
  let filtered = [...rectangles.value]
  if (currentFilter.value !== 'all') {
    filtered = filtered.filter((rect) => (rect.class || 'unknown') === currentFilter.value)
  }

  // 再排序
  if (currentSort.value === 'class') {
    filtered.sort((a, b) => {
      const classA = a.class || 'unknown'
      const classB = b.class || 'unknown'
      return classA.localeCompare(classB)
    })
  } else if (currentSort.value === 'position') {
    filtered.sort((a, b) => {
      // 先按y坐标（从上到下）
      if (a.coords.topLeft.y !== b.coords.topLeft.y) {
        return a.coords.topLeft.y - b.coords.topLeft.y
      }
      // 再按x坐标（从左到右）
      return a.coords.topLeft.x - b.coords.topLeft.x
    })
  }

  filteredRectangles.value = filtered
}

// 更新画布上矩形的可见性
const updateCanvasRectanglesVisibility = () => {
  if (!rectangleDrawingTool.value) return

  // 获取子组件中的所有矩形
  const allRects = rectangleDrawingTool.value.getRectangles()

  allRects.forEach((rect) => {
    if (currentFilter.value === 'all' || (rect.class || 'unknown') === currentFilter.value) {
      // 显示符合筛选条件的矩形
      rect.rect.set('visible', true)
    } else {
      // 完全隐藏不符合筛选条件的矩形
      rect.rect.set('visible', false)
    }
  })

  // 使用子组件的fabricCanvas渲染
  rectangleDrawingTool.value.renderCanvas()
}

// 重写初始化主题
const initTheme = () => {
  // 检查localStorage中是否有保存的主题
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    isDarkTheme.value = savedTheme === 'dark'
  } else {
    // 检查系统偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    isDarkTheme.value = prefersDark
    localStorage.setItem('theme', prefersDark ? 'dark' : 'light')
  }

  // 立即应用主题到HTML元素
  document.documentElement.setAttribute('data-theme', isDarkTheme.value ? 'dark' : 'light')

  // 为了确保主题应用到整个应用，也可以在body上设置类
  if (isDarkTheme.value) {
    document.body.classList.add('dark-theme')
  } else {
    document.body.classList.remove('dark-theme')
  }
}

// 拖放相关事件处理 - 使用封装方法避免模板中的语法错误
const onDragOverHandler = (e) => {
  if (!hasImage.value) {
    onDragOver(e)
  }
}

const onDragLeaveHandler = (e) => {
  if (!hasImage.value) {
    onDragLeave(e)
  }
}

const onDropHandler = (e) => {
  if (!hasImage.value) {
    onDrop(e)
  }
}

const onPasteHandler = (e) => {
  if (!hasImage.value) {
    onPaste(e)
  }
}

const onCanvasClick = () => {
  if (!hasImage.value) {
    triggerFileInput()
  }
}

// 当文件拖动到元素上时
const onDragOver = (e) => {
  e.preventDefault()
  if (!canvasContainer.value) return

  canvasContainer.value.classList.add('border-accent')
  canvasContainer.value.classList.add('border-solid')
  canvasContainer.value.classList.remove('border-dashed')

  // 更新状态文本
  statusText.value = '松开鼠标上传图片'
}

// 当文件拖动离开元素时
const onDragLeave = (e) => {
  e.preventDefault()
  if (!canvasContainer.value) return

  canvasContainer.value.classList.remove('border-accent')
  canvasContainer.value.classList.remove('border-solid')
  canvasContainer.value.classList.add('border-dashed')

  // 恢复状态文本
  statusText.value = '请上传或拖入图片'
}

// 当文件被拖放到元素上时
const onDrop = (e) => {
  e.preventDefault()

  // 重置样式
  if (canvasContainer.value) {
    canvasContainer.value.classList.remove('border-accent')
    canvasContainer.value.classList.remove('border-solid')
    canvasContainer.value.classList.add('border-dashed')
  }

  // 获取文件
  const files = e.dataTransfer.files
  if (files.length === 0) return

  const file = files[0]
  // 检查是否为图片文件
  if (!file.type.startsWith('image/')) {
    statusText.value = '只支持图片文件'
    return
  }

  // 处理图片文件
  processImageFile(file)
}

// 处理粘贴事件
const onPaste = (e) => {
  e.preventDefault()

  // 从剪贴板获取图片
  const items = (e.clipboardData || window.clipboardData).items
  if (!items) return

  // 查找图片数据
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile()
      if (file) {
        // 处理图片文件
        processImageFile(file)
        break
      }
    }
  }
}

// 处理图片上传
const handleImageUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return

  // 创建FormData对象，用于发送到后端
  const formData = new FormData()
  formData.append('file', file)

  // 显示加载提示
  statusText.value = '正在上传并分析图片，请稍候...'
  hasImage.value = false
  isLoading.value = true // 设置加载状态为true

  // 发送到后端进行处理
  fetch('/api/python/upload', {
    method: 'POST',
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('上传失败')
      }
      return response.json()
    })
    .then((data) => {
      console.log('收到后端响应:', data) // 增加日志输出
      if (data.success) {
        // 保存图片信息
        currentImageId.value = data.image_id

        // 加载检测结果图片
        const img = new Image()
        img.onload = () => {
          console.log('图片已加载，开始设置Canvas') // 增加日志输出
          // 保存原图尺寸
          originalImageWidth.value = data.width
          originalImageHeight.value = data.height

          // 使用子组件设置Canvas
          if (rectangleDrawingTool.value) {
            // 设置Canvas尺寸
            rectangleDrawingTool.value.setupCanvas(img)

            // 加载图片到Canvas
            rectangleDrawingTool.value.loadImageToCanvas(img)
          }

          // 更新UI状态
          hasImage.value = true
          isLoading.value = false // 重置加载状态
          if (canvasContainer.value) {
            canvasContainer.value.classList.add('border-accent')
            canvasContainer.value.classList.remove('border-dashed')
            canvasContainer.value.classList.add('border-solid')
          }

          // 重置矩形列表
          rectangles.value = []

          // 添加检测到的矩形
          if (data.rectangles && data.rectangles.length > 0 && rectangleDrawingTool.value) {
            console.log('添加检测到的矩形:', data.rectangles.length, '个') // 增加日志输出
            rectangleDrawingTool.value.addDetectedRectangles(data.rectangles)
          }
        }
        // 使用图片代理服务
        // 这样可以避免URL编码问题，并且支持图片处理功能
        const proxyUrl = `/api/python/images/${data.image_id}`
        img.src = proxyUrl

        console.log('使用图片代理URL:', proxyUrl)
        console.log('原始URL:', data.original_image_url)
        console.log('图片ID:', data.image_id)
        console.log('文件名:', data.filename)
        img.onerror = (err) => {
          console.error('图片加载错误:', err) // 增加错误日志
          statusText.value = '图片加载失败，请重试'
        }
      } else {
        statusText.value = `错误: ${data.error || '上传失败'}`
        hasImage.value = false
        isLoading.value = false // 重置加载状态
      }
    })
    .catch((error) => {
      console.error('上传错误:', error)
      statusText.value = `错误: ${error.message}`
      hasImage.value = false
      isLoading.value = false // 重置加载状态
    })
}

// 统一处理图片文件
const processImageFile = (file) => {
  // 创建FormData对象，用于发送到后端
  const formData = new FormData()
  formData.append('file', file)

  // 显示加载提示
  statusText.value = '正在上传并分析图片，请稍候...'
  hasImage.value = false
  isLoading.value = true // 设置加载状态为true

  // 发送到后端进行处理
  fetch('/api/python/upload', {
    method: 'POST',
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('上传失败')
      }
      return response.json()
    })
    .then((data) => {
      console.log('收到后端响应:', data) // 增加日志输出
      if (data.success) {
        // 保存图片信息
        currentImageId.value = data.image_id

        // 加载检测结果图片
        const img = new Image()
        img.onload = () => {
          console.log('图片已加载，开始设置Canvas') // 增加日志输出
          // 保存原图尺寸
          originalImageWidth.value = data.width
          originalImageHeight.value = data.height

          // 使用子组件设置Canvas
          if (rectangleDrawingTool.value) {
            // 设置Canvas尺寸
            rectangleDrawingTool.value.setupCanvas(img)

            // 加载图片到Canvas
            rectangleDrawingTool.value.loadImageToCanvas(img)
          }

          // 更新UI状态
          hasImage.value = true
          isLoading.value = false // 重置加载状态
          if (canvasContainer.value) {
            canvasContainer.value.classList.add('border-accent')
            canvasContainer.value.classList.remove('border-dashed')
            canvasContainer.value.classList.add('border-solid')
          }

          // 重置矩形列表
          rectangles.value = []

          // 添加检测到的矩形
          if (data.rectangles && data.rectangles.length > 0 && rectangleDrawingTool.value) {
            console.log('添加检测到的矩形:', data.rectangles.length, '个') // 增加日志输出
            rectangleDrawingTool.value.addDetectedRectangles(data.rectangles)
          }
        }
        // 使用图片代理服务
        // 这样可以避免URL编码问题，并且支持图片处理功能
        const proxyUrl = `/api/python/images/${data.image_id}`
        img.src = proxyUrl

        console.log('使用图片代理URL:', proxyUrl)
        console.log('原始URL:', data.original_image_url)
        console.log('图片ID:', data.image_id)
        console.log('文件名:', data.filename)
        img.onerror = (err) => {
          console.error('图片加载错误:', err) // 增加错误日志
          statusText.value = '图片加载失败，请重试'
        }
      } else {
        statusText.value = `错误: ${data.error || '上传失败'}`
        hasImage.value = false
        isLoading.value = false // 重置加载状态
      }
    })
    .catch((error) => {
      console.error('上传错误:', error)
      statusText.value = `错误: ${error.message}`
      hasImage.value = false
      isLoading.value = false // 重置加载状态
    })
}

// 测试后端连接
const testBackendConnection = async () => {
  try {
    const response = await fetch('/api/python/test')
    console.log('测试连接响应状态:', response.status)

    const data = await response.json().catch((e) => {
      console.error('解析测试响应失败:', e)
      return { status: 'error', message: '无法解析响应' }
    })

    console.log('测试连接响应数据:', data)
    if (data.status === 'ok') {
      console.log('后端服务正常运行')
    } else {
      console.error('后端服务异常')
    }
  } catch (error) {
    console.error('测试连接失败:', error)
  }
}

// 切换JSON视图
const toggleJsonView = (rect) => {
  // 如果当前显示的是文本，切换到JSON
  if (rect.showText) {
    rect.showText = false
    rect.showJson = true
  } else {
    // 默认情况下已经显示JSON，不需要做任何改变
    rect.showJson = true
  }
}

// 切换文本视图
const toggleTextView = (rect) => {
  rect.showText = !rect.showText
  // 如果显示文本，则隐藏JSON
  if (rect.showText) {
    rect.showJson = false
  } else {
    // 如果不显示文本，则显示JSON
    rect.showJson = true
  }
}

// 删除矩形
const deleteRectangle = (rect) => {
  // 使用子组件的方法删除矩形
  if (rectangleDrawingTool.value) {
    rectangleDrawingTool.value.deleteRectangle(rect)
  }

  // 从矩形数组中移除
  const index = rectangles.value.findIndex((r) => r.id === rect.id)
  if (index !== -1) {
    rectangles.value.splice(index, 1)
    // 更新筛选列表
    updateFilteredRectangles()
  }
}

// 获取矩形颜色（用于边框）
const getRectColor = (rect) => {
  if (rect.rect && rect.rect.stroke) {
    return rect.rect.stroke
  }
  return '#4CAF50'
}

// 提交切割
const submitCrop = () => {
  if (filteredRectangles.value.length === 0) {
    alert('请先绘制至少一个矩形区域')
    return
  }

  // 防止重复提交
  if (submitting.value) return
  submitting.value = true

  // 准备提交数据 - 只提交已筛选的矩形
  const submitData = {
    image_id: currentImageId.value,
    rectangles: filteredRectangles.value.map((rect) => {
      return {
        id: rect.id,
        class: rect.class || 'unknown',
        confidence: rect.confidence || 1.0,
        coords: rect.coords,
      }
    }),
  }

  // 发送到后端进行切割
  fetch('/api/python/crop', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(submitData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('处理失败')
      }
      return response.json()
    })
    .then((data) => {
      console.log('切割结果:', data) // 增加日志输出
      submitting.value = false
      if (data.success) {
        // 设置结果对话框数据
        resultMessage.value = data.message || '切割成功！'

        // 优先使用annotated图像URL，如果没有则使用detect图像URL
        if (data.annotated_image_url) {
          // 直接构建完整的URL路径
          let annotatedUrl = `/api/python${data.annotated_image_url}`
          console.log('标注图像URL详情:', {
            backendPath: data.annotated_image_url,
            constructedPath: annotatedUrl,
            expectedFormat: '/api/python/temp/image_id_annotated.jpg',
          })
          annotatedImageUrl.value = annotatedUrl

          // 预加载图像以检查是否可以访问
          const img = new Image()
          img.onload = () => console.log('标注图像加载成功:', annotatedUrl)
          img.onerror = (e) => console.error('标注图像加载失败:', annotatedUrl, e)
          img.src = annotatedUrl
        } else if (data.detect_image_url) {
          // 如果没有annotated图像，则使用detect图像
          let detectUrl = `/api/python${data.detect_image_url}`
          console.log('检测图像URL详情:', {
            backendPath: data.detect_image_url,
            constructedPath: detectUrl,
            expectedFormat: '/api/python/temp/image_id_detect.jpg',
          })
          detectImageUrl.value = detectUrl

          // 预加载图像以检查是否可以访问
          const img = new Image()
          img.onload = () => console.log('检测图像加载成功:', detectUrl)
          img.onerror = (e) => console.error('检测图像加载失败:', detectUrl, e)
          img.src = detectUrl
        } else {
          annotatedImageUrl.value = ''
          detectImageUrl.value = ''
          console.warn('后端未返回图像URL')
        }

        // 如果有ZIP文件URL，确保路径正确
        if (data.zip_url) {
          // 直接构建完整的URL路径，确保路径格式正确
          // 后端返回的路径格式是 /results/filename.zip
          let zipUrlPath = `/api/python${data.zip_url}`

          // 打印详细信息用于调试
          console.log('ZIP文件URL信息:', {
            backendPath: data.zip_url,
            constructedPath: zipUrlPath,
            expectedFormat: '/api/python/downloads/filename.zip',
          })

          zipUrl.value = zipUrlPath
        } else {
          zipUrl.value = ''
          console.warn('后端未返回ZIP文件URL')
        }

        // 显示结果对话框
        showResultDialog.value = true
      } else {
        alert(`错误: ${data.error || '处理失败'}`)
      }
    })
    .catch((error) => {
      submitting.value = false
      console.error('提交错误:', error)
      alert(`错误: ${error.message}`)
    })
}

// 下载ZIP文件
const downloadZipFile = () => {
  if (!zipUrl.value) return

  // 显示下载中状态
  const originalZipUrl = zipUrl.value
  console.log('开始下载ZIP文件，URL:', originalZipUrl)
  zipUrl.value = null
  resultMessage.value = '正在准备下载，请稍候...'

  // 获取文件
  fetch(originalZipUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/zip, application/octet-stream',
    },
    credentials: 'same-origin',
  })
    .then((response) => {
      console.log('ZIP文件下载响应:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()]),
        url: response.url,
      })

      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`)
      }
      return response.blob()
    })
    .then((blob) => {
      console.log('成功获取ZIP文件Blob:', {
        size: blob.size,
        type: blob.type,
      })

      // 创建临时下载链接
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url

      // 从URL中提取文件名
      const fileName = originalZipUrl.split('/').pop() || 'crop_result.zip'
      a.download = fileName
      console.log('设置下载文件名:', fileName)

      // 添加到文档并触发点击
      document.body.appendChild(a)
      a.click()

      // 清理
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // 恢复状态
      zipUrl.value = originalZipUrl
      resultMessage.value = '切割成功！'
    })
    .catch((error) => {
      console.error('下载错误:', error)
      // 恢复状态
      zipUrl.value = originalZipUrl
      resultMessage.value = `下载出错: ${error.message}`
    })
}

// 格式化矩形数据为JSON字符串
const formatRectToJSON = (rect) => {
  // 按照后端格式构建JSON对象
  const jsonObj = {
    id: rect.id,
    class: rect.class || 'unknown',
    class_id: rect.class_id || 0,
    confidence: rect.confidence || 1.0,
    bbox: {
      x_min: rect.coords.topLeft.x,
      y_min: rect.coords.topLeft.y,
      x_max: rect.coords.bottomRight.x,
      y_max: rect.coords.bottomRight.y,
    },
  }
  return JSON.stringify(jsonObj, null, 2)
}

// 高亮矩形
const highlightRect = (rect) => {
  // 使用子组件的方法高亮矩形
  if (rectangleDrawingTool.value) {
    rectangleDrawingTool.value.highlightRect(rect)
  }

  // 标记为高亮状态
  rect.isHighlighted = true
}

// 取消高亮矩形
const unhighlightRect = (rect) => {
  // 使用子组件的方法取消高亮矩形
  if (rectangleDrawingTool.value) {
    rectangleDrawingTool.value.unhighlightRect(rect)
  }

  // 取消高亮状态标记
  rect.isHighlighted = false
}

// 触发文件输入
const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.value = '' // 清空文件输入，确保可以重复选择同一文件
    fileInput.value.click()
  }
}

// 清空所有矩形
const clearAllRectangles = () => {
  if (rectangleDrawingTool.value) {
    // 调用子组件的方法清空所有矩形
    rectangleDrawingTool.value.clearRectangles()

    // 清空父组件中的矩形数组
    rectangles.value = []

    // 更新筛选后的矩形列表
    updateFilteredRectangles()
  }
}

// 提取文本
const extractText = () => {
  if (filteredRectangles.value.length === 0) {
    alert('请先绘制至少一个矩形区域')
    return
  }

  // 防止重复提取
  if (extractingText.value) return
  extractingText.value = true

  // 准备提取文本
  const extractData = {
    image_id: currentImageId.value,
    rectangles: filteredRectangles.value.map((rect) => {
      return {
        id: rect.id,
        class: rect.class || 'unknown',
        confidence: rect.confidence || 1.0,
        coords: rect.coords,
      }
    }),
  }

  // 为所有矩形设置ocr处理状态
  rectangles.value.forEach((rect) => {
    // 跳过figure类型，其他类型标记为正在处理
    if (rect.class !== 'figure') {
      rect.ocrProcessing = true
    }
    // 自动切换到文本视图
    rect.showText = true
    rect.showJson = false
  })

  // 发送到后端进行文本提取
  fetch('/api/python/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(extractData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('提取失败')
      }
      return response.json()
    })
    .then((data) => {
      console.log('文本提取结果:', data) // 增加日志输出
      extractingText.value = false

      if (data.success) {
        // 处理OCR结果
        if (data.results && Array.isArray(data.results)) {
          // 更新每个矩形的OCR结果
          data.results.forEach((result) => {
            const rect = rectangles.value.find((r) => r.id === result.id)
            if (rect) {
              rect.ocrProcessing = false

              if (rect.class === 'figure') {
                // 对于figure类型，设置特殊文本
                rect.ocrText = '这是一张图片'
              } else {
                // 对于其他类型，设置OCR结果
                rect.ocrText = result.text || '无法识别文本'
              }
            }
          })
        }
      } else {
        // 清除所有矩形的处理状态
        rectangles.value.forEach((rect) => {
          rect.ocrProcessing = false
        })
        alert(`错误: ${data.error || '提取失败'}`)
      }
    })
    .catch((error) => {
      extractingText.value = false
      // 清除所有矩形的处理状态
      rectangles.value.forEach((rect) => {
        rect.ocrProcessing = false
      })
      console.error('提取错误:', error)
      alert(`错误: ${error.message}`)
    })
}
</script>

<style scoped></style>

<style>
/* 添加全局主题过渡效果 */
.theme-transition,
.theme-transition * {
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease !important;
}

/* 确保黑暗主题正确应用 */
.dark-theme {
  color-scheme: dark;
}
</style>
