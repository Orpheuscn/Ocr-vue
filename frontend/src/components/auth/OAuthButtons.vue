<template>
  <div class="oauth-buttons">
    <!-- OAuth分隔线 -->
    <div class="divider my-4">或</div>

    <!-- OAuth按钮组 -->
    <div class="space-y-3">
      <!-- Google登录按钮 -->
      <button
        v-if="isOAuthEnabled"
        @click="handleGoogleLogin"
        :disabled="isLoading"
        class="btn btn-outline w-full flex items-center justify-center gap-3 hover:bg-base-200"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span v-if="!isLoading">使用 Google 账号登录</span>
        <span v-else class="loading loading-spinner loading-sm"></span>
      </button>

      <!-- Apple登录按钮 -->
      <button
        v-if="isOAuthEnabled && isAppleSupported"
        @click="handleAppleLogin"
        :disabled="isLoading"
        class="btn btn-outline w-full flex items-center justify-center gap-3 hover:bg-base-200"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
          />
        </svg>
        <span v-if="!isLoading">使用 Apple ID 登录</span>
        <span v-else class="loading loading-spinner loading-sm"></span>
      </button>

      <!-- OAuth不可用提示 -->
      <div v-if="!isOAuthEnabled" class="text-center py-4">
        <div class="text-sm text-base-content/50">第三方登录功能在开发环境中不可用</div>
        <div class="text-xs text-base-content/40 mt-1">生产环境将支持 Google 和 Apple 登录</div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="alert alert-error mt-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{{ errorMessage }}</span>
    </div>

    <!-- 成功提示 -->
    <div v-if="successMessage" class="alert alert-success mt-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{{ successMessage }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'OAuthButtons',
  data() {
    return {
      isLoading: false,
      errorMessage: '',
      successMessage: '',
      isOAuthEnabled: false,
      isAppleSupported: false,
    }
  },
  mounted() {
    this.checkOAuthAvailability()
    this.checkAppleSupport()
    this.handleOAuthCallback()
  },
  methods: {
    async checkOAuthAvailability() {
      try {
        // 导入统一环境检测器
        const { getConfig } = await import('@/utils/environment')
        const apiConfig = getConfig('api')

        // 检查后端健康状态来判断OAuth是否可用
        const response = await fetch(`${apiConfig.baseUrl}/api/health`)

        if (response.ok) {
          const healthData = await response.json()
          // 检查健康检查响应中的OAuth配置信息
          this.isOAuthEnabled = healthData.services?.oauth?.enabled || false
        } else {
          this.isOAuthEnabled = false
        }

        console.log('OAuth可用性检查:', {
          status: response.status,
          enabled: this.isOAuthEnabled,
        })
      } catch (error) {
        console.warn('检查OAuth可用性失败:', error)
        // 发生错误时默认禁用OAuth
        this.isOAuthEnabled = false
      }
    },
    checkAppleSupport() {
      // 检查是否在支持Apple登录的环境中
      // Apple登录主要在iOS Safari和macOS Safari中支持
      const isAppleDevice = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent)
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)

      this.isAppleSupported = isAppleDevice || isSafari
    },
    async handleGoogleLogin() {
      if (!this.isOAuthEnabled) {
        this.errorMessage = 'OAuth功能在当前环境中不可用'
        return
      }

      this.isLoading = true
      this.errorMessage = ''
      this.successMessage = ''

      try {
        // 导入统一环境检测器并重定向到Google OAuth
        const { getConfig } = await import('@/utils/environment')
        const apiConfig = getConfig('api')
        window.location.href = `${apiConfig.baseUrl}/api/auth/google`
      } catch (error) {
        console.error('Google登录错误:', error)
        this.errorMessage = 'Google登录失败，请稍后再试'
        this.isLoading = false
      }
    },
    handleAppleLogin() {
      if (!this.isOAuthEnabled) {
        this.errorMessage = 'OAuth功能在当前环境中不可用'
        return
      }

      this.isLoading = true
      this.errorMessage = ''
      this.successMessage = ''

      try {
        // Apple登录实现（待完成）
        this.errorMessage = 'Apple登录功能正在开发中'
        this.isLoading = false
      } catch (error) {
        console.error('Apple登录错误:', error)
        this.errorMessage = 'Apple登录失败，请稍后再试'
        this.isLoading = false
      }
    },
    handleOAuthCallback() {
      // 检查URL参数，处理OAuth回调
      const urlParams = new URLSearchParams(window.location.search)

      if (urlParams.get('oauth_success') === 'true') {
        this.successMessage = 'OAuth登录成功！'
        // 清除URL参数
        window.history.replaceState({}, document.title, window.location.pathname)

        // 发出登录成功事件
        this.$emit('oauth-success')

        // 3秒后清除成功消息
        setTimeout(() => {
          this.successMessage = ''
        }, 3000)
      } else if (urlParams.get('error')) {
        const error = urlParams.get('error')
        const errorMessages = {
          oauth_error: 'OAuth认证过程中发生错误',
          oauth_failed: 'OAuth认证失败',
          server_error: '服务器错误，请稍后再试',
        }

        this.errorMessage = errorMessages[error] || 'OAuth登录失败'

        // 清除URL参数
        window.history.replaceState({}, document.title, window.location.pathname)

        // 10秒后清除错误消息
        setTimeout(() => {
          this.errorMessage = ''
        }, 10000)
      }
    },
  },
}
</script>

<style scoped>
.oauth-buttons {
  @apply w-full;
}

.divider {
  @apply relative flex items-center justify-center;
}

.divider::before {
  @apply absolute inset-0 flex items-center;
  content: '';
}

.divider::before {
  @apply border-t border-base-300;
}

.divider:not(:empty)::before {
  @apply mr-4;
}

.divider:not(:empty)::after {
  @apply ml-4 border-t border-base-300;
  content: '';
  @apply flex-1;
}
</style>
