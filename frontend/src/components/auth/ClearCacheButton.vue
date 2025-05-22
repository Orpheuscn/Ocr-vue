<template>
  <div class="flex flex-col items-center">
    <button @click="clearCache" class="btn btn-warning mb-2">
      清除缓存并重新登录
    </button>
    <p v-if="message" :class="{'text-success': success, 'text-error': !success}" class="text-sm">
      {{ message }}
    </p>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { clearAllStorages } from '@/services/tokenService'

export default {
  name: 'ClearCacheButton',
  setup() {
    const router = useRouter()
    const message = ref('')
    const success = ref(false)

    const clearCache = () => {
      try {
        // 清除所有存储
        clearAllStorages()
        
        // 显示成功消息
        message.value = '缓存已清除，即将重定向到登录页面...'
        success.value = true
        
        // 延迟重定向到登录页面
        setTimeout(() => {
          router.push({ name: 'Login' })
        }, 1500)
      } catch (error) {
        console.error('清除缓存时出错:', error)
        message.value = '清除缓存失败，请手动清除浏览器缓存'
        success.value = false
      }
    }

    return {
      clearCache,
      message,
      success
    }
  }
}
</script>
