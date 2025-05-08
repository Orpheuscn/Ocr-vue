<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-extrabold text-base-content">{{ appTitle }}</h1>
        <p class="mt-2 text-sm text-base-content/70">
          {{ isLoginRoute ? '登录您的账户' : '创建新账户' }}
        </p>
      </div>
      
      <div class="mt-8 card bg-base-100 shadow-xl">
        <div class="tabs w-full">
          <router-link 
            :to="{ name: 'Login' }"
            class="tab tab-lifted flex-1"
            :class="isLoginRoute ? 'tab-active' : ''"
          >
            登录
          </router-link>
          <router-link 
            :to="{ name: 'Register' }"
            class="tab tab-lifted flex-1"
            :class="!isLoginRoute ? 'tab-active' : ''"
          >
            注册
          </router-link>
        </div>
        
        <div class="card-body p-4">
          <router-view 
            @login-success="handleAuthSuccess" 
            @register-success="handleAuthSuccess">
          </router-view>
        </div>
      </div>
      
      <div class="mt-4 text-center">
        <ThemeToggle />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import ThemeToggle from '@/components/ThemeToggle.vue';

const router = useRouter();
const appTitle = '智能OCR识别系统';

const isLoginRoute = computed(() => {
  return router.currentRoute.value.name === 'Login';
});

const handleAuthSuccess = () => {
  // 认证成功后重定向到首页
  router.push({ name: 'Home' });
};
</script> 