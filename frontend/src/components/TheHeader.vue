<template>
  <header class="navbar bg-base-100 shadow-md px-4 sm:px-6">
    <div class="flex-1">
      <h1 class="text-xl font-semibold text-base-content">{{ i18n.t('appTitle') }}</h1>
    </div>
    <div class="flex-none gap-2">
      <!-- 认证相关按钮 -->
      <div class="mr-2">
        <div v-if="isLoggedIn" class="dropdown dropdown-end">
          <label tabindex="0" class="btn btn-ghost btn-circle avatar">
            <div class="w-10 h-10 rounded-full bg-accent text-accent-content flex items-center justify-center">
              <span class="text-lg font-bold">{{ userInitials }}</span>
            </div>
          </label>
          <ul tabindex="0" class="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
            <li><router-link :to="{ name: 'Profile' }">个人资料</router-link></li>
            <li v-if="isUserAdmin"><router-link :to="{ name: 'Admin' }">管理仪表板</router-link></li>
            <li><a @click="handleLogout">退出登录</a></li>
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
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18nStore } from '@/stores/i18nStore';
import { getCurrentUser, logout, isAdmin, refreshUserInfo } from '@/services/authService';
import ThemeToggle from './ThemeToggle.vue';
import LanguageToggle from './LanguageToggle.vue';

// Router for navigation
const router = useRouter();

// Store 
const i18n = useI18nStore();

// 获取当前登录状态和用户信息
const isLoggedIn = computed(() => {
  return getCurrentUser() !== null;
});

// 检查用户是否为管理员
const isUserAdmin = computed(() => {
  return isAdmin();
});

// 获取用户头像显示的首字母
const userInitials = computed(() => {
  const user = getCurrentUser();
  if (!user) return '';
  
  const username = user.username || '';
  if (username.length > 0) {
    return username.charAt(0).toUpperCase();
  }
  
  const email = user.email || '';
  if (email.length > 0) {
    return email.charAt(0).toUpperCase();
  }
  
  return 'U';
});

// 处理退出登录
const handleLogout = () => {
  logout();
  router.push({ name: 'Login' });
};

// 在组件挂载时刷新用户信息
onMounted(async () => {
  if (isLoggedIn.value) {
    await refreshUserInfo();
  }
});
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

/* 确保用户头像正确居中 */
.avatar .w-10 {
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 480px) {
  header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>