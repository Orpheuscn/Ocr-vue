<template>
  <div class="min-h-screen bg-base-200 flex flex-col">
    <TheHeader />

    <!-- 主要内容区域 -->
    <main class="container mx-auto p-4 flex-1">
      <div class="flex flex-col space-y-4">
        <!-- 页面标题 -->
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold">公开内容</h1>
          <div class="flex gap-2">
            <div class="form-control">
              <div class="input-group">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索..."
                  class="input input-bordered input-sm"
                  @keyup.enter="searchResults"
                />
                <button class="btn btn-square btn-sm" @click="searchResults">
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
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 无结果提示 -->
        <div v-if="isLoading" class="card bg-base-100 shadow-md p-6 text-center">
          <div class="flex flex-col items-center justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
            <p class="text-lg mt-4">加载中...</p>
          </div>
        </div>

        <div
          v-else-if="publishedResults.length === 0"
          class="card bg-base-100 shadow-md p-6 text-center"
        >
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
            <p class="text-lg mb-2">暂无公开内容</p>
            <p class="text-sm opacity-70 mb-4">当用户发布提取内容并通过审核后，将会显示在这里</p>
          </div>
        </div>

        <!-- 结果卡片列表 -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="result in publishedResults"
            :key="result.id"
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
                  <!-- 显示"我的"标签，如果是当前用户发布的内容 -->
                  <div v-if="isOwnResult(result)" class="badge badge-primary">我的</div>
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

    <!-- 结果详情模态框 -->
    <div class="modal" :class="{ 'modal-open': selectedResult }">
      <div class="modal-box max-w-3xl">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg">提取结果详情</h3>
          <div class="flex gap-2 items-center">
            <button @click="copySelectedResult" class="btn btn-sm btn-outline gap-1">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              复制
            </button>
            <!-- 删除按钮，仅对自己发布的内容显示 -->
            <button
              v-if="isOwnResult(selectedResult)"
              @click="confirmDelete"
              class="btn btn-sm btn-error gap-1"
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
              删除
            </button>
            <div v-if="selectedResult?.id" class="text-xs opacity-70">
              ID: {{ selectedResult.id }}
            </div>
          </div>
        </div>

        <div v-if="selectedResult" class="mb-4">
          <div class="flex justify-between items-center mb-2 text-sm">
            <div class="flex gap-1 items-center">
              <div class="badge badge-accent">{{ selectedResult.languageName || '未知语言' }}</div>
              <!-- 显示"我的"标签，如果是当前用户发布的内容 -->
              <div v-if="isOwnResult(selectedResult)" class="badge badge-primary">我的</div>
              <!-- 显示发布者信息 -->
              <div class="text-xs opacity-70 ml-2">
                发布者: {{ selectedResult.username || '未知用户' }}
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
        <p class="py-4">您确定要删除这个已发布的提取结果吗？此操作无法撤销。</p>
        <div class="modal-action">
          <button @click="deleteResult" class="btn btn-error" :disabled="isDeleting">
            <span v-if="isDeleting">
              <span class="loading loading-spinner loading-xs"></span>
              删除中...
            </span>
            <span v-else>删除</span>
          </button>
          <button @click="showDeleteConfirm = false" class="btn">取消</button>
        </div>
      </div>
    </div>

    <!-- 页脚 -->
    <TheFooter />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import TheHeader from '@/components/common/TheHeader.vue'
import TheFooter from '@/components/common/TheFooter.vue'
import { useOcrStore } from '@/stores/ocrStore'
import { isAuthenticated, getCurrentUser } from '@/services/authService'
import { deleteResult as deleteResultService } from '@/services/savedResultsService'

const store = useOcrStore()
const publishedResults = ref([])
const selectedResult = ref(null)
const isLoading = ref(false)
const isDeleting = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = 12 // 每页显示的结果数量
const showDeleteConfirm = ref(false)
const currentUser = ref(getCurrentUser())

// 加载已发布的OCR结果
onMounted(() => {
  loadPublishedResults()

  // 添加事件监听器，当用户登录状态变化时更新currentUser
  window.addEventListener('storage', handleStorageChange)
})

