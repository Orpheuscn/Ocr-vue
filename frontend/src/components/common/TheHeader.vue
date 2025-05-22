<template>
  <header class="navbar bg-base-100 shadow-md px-4 sm:px-6">
    <div class="flex-1">
      <h1 class="text-xl font-semibold text-base-content">{{ appTitle }}</h1>
    </div>
    <div class="flex-none flex items-center gap-2">
      <!-- 主导航链接 -->
      <div class="hidden sm:flex mr-4">
        <router-link :to="{ name: 'Home' }" class="btn btn-ghost btn-sm mr-2">主页</router-link>
        <router-link :to="{ name: 'DocDetection' }" class="btn btn-ghost btn-sm mr-2"
          >文档解析</router-link
        >
        <router-link :to="{ name: 'ImageRecognition' }" class="btn btn-ghost btn-sm"
          >图像识别</router-link
        >
      </div>

      <!-- 移动设备下拉菜单 -->
      <div class="sm:hidden dropdown dropdown-end mr-2">
        <label tabindex="0" class="btn btn-ghost btn-sm">
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
              d="M4 6h16M4 12h16M4 18h7"
            />
          </svg>
        </label>
        <ul
          tabindex="0"
          class="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52"
        >
          <li><router-link :to="{ name: 'Home' }">主页</router-link></li>
          <li><router-link :to="{ name: 'DocDetection' }">文档解析</router-link></li>
          <li><router-link :to="{ name: 'ImageRecognition' }">图像识别</router-link></li>
        </ul>
      </div>

      <!-- 认证相关按钮 -->
      <div class="mr-2">
        <div v-if="isLoggedIn" class="dropdown dropdown-end">
          <label tabindex="0" class="btn btn-ghost btn-circle">
            <div class="avatar avatar-placeholder avatar-online">
              <div class="w-10 rounded-full bg-accent text-neutral-content grid place-items-center">
                <span class="text-lg font-bold">{{ userInitials }}</span>
              </div>
            </div>
          </label>
          <ul
            tabindex="0"
            class="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52"
          >
            <li><router-link :to="{ name: 'Profile' }">个人资料</router-link></li>
            <!-- 管理功能已移除，改为使用后端API进行管理 -->
          </ul>
        </div>
        <div v-else>
          <router-link :to="{ name: 'Login' }" class="btn btn-sm btn-ghost mr-1">登录</router-link>
          <router-link :to="{ name: 'Register' }" class="btn btn-sm btn-accent">注册</router-link>
        </div>
      </div>

      <LanguageToggle />
      <ThemeToggle />
    </div>
  </header>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'
import { getCurrentUser, isAdmin, refreshUserInfo } from '@/services/authService'
import ThemeToggle from './ThemeToggle.vue'
import LanguageToggle from './LanguageToggle.vue'

// Store
const i18n = useI18nStore()

// 添加对标题的响应式计算，这样当语言变化时，标题会自动更新
const appTitle = computed(() => i18n.t('appTitle'))

// 获取当前登录状态和用户信息
const isLoggedIn = computed(() => {
  return getCurrentUser() !== null
})

// 检查用户是否为管理员
const isUserAdmin = computed(() => {
  return isAdmin()
})

// 获取用户头像显示的首字母
const userInitials = computed(() => {
  const user = getCurrentUser()
  if (!user) return ''

  const username = user.username || ''
  if (username.length > 0) {
    return username.charAt(0).toUpperCase()
  }

  const email = user.email || ''
  if (email.length > 0) {
    return email.charAt(0).toUpperCase()
  }

  return 'U'
})

// 在组件挂载时刷新用户信息
onMounted(async () => {
  if (isLoggedIn.value) {
    await refreshUserInfo()
  }
})

// 监听语言变化
watch(
  () => i18n.currentLang.value,
  () => {
    // 当语言变化时，标题等会自动通过计算属性更新
  },
)
</script>

<style scoped>
/* 暗色模式和亮色模式共用样式 */
header {
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap; /* Allow wrapping */
  gap: 1rem; /* Add gap for wrapping */
}

h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0; /* Reset margin */
}

/* 确保右侧元素正确对齐 */
.flex-none {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 调整头像按钮样式 */
.btn-circle .avatar {
  height: 100%;
  width: 100%;
}

@media (max-width: 480px) {
  header {
    flex-direction: column;
    align-items: flex-start;
  }

  .flex-none {
    margin-top: 0.5rem;
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
