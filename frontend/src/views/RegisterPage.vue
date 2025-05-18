<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="w-full max-w-7xl">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-extrabold text-base-content">{{ appTitle }}</h1>
        <p class="mt-2 text-sm text-base-content/70">
          创建新账户
        </p>
      </div>
      
      <div class="flex flex-col md:flex-row items-center">
        <!-- 左侧图片对比区域 -->
        <div class="md:w-3/5 p-4">
          <h2 class="text-xl font-bold mb-4 text-center">智能 OCR 识别效果对比</h2>
          <figure class="diff aspect-[16/9] rounded-lg overflow-hidden shadow-lg" tabindex="0">
            <div class="diff-item-1" role="img" tabindex="0">
              <img alt="原始文档图片" src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a.webp" />
            </div>
            <div class="diff-item-2" role="img">
              <img alt="OCR识别结果" src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a-blur.webp" />
            </div>
            <div class="diff-resizer"></div>
          </figure>
          <p class="text-sm mt-4 text-center">左右滑动查看原始图片与识别效果</p>
        </div>
        
        <!-- 右侧注册表单 -->
        <div class="md:w-2/5 md:pl-8">
          <div class="card bg-base-100 shadow-xl max-w-md mx-auto w-full">
            <div class="card-body">
              <div class="tabs w-full mb-4">
                <router-link 
                  :to="{ name: 'Login' }"
                  class="tab tab-lifted flex-1"
                >
                  登录
                </router-link>
                <router-link 
                  :to="{ name: 'Register' }"
                  class="tab tab-lifted flex-1 tab-active"
                >
                  注册
                </router-link>
              </div>
              
              <RegisterForm @register-success="handleAuthSuccess"></RegisterForm>
              
              <div class="mt-4 text-center">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import ThemeToggle from '@/components/ThemeToggle.vue';
import RegisterForm from '@/components/auth/RegisterForm.vue';

const router = useRouter();
const appTitle = '智能OCR识别系统';

const handleAuthSuccess = () => {
  // 处理注册成功事件，不需要立即跳转，因为RegisterForm会自动处理跳转
};
</script> 