// 处理localStorage变化，更新currentUser
const handleStorageChange = (event) => {
  if (event.key === 'user_info' || event.key === 'user_logged_out') {
    console.log('用户登录状态变化，更新currentUser')
    currentUser.value = getCurrentUser()
  }
}

// 组件卸载时清理事件监听器
onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
})

// 加载已发布的OCR结果
const loadPublishedResults = async (page = 1, query = '') => {
  try {
    isLoading.value = true

    // 构建API URL，包含分页和搜索参数
    let url = `/api/saved-results/published?page=${page}&limit=${pageSize}`
    if (query) {
      url += `&search=${encodeURIComponent(query)}`
    }
    console.log('加载已发布结果URL:', url)

    const response = await fetch(url)

    if (response.ok) {
      const data = await response.json()

      // 确保所有结果都有id字段
      const processedResults = (data.data || []).map((result) => {
        // 如果没有id字段但有_id字段，使用_id作为id
        if (!result.id && result._id) {
          result.id = result._id
        }

        // 如果既没有id也没有_id，生成一个临时ID
        if (!result.id) {
          result.id = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
          console.log('为结果生成临时ID:', result.id)
        }

        return result
      })

      publishedResults.value = processedResults
      totalPages.value = data.totalPages || 1
      currentPage.value = data.currentPage || 1

      console.log('已加载发布结果数量:', publishedResults.value.length)
    } else {
      console.error('获取已发布的OCR结果失败:', await response.text())
      store._showNotification('获取已发布的OCR结果失败', 'error')
    }
  } catch (error) {
    console.error('加载已发布的OCR结果时出错:', error)
    store._showNotification('加载已发布的OCR结果时出错', 'error')
  } finally {
    isLoading.value = false
  }
}

// 查看结果详情
const viewResult = (result) => {
  // 确保结果对象有ID
  if (!result.id) {
    console.error('查看结果详情失败: 结果ID不存在', result)
    store._showNotification('无法查看详情，结果ID不存在', 'error')
    return
  }

  selectedResult.value = result
  console.log('查看已发布OCR结果详情，ID:', result.id)
}

// 关闭模态框
const closeModal = () => {
  selectedResult.value = null
}

// 复制选中的结果
const copySelectedResult = async () => {
  if (!selectedResult.value) return

  try {
    await navigator.clipboard.writeText(selectedResult.value.text)
    store._showNotification('文本已复制到剪贴板', 'success')
  } catch (error) {
    console.error('复制文本失败:', error)
    store._showNotification('复制失败，请重试', 'error')
  }
}

// 搜索结果
const searchResults = () => {
  currentPage.value = 1 // 重置到第一页
  loadPublishedResults(1, searchQuery.value)
}

// 切换页面
const changePage = (page) => {
  if (page < 1 || page > totalPages.value) return
  loadPublishedResults(page, searchQuery.value)
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

// 检查结果是否属于当前用户
const isOwnResult = (result) => {
  if (!result || !isAuthenticated() || !currentUser.value) return false

  // 检查结果的userId是否与当前用户的id匹配
  return (
    result.userId === currentUser.value.id ||
    (result.userId && result.userId._id === currentUser.value.id) ||
    (result.userId && result.userId.id === currentUser.value.id)
  )
}

// 确认删除
const confirmDelete = () => {
  if (!selectedResult.value) return
  showDeleteConfirm.value = true
}

// 删除结果
const deleteResult = async () => {
  if (!selectedResult.value || !selectedResult.value.id) return

  try {
    isDeleting.value = true

    console.log('删除已发布OCR结果，ID:', selectedResult.value.id)
    const success = await deleteResultService(selectedResult.value.id)

    if (success) {
      store._showNotification('OCR结果已成功删除', 'success')
      // 关闭模态框
      showDeleteConfirm.value = false
      selectedResult.value = null
      // 重新加载结果列表
      await loadPublishedResults(currentPage.value, searchQuery.value)
    } else {
      store._showNotification('删除失败，请重试', 'error')
    }
  } catch (error) {
    console.error('删除OCR结果失败:', error)
    store._showNotification('删除失败，请重试', 'error')
  } finally {
    isDeleting.value = false
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
