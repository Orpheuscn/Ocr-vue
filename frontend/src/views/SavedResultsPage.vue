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
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-lg mb-2">暂无保存的OCR结果</p>
            <p class="text-sm opacity-70 mb-4">当您在OCR结果页面复制文本时，结果将自动保存在这里</p>
            <router-link :to="{ name: 'Home' }" class="btn btn-primary">
              开始OCR识别
            </router-link>
          </div>
        </div>

        <!-- 结果卡片列表 -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            v-for="result in savedResults" 
            :key="result.id" 
            class="card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            @click="viewResult(result)"
          >
            <div class="card-body p-4">
              <!-- 语言标签和日期 -->
              <div class="flex justify-between items-center mb-2">
                <div class="badge badge-accent">{{ result.languageName || '未知语言' }}</div>
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
            <button @click="copySelectedResult" class="btn btn-sm btn-outline gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              复制
            </button>
            <button @click="confirmDelete" class="btn btn-sm btn-error">删除</button>
          </div>
        </div>
        
        <div v-if="selectedResult" class="mb-4">
          <div class="flex justify-between items-center mb-2 text-sm">
            <div class="badge badge-accent">{{ selectedResult.languageName || '未知语言' }}</div>
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
import TheHeader from '@/components/common/TheHeader.vue'
import TheFooter from '@/components/common/TheFooter.vue'
import { useOcrStore } from '@/stores/ocrStore'
import { getSavedResults, deleteResult as deleteResultService, clearAllResults as clearAllResultsService } from '@/services/savedResultsService'

const store = useOcrStore()
const savedResults = ref([])
const selectedResult = ref(null)
const showDeleteConfirm = ref(false)
const showClearAllConfirm = ref(false)

// 加载保存的结果
onMounted(() => {
  loadSavedResults()
})

// 加载保存的OCR结果
const loadSavedResults = () => {
  savedResults.value = getSavedResults()
}

// 查看结果详情
const viewResult = (result) => {
  selectedResult.value = result
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

// 确认删除
const confirmDelete = () => {
  showDeleteConfirm.value = true
}

// 删除结果
const deleteResult = () => {
  if (!selectedResult.value) return
  
  const success = deleteResultService(selectedResult.value.id)
  if (success) {
    store._showNotification('OCR结果已删除', 'success')
    loadSavedResults()
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
const clearAllResults = () => {
  const success = clearAllResultsService()
  if (success) {
    store._showNotification('所有OCR结果已清除', 'success')
    loadSavedResults()
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
    day: '2-digit'
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
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
