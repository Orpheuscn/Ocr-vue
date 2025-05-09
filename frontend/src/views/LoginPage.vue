<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-extrabold text-base-content">{{ appTitle }}</h1>
        <p class="mt-2 text-sm text-base-content/70">
          登录您的账户
        </p>
      </div>
      
      <div class="mt-8 card bg-base-100 shadow-xl">
        <div class="tabs w-full">
          <router-link 
            :to="{ name: 'Login' }"
            class="tab tab-lifted flex-1 tab-active"
          >
            登录
          </router-link>
          <router-link 
            :to="{ name: 'Register' }"
            class="tab tab-lifted flex-1"
          >
            注册
          </router-link>
        </div>
        
        <div class="card-body p-4">
          <LoginForm @login-success="handleAuthSuccess"></LoginForm>
        </div>
      </div>
      
      <div class="mt-4 text-center">
        <ThemeToggle />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router';
import ThemeToggle from '@/components/ThemeToggle.vue';
import LoginForm from '@/components/auth/LoginForm.vue';

const router = useRouter();
const route = useRoute();
const appTitle = '智能OCR识别系统';

const handleAuthSuccess = () => {
  // 如果有重定向参数，则重定向到指定路径，否则去首页
  const redirectPath = route.query.redirect || { name: 'Home' };
  router.push(redirectPath);
};
</script> 