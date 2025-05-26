<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body text-center">
          <!-- 图标 -->
          <div class="mx-auto mb-4">
            <svg v-if="verificationStatus === 'verifying'" class="w-16 h-16 text-info animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else-if="verificationStatus === 'success'" class="w-16 h-16 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else-if="verificationStatus === 'error'" class="w-16 h-16 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else class="w-16 h-16 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <!-- 标题 -->
          <h1 class="text-2xl font-bold mb-4">
            <span v-if="verificationStatus === 'verifying'">正在验证邮箱...</span>
            <span v-else-if="verificationStatus === 'success'">邮箱验证成功！</span>
            <span v-else-if="verificationStatus === 'error'">邮箱验证失败</span>
            <span v-else>邮箱验证</span>
          </h1>

          <!-- 消息 -->
          <div class="mb-6">
            <p v-if="verificationStatus === 'verifying'" class="text-base-content/70">
              请稍候，我们正在验证您的邮箱地址...
            </p>
            <p v-else-if="verificationStatus === 'success'" class="text-success">
              {{ message || '您的邮箱已成功验证！现在您可以正常使用所有功能。' }}
            </p>
            <p v-else-if="verificationStatus === 'error'" class="text-error">
              {{ message || '验证链接无效或已过期，请重新发送验证邮件。' }}
            </p>
            <p v-else class="text-base-content/70">
              请检查您的邮箱并点击验证链接。
            </p>
          </div>

          <!-- 操作按钮 -->
          <div class="space-y-3">
            <button 
              v-if="verificationStatus === 'success'"
              @click="goToLogin"
              class="btn btn-success w-full"
            >
              前往登录
            </button>

            <button 
              v-if="verificationStatus === 'error'"
              @click="resendVerification"
              :disabled="isResending"
              class="btn btn-warning w-full"
            >
              <span v-if="isResending">
                <span class="loading loading-spinner loading-sm"></span>
                重新发送中...
              </span>
              <span v-else>重新发送验证邮件</span>
            </button>

            <button 
              v-if="verificationStatus !== 'verifying'"
              @click="goToLogin"
              class="btn btn-outline w-full"
            >
              返回登录页面
            </button>
          </div>

          <!-- 重新发送验证邮件表单 -->
          <div v-if="showResendForm" class="mt-6 p-4 bg-base-200 rounded-lg">
            <h3 class="text-lg font-semibold mb-3">重新发送验证邮件</h3>
            <div class="form-control">
              <label class="label">
                <span class="label-text">邮箱地址</span>
              </label>
              <input
                v-model="resendEmail"
                type="email"
                placeholder="请输入您的邮箱地址"
                class="input input-bordered w-full"
                :class="{ 'input-error': resendError }"
              />
              <label v-if="resendError" class="label">
                <span class="label-text-alt text-error">{{ resendError }}</span>
              </label>
            </div>
            <div class="mt-4 space-y-2">
              <button
                @click="handleResendVerification"
                :disabled="isResending || !resendEmail"
                class="btn btn-primary w-full"
              >
                <span v-if="isResending">
                  <span class="loading loading-spinner loading-sm"></span>
                  发送中...
                </span>
                <span v-else>发送验证邮件</span>
              </button>
              <button
                @click="showResendForm = false"
                class="btn btn-ghost w-full"
              >
                取消
              </button>
            </div>
          </div>

          <!-- 成功发送提示 -->
          <div v-if="resendSuccess" class="alert alert-success mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>验证邮件已重新发送，请检查您的邮箱。</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EmailVerificationPage',
  data() {
    return {
      verificationStatus: 'pending', // pending, verifying, success, error
      message: '',
      isResending: false,
      showResendForm: false,
      resendEmail: '',
      resendError: '',
      resendSuccess: false
    }
  },
  mounted() {
    this.handleVerification()
  },
  methods: {
    async handleVerification() {
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')
      const email = urlParams.get('email')

      if (!token || !email) {
        this.verificationStatus = 'error'
        this.message = '验证链接格式不正确'
        this.resendEmail = email || ''
        return
      }

      this.verificationStatus = 'verifying'

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, token })
        })

        const data = await response.json()

        if (data.success) {
          this.verificationStatus = 'success'
          this.message = data.message
        } else {
          this.verificationStatus = 'error'
          this.message = data.message
          this.resendEmail = email
        }
      } catch (error) {
        console.error('邮箱验证错误:', error)
        this.verificationStatus = 'error'
        this.message = '验证过程中发生错误，请稍后再试'
        this.resendEmail = email
      }
    },
    async resendVerification() {
      this.showResendForm = true
      this.resendEmail = new URLSearchParams(window.location.search).get('email') || ''
    },
    async handleResendVerification() {
      if (!this.resendEmail) {
        this.resendError = '请输入邮箱地址'
        return
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.resendEmail)) {
        this.resendError = '请输入有效的邮箱地址'
        return
      }

      this.isResending = true
      this.resendError = ''
      this.resendSuccess = false

      try {
        const response = await fetch('/api/auth/resend-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: this.resendEmail })
        })

        const data = await response.json()

        if (data.success) {
          this.resendSuccess = true
          this.showResendForm = false
          
          // 3秒后清除成功消息
          setTimeout(() => {
            this.resendSuccess = false
          }, 3000)
        } else {
          this.resendError = data.message || '发送失败，请稍后再试'
        }
      } catch (error) {
        console.error('重新发送验证邮件错误:', error)
        this.resendError = '发送失败，请稍后再试'
      } finally {
        this.isResending = false
      }
    },
    goToLogin() {
      this.$router.push({ name: 'Login' })
    }
  }
}
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
