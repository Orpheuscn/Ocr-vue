// src/main.js
import './assets/base.css' // Import global styles first
import './assets/index.css' // Import Tailwind CSS

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'

// 导入令牌服务，用于会话恢复
import { getToken, getUserInfo } from './services/tokenService'

import App from './App.vue'

// 创建应用实例
const app = createApp(App)

// 创建并使用 Pinia
const pinia = createPinia()
app.use(pinia)

// 在应用启动时尝试恢复会话
console.log('应用启动，尝试恢复会话...')

// 尝试恢复会话并等待一小段时间
const tryRestoreSession = async () => {
  try {
    // 调用getToken触发会话恢复逻辑
    getToken()

    // 等待一小段时间，让会话恢复完成
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 检查是否恢复成功
    const userInfo = getUserInfo()
    console.log('会话恢复结果:', userInfo ? '成功' : '失败')
  } catch (error) {
    console.error('会话恢复出错:', error)
  } finally {
    // 使用路由
    app.use(router)

    // 挂载应用
    app.mount('#app')
  }
}

// 执行会话恢复
tryRestoreSession()
