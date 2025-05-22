<template>
  <div class="min-h-screen bg-base-200 flex flex-col">
    <TheHeader />

    <!-- 主要内容区域 -->
    <main class="container mx-auto p-4 flex-1">
      <div class="flex flex-col space-y-4">
        <!-- 页面标题 -->
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold">保存的OCR结果</h1>
          <div class="flex gap-2">
            <button
              v-if="savedResults.length > 0"
              @click="confirmClearAll"
              class="btn btn-sm btn-error"
            >
              清除所有
            </button>
          </div>
        </div>

        <!-- 无结果提示 -->
        <div v-if="savedResults.length === 0" class="card bg-base-100 shadow-md p-6 text-center">
          <div class="flex flex-col items-center justify-center py-8">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-16 w-16 mb-4 opacity-50"
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
            <p class="text-lg mb-2">暂无保存的OCR结果</p>
            <p class="text-sm opacity-70 mb-4">当您在OCR结果页面复制文本时，结果将自动保存在这里</p>
            <router-link :to="{ name: 'Home' }" class="btn btn-primary"> 开始OCR识别 </router-link>
          </div>
        </div>

        <!-- 结果卡片列表 -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="(result, index) in savedResults"
            :key="result.id || 'unknown_' + index"
            class="card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            @click="
              result.id
                ? viewResult(result)
                : store._showNotification('无法查看详情，结果ID不存在', 'error')
            "
          >
            <div class="card-body p-4">
              <!-- 语言标签和日期 -->
              <div class="flex justify-between items-center mb-2">
                <div class="flex gap-1">
                  <div class="badge badge-accent">{{ result.languageName || '未知语言' }}</div>
                  <div
                    v-if="result.isPublic || result.publishStatus"
                    class="badge"
                    :class="{
                      'badge-success': result.isPublic && result.publishStatus === 'published',
                      'badge-warning': result.publishStatus === 'flagged',
                      'badge-error': result.publishStatus === 'removed',
                    }"
                  >
                    {{
                      result.isPublic && !result.publishStatus
                        ? '已发布'
                        : getPublishStatusText(result.publishStatus)
                    }}
                  </div>
                </div>
                <div class="text-xs opacity-70">{{ formatDate(result.timestamp) }}</div>
              </div>

              <!-- 文本预览 -->
              <div class="text-sm line-clamp-3 mb-2" :dir="getTextDirection(result.language)">
                {{ result.preview }}
              </div>

              <!-- 统计信息 -->
              <div class="flex justify-between text-xs opacity-70 mt-auto">
                <span>{{ result.wordCount }} 词</span>
                <span>{{ result.charCount }} 字符</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 结果详情模态框 -->
    <div class="modal" :class="{ 'modal-open': selectedResult }">
      <div class="modal-box max-w-3xl">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg">OCR结果详情</h3>
          <div class="flex gap-2">
            <button
              @click="
                selectedResult?.id
                  ? publishOcrResult()
                  : store._showNotification('发布失败，结果ID不存在', 'error')
              "
              class="btn btn-sm gap-1"
              :class="{
                'btn-outline': !selectedResult?.isPublic && !selectedResult?.publishStatus,
                'btn-success':
                  selectedResult?.isPublic && selectedResult?.publishStatus === 'published',
                'btn-warning': selectedResult?.publishStatus === 'flagged',
                'btn-error': selectedResult?.publishStatus === 'removed',
              }"
              :disabled="
                isSubmitting ||
                !selectedResult?.id ||
                (selectedResult?.isPublic && selectedResult?.publishStatus === 'published') ||
                selectedResult?.publishStatus === 'removed'
              "
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              {{ getPublishButtonText() }}
            </button>
            <button @click="confirmDelete" class="btn btn-sm btn-error">删除</button>
          </div>
        </div>

        <div v-if="selectedResult" class="mb-4">
          <div class="flex justify-between items-center mb-2 text-sm">
            <div class="flex gap-1 items-center">
              <div class="badge badge-accent">{{ selectedResult.languageName || '未知语言' }}</div>
              <div
                v-if="selectedResult.isPublic || selectedResult.publishStatus"
                class="badge"
                :class="{
                  'badge-success':
                    selectedResult.isPublic && selectedResult.publishStatus === 'published',
                  'badge-warning': selectedResult.publishStatus === 'flagged',
                  'badge-error': selectedResult.publishStatus === 'removed',
                }"
              >
                {{
                  selectedResult.isPublic && !selectedResult.publishStatus
                    ? '已发布'
                    : getPublishStatusText(selectedResult.publishStatus)
                }}
              </div>
              <div v-if="selectedResult.id" class="text-xs opacity-70">
                ID: {{ selectedResult.id }}
              </div>
            </div>
            <div class="opacity-70">{{ formatDate(selectedResult.timestamp, true) }}</div>
          </div>

          <div class="divider my-2"></div>

          <div
            class="bg-base-200 p-4 rounded-md max-h-96 overflow-y-auto whitespace-pre-wrap text-sm"
            :dir="getTextDirection(selectedResult.language)"
          >
            {{ selectedResult.text }}
          </div>
        </div>

        <div class="modal-action">
          <button class="btn" @click="closeModal">关闭</button>
        </div>
      </div>
    </div>

    <!-- 确认删除模态框 -->
    <div class="modal" :class="{ 'modal-open': showDeleteConfirm }">
      <div class="modal-box">
        <h3 class="font-bold text-lg">确认删除</h3>
        <p class="py-4">您确定要删除这个保存的OCR结果吗？此操作无法撤销。</p>
        <div class="modal-action">
          <button @click="deleteResult" class="btn btn-error">删除</button>
          <button @click="showDeleteConfirm = false" class="btn">取消</button>
        </div>
      </div>
    </div>

    <!-- 确认清除所有模态框 -->
    <div class="modal" :class="{ 'modal-open': showClearAllConfirm }">
      <div class="modal-box">
        <h3 class="font-bold text-lg">确认清除所有</h3>
        <p class="py-4">您确定要清除所有保存的OCR结果吗？此操作无法撤销。</p>
        <div class="modal-action">
          <button @click="clearAllResults" class="btn btn-error">清除所有</button>
          <button @click="showClearAllConfirm = false" class="btn">取消</button>
        </div>
      </div>
    </div>

    <!-- 页脚 -->
    <TheFooter />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TheHeader from '@/components/common/TheHeader.vue'
