<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
  >
    <div
      class="bg-base-100 p-6 rounded-box shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto relative"
    >
      <!-- 关闭按钮 -->
      <button class="btn btn-sm btn-circle absolute right-2 top-2" @click="$emit('close')">
        ✕
      </button>

      <!-- 对话框标题 -->
      <h2 class="text-2xl font-bold mb-4 text-accent">{{ computedTitle }}</h2>

      <!-- 对话框内容 -->
      <div class="space-y-4">
        <p class="text-lg">{{ computedMessage }}</p>

        <!-- 带标注的图像 -->
        <div v-if="computedImageUrl" class="mt-4">
          <h3 class="text-lg font-semibold mb-2">带标注的图像:</h3>
          <img
            :src="computedImageUrl"
            class="w-full h-auto rounded-lg border border-base-300"
            style="max-height: 400px; object-fit: contain"
          />
        </div>

        <!-- 下载链接 -->
        <div v-if="computedZipUrl" class="mt-4 flex flex-col items-center space-y-2">
          <button @click="downloadZip" class="btn btn-primary" :disabled="downloading">
            <span v-if="downloading" class="loading loading-spinner loading-sm mr-2"></span>
            <svg
              v-else
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
            {{ downloading ? '下载中...' : '下载切割结果' }}
          </button>

          <!-- 下载状态消息 -->
          <div
            v-if="downloadMessage"
            class="text-sm"
            :class="{
              'text-success': downloadMessage.includes('成功'),
              'text-error': downloadMessage.includes('出错'),
            }"
          >
            {{ downloadMessage }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
// 引入API服务
import * as docDetectService from '@/services/docDetectService'

// 定义属性
const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  resultData: {
    type: Object,
    default: null,
  },
})

// 计算属性
const computedTitle = computed(() => {
  return '切割完成'
})

const computedMessage = computed(() => {
  return props.resultData?.message || '切割成功！'
})

const computedImageUrl = computed(() => {
  if (!props.resultData) return ''

  // 优先使用annotated图像URL，如果没有则使用detect图像URL
  if (props.resultData.annotated_image_url) {
    return `/api/python${props.resultData.annotated_image_url}`
  } else if (props.resultData.detect_image_url) {
    return `/api/python${props.resultData.detect_image_url}`
  }
  return ''
})

const computedZipUrl = computed(() => {
  if (!props.resultData?.zip_url) return ''
  return `/api/python${props.resultData.zip_url}`
})

// 定义事件
const emit = defineEmits(['close', 'download'])

// 下载状态
const downloading = ref(false)
const downloadMessage = ref('')

// 下载ZIP文件
const downloadZip = async () => {
  if (!computedZipUrl.value || downloading.value) return

  downloading.value = true
  downloadMessage.value = '正在准备下载，请稍候...'

  try {
    // 使用服务下载ZIP文件
    const blob = await docDetectService.downloadZipFile(computedZipUrl.value)

    // 创建临时下载链接
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url

    // 从 URL 中提取文件名
    const fileName = computedZipUrl.value.split('/').pop() || 'crop_result.zip'
    a.download = fileName

    // 添加到文档并触发点击
    document.body.appendChild(a)
    a.click()

    // 清理
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    downloadMessage.value = '下载成功！'

    // 2秒后清除消息
    setTimeout(() => {
      downloadMessage.value = ''
    }, 2000)
  } catch (error) {
    console.error('下载错误:', error)
    downloadMessage.value = `下载出错: ${error.message}`

    // 5秒后清除错误消息
    setTimeout(() => {
      downloadMessage.value = ''
    }, 5000)
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
/* 如果需要额外的样式，可以在这里添加 */
</style>
