<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <!-- 标题 -->
          <h1 class="text-2xl font-bold text-center mb-6">
            <span v-if="step === 'request'">重置密码</span>
            <span v-else-if="step === 'reset'">设置新密码</span>
            <span v-else>密码重置完成</span>
          </h1>

          <!-- 步骤1: 请求密码重置 -->
          <form v-if="step === 'request'" @submit.prevent="handleRequestReset" class="space-y-4">
            <div class="text-center mb-4">
              <p class="text-base-content/70">
                请输入您的邮箱地址，我们将发送密码重置链接到您的邮箱。
              </p>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">邮箱地址</span>
              </label>
              <input
                v-model="email"
                type="email"
                placeholder="请输入您的邮箱地址"
                class="input input-bordered w-full"
                :class="{ 'input-error': errorMessage }"
                required
              />
            </div>

            <div v-if="errorMessage" class="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ errorMessage }}</span>
            </div>

            <div v-if="successMessage" class="alert alert-success">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ successMessage }}</span>
            </div>

            <button
              type="submit"
              :disabled="isLoading || !email"
              class="btn btn-primary w-full"
            >
              <span v-if="isLoading">
                <span class="loading loading-spinner loading-sm"></span>
                发送中...
              </span>
              <span v-else>发送重置链接</span>
            </button>

            <div class="text-center">
              <router-link :to="{ name: 'Login' }" class="link link-accent">
                返回登录页面
              </router-link>
            </div>
          </form>

          <!-- 步骤2: 重置密码 -->
          <form v-else-if="step === 'reset'" @submit.prevent="handlePasswordReset" class="space-y-4">
            <div class="text-center mb-4">
              <p class="text-base-content/70">
                请设置您的新密码
              </p>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">新密码</span>
              </label>
              <input
                v-model="newPassword"
                type="password"
                placeholder="请输入新密码"
                class="input input-bordered w-full"
                :class="{ 'input-error': !passwordValidation.isValid && newPassword }"
                required
              />
              <!-- 密码强度指示器 -->
              <PasswordStrengthIndicator 
                :password="newPassword"
                :is-production="isProduction"
                @validation-change="handlePasswordValidation"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">确认新密码</span>
              </label>
              <input
                v-model="confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
                class="input input-bordered w-full"
                :class="{ 'input-error': confirmPassword && newPassword !== confirmPassword }"
                required
              />
              <label v-if="confirmPassword && newPassword !== confirmPassword" class="label">
                <span class="label-text-alt text-error">两次输入的密码不一致</span>
              </label>
            </div>

            <div v-if="errorMessage" class="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ errorMessage }}</span>
            </div>

            <button
              type="submit"
              :disabled="isLoading || !canResetPassword"
              class="btn btn-primary w-full"
            >
              <span v-if="isLoading">
                <span class="loading loading-spinner loading-sm"></span>
                重置中...
              </span>
              <span v-else>重置密码</span>
            </button>
          </form>

          <!-- 步骤3: 重置完成 -->
          <div v-else class="text-center space-y-4">
            <div class="mx-auto mb-4">
              <svg class="w-16 h-16 text-success mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div class="alert alert-success">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ successMessage || '密码重置成功！请使用新密码登录。' }}</span>
            </div>

            <button
              @click="goToLogin"
              class="btn btn-primary w-full"
            >
              前往登录
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PasswordStrengthIndicator from '@/components/auth/PasswordStrengthIndicator.vue'

export default {
  name: 'PasswordResetPage',
  components: {
    PasswordStrengthIndicator
  },
  data() {
    return {
      step: 'request', // request, reset, complete
      email: '',
      newPassword: '',
      confirmPassword: '',
      token: '',
      errorMessage: '',
      successMessage: '',
      isLoading: false,
      passwordValidation: {
        isValid: false,
        score: 0,
        strength: 'very_weak',
        errors: [],
        tips: []
      }
    }
  },
  computed: {
    isProduction() {
      return process.env.NODE_ENV === 'production'
    },
    canResetPassword() {
      return this.newPassword && 
             this.confirmPassword && 
             this.newPassword === this.confirmPassword &&
             this.passwordValidation.isValid
    }
  },
  mounted() {
    this.checkResetToken()
  },
  methods: {
    checkResetToken() {
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')
      const email = urlParams.get('email')

      if (token && email) {
        this.step = 'reset'
        this.token = token
        this.email = email
      }
    },
    async handleRequestReset() {
      this.errorMessage = ''
      this.successMessage = ''
      this.isLoading = true

      try {
        if (!this.email) {
          this.errorMessage = '请输入邮箱地址'
          return
        }

        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: this.email })
        })

        const data = await response.json()

        if (data.success) {
          this.successMessage = data.message || '密码重置链接已发送到您的邮箱，请检查邮箱。'
        } else {
          this.errorMessage = data.message || '发送失败，请稍后再试'
        }
      } catch (error) {
        console.error('请求密码重置错误:', error)
        this.errorMessage = '发送失败，请稍后再试'
      } finally {
        this.isLoading = false
      }
    },
    async handlePasswordReset() {
      this.errorMessage = ''
      this.successMessage = ''
      this.isLoading = true

      try {
        if (!this.newPassword || !this.confirmPassword) {
          this.errorMessage = '请填写所有字段'
          return
        }

        if (this.newPassword !== this.confirmPassword) {
          this.errorMessage = '两次输入的密码不一致'
          return
        }

        if (!this.passwordValidation.isValid) {
          this.errorMessage = this.passwordValidation.errors.join(', ') || '密码不符合要求'
          return
        }

        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: this.email,
            token: this.token,
            password: this.newPassword
          })
        })

        const data = await response.json()

        if (data.success) {
          this.step = 'complete'
          this.successMessage = data.message
        } else {
          this.errorMessage = data.message || '密码重置失败，请稍后再试'
        }
      } catch (error) {
        console.error('密码重置错误:', error)
        this.errorMessage = '密码重置失败，请稍后再试'
      } finally {
        this.isLoading = false
      }
    },
    handlePasswordValidation(validation) {
      this.passwordValidation = validation
    },
    goToLogin() {
      this.$router.push({ name: 'Login' })
    }
  }
}
</script>
