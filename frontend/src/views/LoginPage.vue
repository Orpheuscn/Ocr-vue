<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="w-full max-w-7xl">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-extrabold text-base-content">{{ appTitle }}</h1>
      </div>

      <div class="flex flex-col md:flex-row items-center">
        <!-- 左侧图片对比区域 -->
        <div class="md:w-3/5 p-4">
          <h2 class="text-xl font-bold mb-4 text-center">OCR效果对比</h2>
          <figure class="diff aspect-[16/9] rounded-lg overflow-hidden shadow-lg" tabindex="0">
            <div class="diff-item-1" role="img" tabindex="0">
              <img alt="原始文档图片" src="/img/original-doc.jpg" />
            </div>
            <div class="diff-item-2" role="img">
              <img alt="OCR识别结果" src="/img/ocr-result.jpg" />
            </div>
            <div class="diff-resizer"></div>
          </figure>
        </div>

        <!-- 右侧登录表单 -->
        <div class="md:w-2/5 md:pl-8">
          <div class="card bg-base-100 shadow-xl max-w-md mx-auto w-full">
            <div class="card-body">
              <div class="tabs w-full mb-4">
                <router-link :to="{ name: 'Login' }" class="tab tab-lifted flex-1 tab-active">
                  登录
                </router-link>
                <router-link :to="{ name: 'Register' }" class="tab tab-lifted flex-1">
                  注册
                </router-link>
              </div>

              <LoginForm @login-success="handleAuthSuccess"></LoginForm>

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
import { useRouter, useRoute } from 'vue-router'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import LoginForm from '@/components/auth/LoginForm.vue'

const router = useRouter()
const route = useRoute()
const appTitle = '智能OCR识别系统'

const handleAuthSuccess = () => {
  // 如果有重定向参数，则重定向到指定路径，否则去首页
  const redirectPath = route.query.redirect || { name: 'Home' }
  router.push(redirectPath)
}
</script>
