<template>
  <div class="w-full max-w-md mx-auto">
    <h2 class="text-2xl font-bold mb-6 text-center text-base-content">注册账号</h2>
    
    <div v-if="errorMessage" class="alert alert-error mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <span>{{ errorMessage }}</span>
    </div>
    
    <div v-if="successMessage" class="alert alert-success mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <span>{{ successMessage }}</span>
    </div>
    
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div class="form-control">
        <label for="username" class="label">
          <span class="label-text">用户名</span>
        </label>
        <input
          id="username"
          v-model="username"
          type="text"
          required
          class="input input-bordered w-full"
          placeholder="请输入用户名"
        />
      </div>
      
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
          placeholder="请输入密码（至少6位）"
          minlength="6"
        />
      </div>
      
      <div class="form-control">
        <label for="confirmPassword" class="label">
          <span class="label-text">确认密码</span>
        </label>
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          type="password"
          required
          class="input input-bordered w-full"
          placeholder="请再次输入密码"
          minlength="6"
        />
      </div>
      
      <div class="form-control mt-4">
        <label class="label cursor-pointer justify-start">
          <input type="checkbox" v-model="agreeTerms" class="checkbox checkbox-primary" />
          <span class="label-text ml-2">我已阅读并同意<a href="#" class="link link-primary">服务条款</a>和<a href="#" class="link link-primary">隐私政策</a></span>
        </label>
      </div>
      
      <div class="mt-4">
        <button
          type="submit"
          :disabled="isLoading || !agreeTerms"
          class="btn btn-primary w-full"
        >
          <span v-if="isLoading">
            <span class="loading loading-spinner"></span>
            注册中...
          </span>
          <span v-else>注册</span>
        </button>
      </div>
      
      <div class="text-center mt-4">
        <p class="text-sm text-base-content/70">
          已有账号? 
          <router-link :to="{ name: 'Login' }" class="link link-primary">
            立即登录
          </router-link>
        </p>
      </div>
    </form>
  </div>
</template>

<script>
export default {
  name: 'RegisterForm',
  data() {
    return {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false,
      errorMessage: '',
      successMessage: '',
      isLoading: false,
      redirectTimer: null
    };
  },
  methods: {
    async handleSubmit() {
      this.errorMessage = '';
      this.successMessage = '';
      this.isLoading = true;
      
      try {
        // 表单验证
        if (!this.username || !this.email || !this.password || !this.confirmPassword) {
          this.errorMessage = '请填写所有必填字段';
          this.isLoading = false;
          return;
        }
        
        if (this.password !== this.confirmPassword) {
          this.errorMessage = '两次输入的密码不一致';
          this.isLoading = false;
          return;
        }
        
        if (this.password.length < 6) {
          this.errorMessage = '密码至少需要6个字符';
          this.isLoading = false;
          return;
        }
        
        if (!this.agreeTerms) {
          this.errorMessage = '请同意服务条款和隐私政策';
          this.isLoading = false;
          return;
        }
        
        // 调用注册 API
        const response = await fetch('/api/users/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: this.username,
            email: this.email,
            password: this.password
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || '注册失败');
        }
        
        // 注册成功，显示成功消息
        this.successMessage = '注册成功！3秒后将跳转到登录页面...';
        
        // 发出注册成功事件
        this.$emit('register-success', { username: this.username, email: this.email });
        
        // 清空表单
        this.username = '';
        this.email = '';
        this.password = '';
        this.confirmPassword = '';
        this.agreeTerms = false;
        
        // 3秒后自动跳转到登录页面
        this.redirectTimer = setTimeout(() => {
          this.$router.push({ name: 'Login', query: { registered: 'true', email: this.email } });
        }, 3000);
      } catch (error) {
        console.error('注册错误:', error);
        this.errorMessage = error.message || '注册失败，请稍后再试';
      } finally {
        this.isLoading = false;
      }
    }
  },
  beforeUnmount() {
    // 清除定时器
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
    }
  }
};
</script> 