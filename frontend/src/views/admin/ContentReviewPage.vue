<template>
  <div class="min-h-screen bg-base-200 flex flex-col">
    <TheHeader />

    <!-- 主要内容区域 -->
    <main class="container mx-auto p-4 flex-1">
      <div class="flex flex-col space-y-4">
        <!-- 页面标题 -->
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold">内容审核管理</h1>
          <div class="flex gap-2">
            <div class="tabs tabs-boxed">
              <a 
                class="tab" 
                :class="{ 'tab-active': activeTab === 'published' }"
                @click="setActiveTab('published')"
              >
                已发布
              </a>
              <a 
                class="tab" 
                :class="{ 'tab-active': activeTab === 'flagged' }"
                @click="setActiveTab('flagged')"
              >
                已标记
              </a>
              <a 
                class="tab" 
                :class="{ 'tab-active': activeTab === 'removed' }"
                @click="setActiveTab('removed')"
              >
                已移除
              </a>
            </div>
          </div>
        </div>

        <!-- 加载中状态 -->
        <div v-if="isLoading" class="card bg-base-100 shadow-md p-6 text-center">
          <div class="flex flex-col items-center justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
            <p class="text-lg mt-4">加载中...</p>
          </div>
        </div>

        <!-- 无内容提示 -->
        <div v-else-if="contentList.length === 0" class="card bg-base-100 shadow-md p-6 text-center">
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
            <p class="text-lg mb-2">暂无{{ getTabTitle() }}内容</p>
          </div>
        </div>

        <!-- 内容列表 -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="item in contentList"
            :key="item.id"
            class="card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            @click="viewContent(item)"
          >
            <div class="card-body p-4">
              <!-- 语言标签和日期 -->
              <div class="flex justify-between items-center mb-2">
                <div class="flex gap-1">
                  <div class="badge badge-accent">{{ item.languageName || '未知语言' }}</div>
                  <div
                    v-if="item.publishStatus"
                    class="badge"
                    :class="{
                      'badge-success': item.publishStatus === 'published',
                      'badge-warning': item.publishStatus === 'flagged',
                      'badge-error': item.publishStatus === 'removed',
                    }"
                  >
                    {{ getStatusText(item.publishStatus) }}
                  </div>
                </div>
                <div class="text-xs opacity-70">{{ formatDate(item.timestamp) }}</div>
              </div>

              <!-- 文本预览 -->
              <div class="text-sm line-clamp-3 mb-2" :dir="getTextDirection(item.language)">
                {{ item.preview || item.text.substring(0, 150) }}
              </div>

              <!-- 用户信息 -->
              <div class="flex justify-between text-xs opacity-70 mt-auto">
                <span>用户: {{ item.username || '未知用户' }}</span>
                <span>{{ item.wordCount || 0 }} 词</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页控件 -->
        <div v-if="totalPages > 1" class="flex justify-center mt-4">
          <div class="btn-group">
            <button
              class="btn btn-sm"
              :class="{ 'btn-disabled': currentPage === 1 }"
              @click="changePage(currentPage - 1)"
            >
              «
            </button>
            <button class="btn btn-sm">{{ currentPage }} / {{ totalPages }}</button>
            <button
              class="btn btn-sm"
              :class="{ 'btn-disabled': currentPage === totalPages }"
              @click="changePage(currentPage + 1)"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- 内容详情模态框 -->
    <div class="modal" :class="{ 'modal-open': selectedContent }">
      <div class="modal-box max-w-3xl">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg">内容详情</h3>
          <div class="flex gap-2">
            <button
              v-if="activeTab === 'published'"
              @click="flagContent"
              class="btn btn-sm btn-warning gap-1"
              :disabled="isSubmitting"
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              标记
            </button>
            <button
              v-if="activeTab === 'published' || activeTab === 'flagged'"
              @click="removeContent"
              class="btn btn-sm btn-error gap-1"
              :disabled="isSubmitting"
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
              移除
            </button>
            <button
              v-if="activeTab === 'flagged'"
              @click="keepContent"
              class="btn btn-sm btn-success gap-1"
              :disabled="isSubmitting"
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              保留
            </button>
          </div>
        </div>

        <div v-if="selectedContent" class="mb-4">
          <div class="flex justify-between items-center mb-2 text-sm">
            <div class="flex gap-1 items-center">
              <div class="badge badge-accent">{{ selectedContent.languageName || '未知语言' }}</div>
              <div
                v-if="selectedContent.publishStatus"
                class="badge"
                :class="{
                  'badge-success': selectedContent.publishStatus === 'published',
                  'badge-warning': selectedContent.publishStatus === 'flagged',
                  'badge-error': selectedContent.publishStatus === 'removed',
                }"
              >
                {{ getStatusText(selectedContent.publishStatus) }}
              </div>
            </div>
            <div class="opacity-70">{{ formatDate(selectedContent.timestamp, true) }}</div>
          </div>

          <div class="divider my-2"></div>

          <div
            class="bg-base-200 p-4 rounded-md max-h-96 overflow-y-auto whitespace-pre-wrap text-sm"
            :dir="getTextDirection(selectedContent.language)"
          >
            {{ selectedContent.text }}
          </div>

          <!-- 审核备注 -->
          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">审核备注</span>
            </label>
            <textarea
              v-model="reviewNote"
              class="textarea textarea-bordered h-24"
              placeholder="输入审核备注，将会通知用户"
            ></textarea>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn" @click="closeModal">关闭</button>
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
import { getToken } from '@/services/tokenService'

