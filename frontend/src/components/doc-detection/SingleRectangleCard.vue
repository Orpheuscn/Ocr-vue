<template>
  <div
    class="card bg-base-200 shadow-sm"
    :class="{ 'border-2 border-accent': rect.isHighlighted }"
    @mouseenter="$emit('highlight', rect)"
    @mouseleave="$emit('unhighlight', rect)"
  >
    <!-- 卡片内容 -->
    <div class="card-body p-4">
      <!-- 矩形标题和按钮 -->
      <div class="card-title text-sm justify-between items-center mb-2">
        <!-- 标题与颜色指示器 -->
        <div class="flex items-center">
          <div class="w-4 h-3 mr-2 rounded" :style="{ backgroundColor: getRectColor(rect) }"></div>
          <span>矩形 #{{ index + 1 }}</span>
        </div>

        <!-- 按钮组 -->
        <div class="flex space-x-1">
          <!-- JSON按钮 -->
          <button
            class="btn btn-xs btn-outline"
            :class="{ 'btn-primary': rect.showJson || !rect.showText }"
            @click="toggleJsonView"
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

          <!-- OCR文本按钮 - 整合了OCR提取和文本显示功能 -->
          <button
            class="btn btn-xs btn-outline"
            :class="{
              'btn-accent': rect.ocrProcessing,
              'btn-primary': rect.showText && rect.ocrText,
              'btn-outline': !rect.showText || !rect.ocrText,
            }"
            @click="handleOcrTextClick"
            :disabled="rect.ocrProcessing"
            :title="getOcrButtonTitle()"
          >
            <span v-if="rect.ocrProcessing" class="loading loading-spinner loading-xs"></span>
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>

          <!-- 单张切割按钮 -->
          <button
            class="btn btn-xs btn-success btn-outline"
            @click="handleCropSingle"
            :disabled="cropProcessing"
            title="切割并下载此矩形"
          >
            <span v-if="cropProcessing" class="loading loading-spinner loading-xs"></span>
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- JSON格式显示 -->
      <pre
        v-if="rect.showJson || !rect.showText"
        class="text-xs bg-base-300 p-3 rounded overflow-auto"
        >{{ formatRectToJSON(rect) }}</pre
      >

      <!-- OCR文本显示区域 -->
      <div v-if="rect.showText" class="text-sm bg-base-300 p-3 rounded">
        <div v-if="rect.ocrText">
          <p v-if="rect.class === 'figure'" class="text-base-content/70">【这是一张图片】</p>
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
</template>

<script setup>
import { ref } from 'vue'
// 引入颜色管理工具函数
import { getRectColor } from '@/utils/colorUtils'
// 引入API服务
import * as docDetectService from '@/services/docDetectService'

// 定义属性
const props = defineProps({
  rect: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  imageId: {
    type: String,
    required: true,
  },
})

// 定义事件
const emit = defineEmits([
  'highlight',
  'unhighlight',
  'text-extracted',
  'update-rect',
  'extract-text-for-rect',
])

// 切割处理状态
const cropProcessing = ref(false)

// 颜色管理已移至 colorUtils.js 工具函数

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

// 切换JSON视图
const toggleJsonView = () => {
  const updatedRect = { ...props.rect }
  // 如果当前显示的是文本，切换到JSON
  if (updatedRect.showText) {
    updatedRect.showText = false
    updatedRect.showJson = true
  } else {
    // 默认情况下已经显示JSON，不需要做任何改变
    updatedRect.showJson = true
  }
  emit('update-rect', updatedRect)
}

// 处理OCR文本按钮点击 - 整合了OCR提取和文本显示功能
const handleOcrTextClick = () => {
  // 如果已经有OCR文本，则切换显示状态
  if (props.rect.ocrText) {
    const updatedRect = { ...props.rect }
    updatedRect.showText = !updatedRect.showText
    // 如果显示文本，则隐藏JSON
    if (updatedRect.showText) {
      updatedRect.showJson = false
    } else {
      // 如果不显示文本，则显示JSON
      updatedRect.showJson = true
    }
    emit('update-rect', updatedRect)
  } else {
    // 如果没有OCR文本，则进行OCR提取
    // 先设置显示状态为文本模式
    const updatedRect = { ...props.rect }
    updatedRect.showText = true
    updatedRect.showJson = false
    emit('update-rect', updatedRect)

    // 然后进行OCR提取
    extractTextForRect()
  }
}

// 获取OCR按钮的提示文本
const getOcrButtonTitle = () => {
  if (props.rect.class === 'figure') {
    return '图片类型不支持OCR'
  }
  if (props.rect.ocrProcessing) {
    return '正在识别文本...'
  }
  if (props.rect.ocrText) {
    return props.rect.showText ? '隐藏文本' : '显示文本'
  }
  return '提取此矩形的文本'
}

// 为单个矩形提取文本
const extractTextForRect = () => {
  // 通过事件传递给父组件处理
  emit('extract-text-for-rect', props.rect)
}

// 处理单张切割
const handleCropSingle = async () => {
  if (cropProcessing.value) return

  cropProcessing.value = true

  try {
    // 准备切割数据
    const cropData = {
      image_id: props.imageId,
      rectangles: [
        {
          id: props.rect.id,
          class: props.rect.class || 'unknown',
          confidence: props.rect.confidence || 1.0,
          coords: props.rect.coords,
        },
      ],
    }

    // 调用切割API
    const result = await docDetectService.cropImage(cropData)

    if (result.success && result.cropped_images && result.cropped_images.length > 0) {
      // 获取切割后的图片信息
      const croppedImage = result.cropped_images[0]

      // 构建下载URL
      const downloadUrl = `/api/python/crops/${croppedImage.relative_path}`

      // 下载图片
      await downloadSingleImage(downloadUrl, croppedImage.filename)
    } else {
      alert(`切割失败: ${result.error || '未知错误'}`)
    }
  } catch (error) {
    console.error('单张切割错误:', error)
    alert(`切割失败: ${error.message}`)
  } finally {
    cropProcessing.value = false
  }
}

// 下载单张图片
const downloadSingleImage = async (imageUrl, filename) => {
  try {
    const response = await fetch(imageUrl)

    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`)
    }

    const blob = await response.blob()

    // 创建临时下载链接
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = filename

    // 添加到文档并触发点击
    document.body.appendChild(a)
    a.click()

    // 清理
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('下载图片错误:', error)
    throw error
  }
}
</script>
