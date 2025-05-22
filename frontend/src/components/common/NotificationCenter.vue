<template>
  <div class="relative">
    <!-- 通知图标按钮 -->
    <button
      @click="toggleNotifications"
      class="btn btn-ghost btn-circle"
      :class="{ 'indicator': unreadCount > 0 }"
    >
      <div class="indicator">
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
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <span v-if="unreadCount > 0" class="badge badge-xs badge-primary indicator-item">{{ unreadCount }}</span>
      </div>
    </button>

    <!-- 通知下拉菜单 -->
    <div
      v-if="showNotifications"
      class="absolute right-0 mt-2 w-80 bg-base-100 shadow-lg rounded-lg z-50 overflow-hidden"
    >
      <div class="p-3 border-b border-base-300 flex justify-between items-center">
        <h3 class="font-bold">通知</h3>
        <div class="flex gap-2">
          <button
            v-if="unreadCount > 0"
            @click="markAllAsRead"
            class="btn btn-xs btn-ghost"
            :disabled="isLoading"
          >
            全部标为已读
          </button>
          <button
            v-if="notifications.length > 0"
            @click="clearAllNotifications"
            class="btn btn-xs btn-ghost"
            :disabled="isLoading"
          >
            清空
          </button>
        </div>
      </div>

      <!-- 加载中状态 -->
      <div v-if="isLoading" class="p-4 text-center">
        <span class="loading loading-spinner loading-sm"></span>
        <p class="text-sm mt-2">加载中...</p>
      </div>

      <!-- 无通知状态 -->
      <div v-else-if="notifications.length === 0" class="p-4 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-10 w-10 mx-auto mb-2 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <p class="text-sm">暂无通知</p>
      </div>

      <!-- 通知列表 -->
      <div v-else class="max-h-96 overflow-y-auto">
        <div
          v-for="notification in notifications"
          :key="notification._id"
          class="p-3 border-b border-base-300 hover:bg-base-200 transition-colors cursor-pointer"
          :class="{ 'bg-base-200': !notification.isRead }"
          @click="viewNotification(notification)"
        >
          <div class="flex items-start gap-2">
            <!-- 通知类型图标 -->
            <div
              class="p-2 rounded-full"
              :class="{
                'bg-info bg-opacity-20': notification.type === 'info',
                'bg-success bg-opacity-20': notification.type === 'success',
                'bg-warning bg-opacity-20': notification.type === 'warning',
                'bg-error bg-opacity-20': notification.type === 'error',
              }"
            >
              <svg
                v-if="notification.type === 'info'"
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 text-info"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <svg
                v-else-if="notification.type === 'success'"
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <svg
                v-else-if="notification.type === 'warning'"
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 text-warning"
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
              <svg
                v-else-if="notification.type === 'error'"
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 text-error"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <!-- 通知内容 -->
            <div class="flex-1">
              <div class="flex justify-between items-start">
                <h4 class="font-medium text-sm">{{ notification.title }}</h4>
                <span class="text-xs opacity-70">{{ notification.createdAtText }}</span>
              </div>
              <p class="text-xs mt-1 line-clamp-2">{{ notification.message }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 查看全部按钮 -->
      <div v-if="notifications.length > 0" class="p-2 text-center border-t border-base-300">
        <button @click="viewAllNotifications" class="btn btn-xs btn-ghost">查看全部</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getToken } from '@/services/tokenService'
import { useOcrStore } from '@/stores/ocrStore'

const router = useRouter()
const store = useOcrStore()
const showNotifications = ref(false)
const notifications = ref([])
const unreadCount = ref(0)
const isLoading = ref(false)
const pollingInterval = ref(null)

// 切换通知面板
const toggleNotifications = async () => {
  showNotifications.value = !showNotifications.value
  
  if (showNotifications.value) {
    await loadNotifications()
  }
}

// 加载通知
const loadNotifications = async () => {
  if (!getToken()) return
  
  try {
    isLoading.value = true
    const response = await fetch('/api/notifications?limit=5', {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      notifications.value = data.data || []
      unreadCount.value = data.unreadCount || 0
    } else {
      console.error('获取通知失败:', await response.text())
    }
  } catch (error) {
    console.error('加载通知时出错:', error)
  } finally {
    isLoading.value = false
  }
}

// 查看通知
const viewNotification = async (notification) => {
  try {
    // 如果通知未读，标记为已读
    if (!notification.isRead) {
      await fetch(`/api/notifications/${notification._id}/read`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      })
      
      // 更新本地通知状态
      notification.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    
    // 如果有链接，导航到链接
    if (notification.link) {
      router.push(notification.link)
      showNotifications.value = false
    }
  } catch (error) {
    console.error('处理通知时出错:', error)
  }
}

// 标记所有通知为已读
const markAllAsRead = async () => {
  try {
    isLoading.value = true
    const response = await fetch('/api/notifications/read/all', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    })
    
    if (response.ok) {
      // 更新本地通知状态
      notifications.value.forEach(notification => {
        notification.isRead = true
      })
      unreadCount.value = 0
      store._showNotification('所有通知已标记为已读', 'success')
    } else {
      console.error('标记所有通知为已读失败:', await response.text())
      store._showNotification('操作失败，请重试', 'error')
    }
  } catch (error) {
    console.error('标记所有通知为已读时出错:', error)
    store._showNotification('操作失败，请重试', 'error')
  } finally {
    isLoading.value = false
  }
}

// 清空所有通知
const clearAllNotifications = async () => {
  try {
    isLoading.value = true
    const response = await fetch('/api/notifications/clear/all', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    })
    
    if (response.ok) {
      notifications.value = []
      unreadCount.value = 0
      store._showNotification('所有通知已清空', 'success')
    } else {
      console.error('清空所有通知失败:', await response.text())
      store._showNotification('操作失败，请重试', 'error')
    }
  } catch (error) {
    console.error('清空所有通知时出错:', error)
    store._showNotification('操作失败，请重试', 'error')
  } finally {
    isLoading.value = false
  }
}

// 查看全部通知
const viewAllNotifications = () => {
  // TODO: 导航到通知页面
  showNotifications.value = false
}

// 定期检查新通知
const startPolling = () => {
  // 每分钟检查一次新通知
  pollingInterval.value = setInterval(async () => {
    if (getToken()) {
      try {
        const response = await fetch('/api/notifications?limit=1&unreadOnly=true', {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          unreadCount.value = data.unreadCount || 0
          
          // 如果有新通知且不是在通知面板中，显示提示
          if (unreadCount.value > 0 && !showNotifications.value) {
            store._showNotification(`您有 ${unreadCount.value} 条未读通知`, 'info')
          }
        }
      } catch (error) {
        console.error('检查新通知时出错:', error)
      }
    }
  }, 60000) // 60秒
}

// 组件挂载时加载通知
onMounted(() => {
  if (getToken()) {
    loadNotifications()
    startPolling()
  }
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
  }
})

// 点击外部关闭通知面板
const handleClickOutside = (event) => {
  const notificationCenter = event.target.closest('.notification-center')
  if (!notificationCenter && showNotifications.value) {
    showNotifications.value = false
  }
}

// 添加点击事件监听器
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

// 移除点击事件监听器
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
