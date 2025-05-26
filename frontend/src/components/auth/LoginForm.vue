<template>
  <div class="w-full max-w-md mx-auto">
    <h2 class="text-2xl font-bold mb-6 text-center text-base-content">登录</h2>

    <div v-if="errorMessage" class="alert alert-error mb-4">
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

    <div v-if="successMessage" class="alert alert-success mb-4">
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

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div class="form-control">
        <label for="email" class="label">
          <span class="label-text">邮箱</span>
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          class="input input-bordered w-full"
          placeholder="请输入邮箱"
        />
      </div>

      <div class="form-control">
        <label for="password" class="label">
          <span class="label-text">密码</span>
        </label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          class="input input-bordered w-full"
          placeholder="请输入密码"
        />
      </div>

      <div class="flex items-center justify-between mt-2">
        <div class="form-control">
          <label class="label cursor-pointer">
            <input type="checkbox" v-model="rememberMe" class="checkbox checkbox-accent" />
            <span class="label-text ml-2">记住我</span>
          </label>
        </div>

        <div class="text-sm">
          <router-link :to="{ name: 'PasswordReset' }" class="link link-accent">忘记密码?</router-link>
        </div>
      </div>

      <div class="mt-4">
        <button type="submit" :disabled="isLoading" class="btn btn-accent w-full">
          <span v-if="isLoading">
            <span class="loading loading-spinner"></span>
            登录中...
          </span>
          <span v-else>登录</span>
        </button>
      </div>

      <!-- OAuth登录选项 -->
      <OAuthButtons @oauth-success="handleOAuthSuccess" />

      <div class="text-center mt-4">
        <p class="text-sm text-base-content/70">
          还没有账号?
          <router-link :to="{ name: 'Register' }" class="link link-accent"> 立即注册 </router-link>
        </p>
      </div>
    </form>
  </div>
</template>

<script>
import { login } from '@/services/authService'
import OAuthButtons from './OAuthButtons.vue'

export default {
  name: 'LoginForm',
  components: {
    OAuthButtons
  },
  data() {
    return {
      email: '',
      password: '',
      rememberMe: false,
      errorMessage: '',
      successMessage: '',
      isLoading: false,
    }
  },
  created() {
    // 检查URL参数，判断是否从注册页面跳转而来
    if (this.$route.query.registered === 'true') {
      this.successMessage = '注册成功！请使用您的账号和密码登录。'
      // 如果URL中包含email参数，自动填充邮箱字段
      if (this.$route.query.email) {
        this.email = this.$route.query.email
      }
    }
  },
  methods: {
    async handleSubmit() {
      this.errorMessage = ''
      this.successMessage = ''
      this.isLoading = true

      try {
        // 表单验证
        if (!this.email || !this.password) {
          this.errorMessage = '请填写所有必填字段'
          this.isLoading = false
          return
        }

        // 使用authService中的login函数
        const credentials = {
          email: this.email,
          password: this.password,
        }

        const data = await login(credentials, this.rememberMe)

        // 登录成功，发出登录成功事件，让父组件处理导航
        this.$emit('login-success', data.data)
      } catch (error) {
        console.error('登录错误:', error)
        this.errorMessage = error.message || '登录失败，请稍后再试'
      } finally {
        this.isLoading = false
      }
    },
    handleOAuthSuccess() {
      // OAuth登录成功，发出事件
      this.$emit('oauth-success')
    }
  },
}
</script>
