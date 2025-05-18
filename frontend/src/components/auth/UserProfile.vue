<template>
  <div class="min-h-screen bg-base-200 p-4">
    <div class="container mx-auto">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">用户资料</h2>

          <div v-if="loading" class="flex justify-center my-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <div v-else-if="error" class="alert alert-error">
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
            <span>{{ error }}</span>
          </div>

          <div v-else>
            <div v-if="isEditing">
              <!-- 编辑表单 -->
              <form @submit.prevent="handleUpdateProfile" class="space-y-4">
                <div class="form-control">
                  <label for="username" class="label">
                    <span class="label-text">用户名</span>
                  </label>
                  <input
                    id="username"
                    v-model="formData.username"
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
                    v-model="formData.email"
                    type="email"
                    required
                    disabled
                    class="input input-bordered w-full opacity-70"
                    placeholder="邮箱不可修改"
                  />
                  <p class="text-xs text-base-content/60 mt-1">邮箱地址不可修改</p>
                </div>

                <div class="form-control">
                  <div class="label">
                    <span class="label-text">兴趣标签</span>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <div
                      v-for="(tag, index) in formData.tags"
                      :key="index"
                      class="badge badge-accent badge-lg gap-1"
                    >
                      {{ tag }}
                      <button type="button" @click="removeTag(index)" class="btn btn-xs btn-circle">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke-width="1.5"
                          stroke="currentColor"
                          class="w-4 h-4"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <div class="join">
                      <input
                        type="text"
                        v-model="newTag"
                        class="input input-bordered input-sm join-item"
                        placeholder="添加新标签"
                        @keydown.enter.prevent="addTag"
                      />
                      <button type="button" @click="addTag" class="btn btn-sm btn-accent join-item">
                        添加
                      </button>
                    </div>
                  </div>
                </div>

                <div class="flex justify-end gap-2 mt-4">
                  <button type="button" @click="cancelEdit" class="btn">取消</button>
                  <button type="submit" class="btn btn-accent">保存</button>
                </div>
              </form>
            </div>

            <div v-else>
              <!-- 用户信息展示 -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex items-center gap-4">
                  <div class="avatar placeholder">
                    <div class="bg-accent text-accent-content rounded-full w-16">
                      <span class="text-xl">{{ userInitials }}</span>
                    </div>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold">{{ userData.username }}</h3>
                    <p class="text-base-content/70">{{ userData.email }}</p>
                  </div>
                </div>

                <div class="flex flex-col justify-between">
                  <div>
                    <h4 class="font-semibold mb-2">兴趣标签</h4>
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-for="(tag, index) in userData.tags"
                        :key="index"
                        class="badge badge-accent"
                        >{{ tag }}</span
                      >
                      <span
                        v-if="!userData.tags || userData.tags.length === 0"
                        class="text-base-content/50"
                        >暂无标签</span
                      >
                    </div>
                  </div>

                  <div class="flex justify-end mt-4">
                    <button @click="startEdit" class="btn btn-accent">编辑资料</button>
                  </div>
                </div>
              </div>

              <div class="divider my-6"></div>

              <div>
                <h4 class="font-semibold mb-4">账号信息</h4>
                <div class="stats stats-vertical md:stats-horizontal shadow">
                  <div class="stat">
                    <div class="stat-title">注册时间</div>
                    <div class="stat-value">{{ formatDate(userData.createdAt) }}</div>
                  </div>

                  <div class="stat">
                    <div class="stat-title">上次登录</div>
                    <div class="stat-value">{{ formatDate(userData.lastLogin) }}</div>
                  </div>

                  <div class="stat">
                    <div class="stat-title">已识别图片</div>
                    <div class="stat-value">{{ userData.ocrSummary?.totalPages || 0 }}</div>
                    <div class="stat-desc">包含PDF所有页面</div>
                  </div>
                </div>

                <div class="flex justify-end mt-4">
                  <button @click="loadUserProfile" class="btn btn-sm btn-outline">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="w-4 h-4 mr-1"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                    刷新数据
                  </button>
                </div>
              </div>

              <div class="divider my-6"></div>

              <div class="flex justify-between">
                <div class="flex gap-2">
                  <button @click="confirmLogout" class="btn btn-outline">退出登录</button>
                  <button @click="showDeactivateModal = true" class="btn btn-outline btn-error">
                    注销账户
                  </button>
                </div>
                <button @click="goToHome" class="btn btn-accent">返回主页</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 注销确认对话框 -->
    <div v-if="showDeactivateModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg">确定要注销您的账户吗？</h3>
        <p class="py-4">此操作将会删除您的账户和所有相关数据，操作无法撤销。</p>

        <div class="form-control">
          <label for="confirm-password" class="label">
            <span class="label-text">请输入您的密码以确认：</span>
          </label>
          <input
            type="password"
            id="confirm-password"
            v-model="confirmPassword"
            class="input input-bordered w-full"
            placeholder="输入密码确认"
          />
        </div>

        <div class="modal-action">
          <button class="btn" @click="showDeactivateModal = false">取消</button>

          <button
            class="btn btn-error"
            @click="deactivateAccount"
            :disabled="!confirmPassword || isDeactivating"
          >
            {{ isDeactivating ? '处理中...' : '确认注销账户' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- 退出登录确认提示 -->
    <div v-if="showLogoutAlert" class="toast toast-center">
      <div class="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <div>
          <h3 class="font-bold">确定要退出登录吗？</h3>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-sm" @click="cancelLogout">取消</button>
          <button class="btn btn-sm btn-warning" @click="handleLogout">确认退出</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getCurrentUser,
  logout,
  getUserProfile,
  updateUserProfile,
  deactivateAccount as deactivateUserAccount,
} from '@/services/authService'

export default {
  setup() {
    const router = useRouter()
    const userData = ref({
      username: '',
      email: '',
      createdAt: '',
      lastLogin: '',
      tags: [],
      ocrStats: { totalImages: 0 },
    })
    const formData = ref({
      username: '',
      email: '',
      tags: [],
    })
    const newTag = ref('')
    const isEditing = ref(false)
    const loading = ref(true)
    const error = ref('')

    // 注销账户相关状态
    const showDeactivateModal = ref(false)
    const confirmPassword = ref('')
    const isDeactivating = ref(false)

    // 获取用户头像显示的首字母
    const userInitials = computed(() => {
      if (!userData.value.username) return 'U'
      return userData.value.username.charAt(0).toUpperCase()
    })

    // 加载用户资料
    const loadUserProfile = async () => {
      loading.value = true
      error.value = ''

      try {
        const user = getCurrentUser()
        if (!user) {
          router.push({ name: 'Login' })
          return
        }

        const userId = user.id
        let profileData

        try {
          // 尝试获取完整用户资料
          profileData = await getUserProfile(userId)
        } catch (profileErr) {
          console.error('获取用户资料错误:', profileErr)
          // 如果获取资料失败，使用本地存储的基本信息
          profileData = {
            username: user.username || '用户',
            email: user.email || '',
            createdAt: user.createdAt || new Date().toISOString(),
            lastLogin: user.lastLogin || new Date().toISOString(),
            tags: [],
            ocrStats: { totalImages: 0 },
            ocrSummary: { totalPages: 0, totalRecords: 0 },
          }
          // 显示错误但不阻止页面加载
          error.value = '无法从服务器获取完整用户资料，显示的是基本信息'
        }

        // 更新用户数据
        userData.value = {
          ...profileData,
          tags: profileData.tags || [],
          ocrStats: profileData.ocrStats || { totalImages: 0 },
          ocrSummary: profileData.ocrSummary || { totalPages: 0, totalRecords: 0 },
        }
      } catch (err) {
        console.error('用户资料加载主要错误:', err)
        error.value = '获取用户资料失败，请稍后再试'

        // 尝试使用本地存储的最小信息
        const user = getCurrentUser()
        if (user) {
          userData.value = {
            username: user.username || '用户',
            email: user.email || '',
            createdAt: '',
            lastLogin: '',
            tags: [],
            ocrStats: { totalImages: 0 },
            ocrSummary: { totalPages: 0, totalRecords: 0 },
          }
        }
      } finally {
        loading.value = false
      }
    }

    // 开始编辑
    const startEdit = () => {
      formData.value = {
        username: userData.value.username,
        email: userData.value.email,
        tags: [...userData.value.tags],
      }
      isEditing.value = true
    }

    // 取消编辑
    const cancelEdit = () => {
      isEditing.value = false
    }

    // 添加标签
    const addTag = () => {
      if (newTag.value.trim() && !formData.value.tags.includes(newTag.value.trim())) {
        formData.value.tags.push(newTag.value.trim())
        newTag.value = ''
      }
    }

    // 删除标签
    const removeTag = (index) => {
      formData.value.tags.splice(index, 1)
    }

    // 更新用户资料
    const handleUpdateProfile = async () => {
      loading.value = true
      error.value = ''

      try {
        const user = getCurrentUser()
        if (!user) {
          router.push({ name: 'Login' })
          return
        }

        const userId = user.id

        // 更新用户资料，但不发送邮箱字段
        await updateUserProfile(userId, {
          username: formData.value.username,
          tags: formData.value.tags,
        })

        // 更新本地用户数据
        userData.value = {
          ...userData.value,
          username: formData.value.username,
          tags: formData.value.tags,
        }

        isEditing.value = false
      } catch (err) {
        console.error('更新用户资料错误:', err)
        error.value = '更新用户资料失败，请稍后再试'
      } finally {
        loading.value = false
      }
    }

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '暂无数据'

      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    // 退出登录相关状态
    const showLogoutAlert = ref(false)
    
    // 显示退出登录确认框
    const confirmLogout = () => {
      showLogoutAlert.value = true
    }
    
    // 确认退出登录
    const handleLogout = () => {
      logout()
      showLogoutAlert.value = false
      router.push({ name: 'Login' })
    }
    
    // 取消退出登录
    const cancelLogout = () => {
      showLogoutAlert.value = false
    }

    // 注销账户
    const deactivateAccount = async () => {
      if (!confirmPassword.value) {
        error.value = '请输入密码确认'
        return
      }

      try {
        isDeactivating.value = true
        const user = getCurrentUser()

        await deactivateUserAccount(user.id)

        // 关闭注销模态框
        showDeactivateModal.value = false
        
        // 显示成功提示
        const successMessage = '您的账户已成功注销'
        // 这里我们直接跳转，不显示成功提示，因为用户已经注销

        // 重定向到登录页
        router.push({ name: 'Login' })
      } catch (err) {
        console.error('注销账户错误:', err)
        error.value = '注销账户失败: ' + err.message
      } finally {
        isDeactivating.value = false
        confirmPassword.value = ''
      }
    }

    // 返回主页
    const goToHome = () => {
      router.push({ name: 'Home' })
    }

    onMounted(() => {
      loadUserProfile()
    })

    return {
      userData,
      formData,
      newTag,
      isEditing,
      loading,
      error,
      userInitials,
      startEdit,
      cancelEdit,
      addTag,
      removeTag,
      handleUpdateProfile,
      formatDate,
      confirmLogout,
      cancelLogout,
      handleLogout,
      goToHome,
      loadUserProfile,
      // 退出登录相关
      showLogoutAlert,
      // 注销账户相关
      showDeactivateModal,
      confirmPassword,
      isDeactivating,
      deactivateAccount,
    }
  },
}
</script>