import TheFooter from '@/components/common/TheFooter.vue'
import { useOcrStore } from '@/stores/ocrStore'
import { isAuthenticated } from '@/services/authService'
import {
  getSavedResults,
  deleteResult as deleteResultService,
  clearAllResults as clearAllResultsService,
  publishResult,
} from '@/services/savedResultsService'

const store = useOcrStore()
const router = useRouter()
const savedResults = ref([])
const selectedResult = ref(null)
const showDeleteConfirm = ref(false)
const showClearAllConfirm = ref(false)
const isSubmitting = ref(false)

// 加载保存的结果
onMounted(() => {
  // 检查用户是否已登录
  if (!isAuthenticated()) {
    console.log('用户未登录，重定向到登录页面')
    store._showNotification('请先登录后再查看保存的OCR结果', 'warning')
    router.push({ name: 'Login', query: { redirect: router.currentRoute.value.fullPath } })
    return
  }

  loadSavedResults()
})

// 加载保存的OCR结果
const loadSavedResults = async () => {
  const results = await getSavedResults()

  // 确保所有结果都有id字段
  const processedResults = results.map((result) => {
    // 如果没有id字段但有_id字段，使用_id作为id
    if (!result.id && result._id) {
      console.log('结果没有id字段但有_id字段，使用_id作为id:', result._id)
      result.id = result._id.toString()
    }

    // 如果既没有id也没有_id，生成一个临时ID
    if (!result.id) {
      result.id = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      console.log('为结果生成临时ID:', result.id)
    }

    return result
  })

  savedResults.value = processedResults
  console.log('已加载保存结果数量:', savedResults.value.length)
}