const router = useRouter()
const store = useOcrStore()
const contentList = ref([])
const selectedContent = ref(null)
const isLoading = ref(false)
const isSubmitting = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = 12 // 每页显示的结果数量
const activeTab = ref('published') // 默认显示已发布内容
const reviewNote = ref('')

// 设置活动标签
const setActiveTab = (tab) => {
  activeTab.value = tab
  currentPage.value = 1
  loadContent()
}

// 获取标签标题
const getTabTitle = () => {
  switch (activeTab.value) {
    case 'published':
      return '已发布'
    case 'flagged':
      return '已标记'
    case 'removed':
      return '已移除'
    default:
      return ''
  }
}

// 加载内容
const loadContent = async () => {
  try {
    isLoading.value = true
    
    let url = ''
    if (activeTab.value === 'published') {
      url = `/api/published-results?page=${currentPage.value}&limit=${pageSize}`
    } else if (activeTab.value === 'flagged') {
      url = `/api/saved-results/flagged?page=${currentPage.value}&limit=${pageSize}`
    } else if (activeTab.value === 'removed') {
      // 这里需要后端提供一个获取已移除内容的API
      url = `/api/saved-results/removed?page=${currentPage.value}&limit=${pageSize}`
    }
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      contentList.value = data.data || []
      totalPages.value = data.totalPages || 1
      currentPage.value = data.currentPage || 1
    } else {
      console.error('获取内容失败:', await response.text())
      store._showNotification('获取内容失败', 'error')
    }
  } catch (error) {
    console.error('加载内容时出错:', error)
    store._showNotification('加载内容时出错', 'error')
  } finally {
    isLoading.value = false
  }
}

// 查看内容详情
const viewContent = (content) => {
  selectedContent.value = content
  reviewNote.value = ''
}

// 关闭模态框
const closeModal = () => {
  selectedContent.value = null
  reviewNote.value = ''
}

// 标记内容
const flagContent = async () => {
  await reviewContent('flag')
}

// 移除内容
const removeContent = async () => {
  await reviewContent('remove')
}

// 保留内容
const keepContent = async () => {
  await reviewContent('keep')
}

// 审核内容
const reviewContent = async (action) => {
  if (!selectedContent.value) return
  
  try {
    isSubmitting.value = true
    
    const response = await fetch(`/api/saved-results/${selectedContent.value._id}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        action,
        note: reviewNote.value
      })
    })
    
    if (response.ok) {
      let actionText = ''
      if (action === 'flag') actionText = '标记'
      else if (action === 'remove') actionText = '移除'
      else if (action === 'keep') actionText = '保留'
      
      store._showNotification(`内容已${actionText}`, 'success')
      closeModal()
      loadContent()
    } else {
      console.error('审核内容失败:', await response.text())
      store._showNotification('审核失败，请重试', 'error')
    }
  } catch (error) {
    console.error('审核内容时出错:', error)
    store._showNotification('审核失败，请重试', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// 切换页面
const changePage = (page) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadContent()
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

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'published':
      return '已发布'
    case 'flagged':
      return '已标记'
    case 'removed':
      return '已移除'
    default:
      return '未知状态'
  }
}

// 组件挂载时加载内容
onMounted(() => {
  loadContent()
})
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
