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
            <div class="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
              <span class="text-lg font-bold">{{ userInitials }}</span>
            </div>
          </label>
          <ul tabindex="0" class="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
            <li><router-link :to="{ name: 'Profile' }">个人资料</router-link></li>
            <li><a @click="handleLogout">退出登录</a></li>
          </ul>
        </div>
        <div v-else>
          <router-link :to="{ name: 'Login' }" class="btn btn-sm btn-ghost mr-1">登录</router-link>
          <router-link :to="{ name: 'Register' }" class="btn btn-sm btn-primary">注册</router-link>
        </div>
      </div>

      <LanguageToggle />
      <ThemeToggle />
      <button 
        class="btn btn-sm btn-accent" 
        @click="emitToggle">
        {{ store.showApiSettings ? i18n.t('hideSettings') : i18n.t('settings') }} {{ i18n.t('api') }}
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useOcrStore } from '@/stores/ocrStore';
import { useI18nStore } from '@/stores/i18nStore';
import { getCurrentUser, logout } from '@/services/authService';
import ThemeToggle from './ThemeToggle.vue';
import LanguageToggle from './LanguageToggle.vue';

// Define emits if toggling is handled by parent via event
const emit = defineEmits(['toggle-api']);

// Router for navigation
const router = useRouter();

// Or directly call the store action (simpler if store is used everywhere)
const store = useOcrStore();
const i18n = useI18nStore();
const emitToggle = () => {
  emit('toggle-api'); // 发出事件给父组件
};

// 获取当前登录状态和用户信息
const isLoggedIn = computed(() => {
  return getCurrentUser() !== null;
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

.toggle-button {
  background-color: transparent;
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s, color 0.3s;
  white-space: nowrap;
}

.toggle-button:hover {
  background-color: var(--secondary-color);
}

@media (max-width: 480px) {
  header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>