// 查看结果详情
const viewResult = (result) => {
  // 打印完整的结果对象，用于调试
  console.log('查看结果详情，完整结果对象:', JSON.stringify(result))

  // 确保结果对象有ID
  if (!result.id && result._id) {
    console.log('结果没有id字段但有_id字段，使用_id作为id')
    result.id = result._id.toString()
  }

  if (!result.id) {
    console.error('查看结果详情失败: 结果ID不存在', result)
    store._showNotification('无法查看详情，结果ID不存在', 'error')
    return
  }

  selectedResult.value = result
  console.log('查看OCR结果详情，ID:', result.id)
}

// 关闭模态框
const closeModal = () => {
  selectedResult.value = null
}

// 发布OCR结果
const publishOcrResult = async () => {
  if (!selectedResult.value) return

  try {
    isSubmitting.value = true

    // 打印完整的结果对象，用于调试
    console.log('发布OCR结果，完整结果对象:', JSON.stringify(selectedResult.value))

    // 确保结果对象有ID
    if (!selectedResult.value.id && selectedResult.value._id) {
      console.log('结果没有id字段但有_id字段，使用_id作为id')
      selectedResult.value.id = selectedResult.value._id.toString()
    }

    // 检查ID是否存在
    if (!selectedResult.value.id) {
      console.error('发布OCR结果失败: 结果ID不存在')
      store._showNotification('发布失败，结果ID不存在', 'error')
      isSubmitting.value = false
      return
    }

    console.log('准备发布OCR结果，ID:', selectedResult.value.id)
    const success = await publishResult(selectedResult.value.id)

    if (success) {
      store._showNotification('OCR结果已成功发布，现在可以在公开页面查看', 'success')
      // 重新加载结果以更新状态
      await loadSavedResults()
      // 关闭模态框
      selectedResult.value = null
    } else {
      store._showNotification('发布失败，请重试', 'error')
    }
  } catch (error) {
    console.error('发布OCR结果失败:', error)
    store._showNotification('发布失败，请重试', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// 确认删除
const confirmDelete = () => {
  showDeleteConfirm.value = true
}

// 删除结果
const deleteResult = async () => {
  if (!selectedResult.value) return

  const success = await deleteResultService(selectedResult.value.id)
  if (success) {
    store._showNotification('OCR结果已删除', 'success')
    await loadSavedResults()
    selectedResult.value = null
  } else {
    store._showNotification('删除失败，请重试', 'error')
  }

  showDeleteConfirm.value = false
}

// 确认清除所有
const confirmClearAll = () => {
  showClearAllConfirm.value = true
}

// 清除所有结果
const clearAllResults = async () => {
  const success = await clearAllResultsService()
  if (success) {
    store._showNotification('所有OCR结果已清除', 'success')
    await loadSavedResults()
    selectedResult.value = null
  } else {
    store._showNotification('清除失败，请重试', 'error')
  }

  showClearAllConfirm.value = false
}

// 格式化日期
const formatDate = (dateString, showTime = false) => {
  if (!dateString) return ''

  const date = new Date(dateString)
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }

  if (showTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
  }

  return date.toLocaleDateString('zh-CN', options)
}

// 获取文本方向
const getTextDirection = (language) => {
  // 阿拉伯语、希伯来语等从右到左的语言
  const rtlLanguages = ['ar', 'he', 'ur', 'fa']
  return rtlLanguages.includes(language) ? 'rtl' : 'ltr'
}

// 获取发布状态文本
const getPublishStatusText = (status) => {
  switch (status) {
    case 'published':
      return '已发布'
    case 'flagged':
      return '已标记'
    case 'removed':
      return '已移除'
    default:
      return '未发布'
  }
}

// 获取发布按钮文本
const getPublishButtonText = () => {
  if (!selectedResult.value) return '发布'

  if (selectedResult.value.isPublic && selectedResult.value.publishStatus === 'published') {
    return '已发布'
  }

  switch (selectedResult.value.publishStatus) {
    case 'flagged':
      return '已标记'
    case 'removed':
      return '已移除'
    default:
      return '发布'
  }
}
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
