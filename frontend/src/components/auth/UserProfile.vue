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
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
                    class="input input-bordered w-full"
                    placeholder="请输入邮箱"
                  />
                </div>
                
                <div class="form-control">
                  <div class="label">
                    <span class="label-text">兴趣标签</span>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <div v-for="(tag, index) in formData.tags" :key="index" class="badge badge-primary badge-lg gap-1">
                      {{ tag }}
                      <button type="button" @click="removeTag(index)" class="btn btn-xs btn-circle">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
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
                      <button type="button" @click="addTag" class="btn btn-sm btn-primary join-item">添加</button>
                    </div>
                  </div>
                </div>
                
                <div class="flex justify-end gap-2 mt-4">
                  <button type="button" @click="cancelEdit" class="btn">取消</button>
                  <button type="submit" class="btn btn-primary">保存</button>
                </div>
              </form>
            </div>
            
            <div v-else>
              <!-- 用户信息展示 -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex items-center gap-4">
                  <div class="avatar placeholder">
                    <div class="bg-primary text-primary-content rounded-full w-16">
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
                      <span v-for="(tag, index) in userData.tags" :key="index" class="badge badge-primary">{{ tag }}</span>
                      <span v-if="!userData.tags || userData.tags.length === 0" class="text-base-content/50">暂无标签</span>
                    </div>
                  </div>
                  
                  <div class="flex justify-end mt-4">
                    <button @click="startEdit" class="btn btn-primary">编辑资料</button>
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
                    <div class="stat-value">{{ userData.ocrStats?.totalImages || 0 }}</div>
                    <div class="stat-desc">包含PDF所有页面</div>
                  </div>
                </div>
                
                <div class="flex justify-end mt-4">
                  <button @click="loadUserProfile" class="btn btn-sm btn-outline">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    刷新数据
                  </button>
                </div>
              </div>
              
              <div class="divider my-6"></div>
              
              <div class="flex justify-between">
                <button @click="confirmLogout" class="btn btn-outline">退出登录</button>
                <button @click="goToHome" class="btn btn-primary">返回主页</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getCurrentUser, logout, getUserProfile, updateUserProfile } from '@/services/authService';

export default {
  setup() {
    const router = useRouter();
    const userData = ref({
      username: '',
      email: '',
      createdAt: '',
      lastLogin: '',
      tags: [],
      ocrStats: { totalImages: 0 }
    });
    const formData = ref({
      username: '',
      email: '',
      tags: []
    });
    const newTag = ref('');
    const isEditing = ref(false);
    const loading = ref(true);
    const error = ref('');
    
    // 获取用户头像显示的首字母
    const userInitials = computed(() => {
      if (!userData.value.username) return 'U';
      return userData.value.username.charAt(0).toUpperCase();
    });
    
    // 加载用户资料
    const loadUserProfile = async () => {
      loading.value = true;
      error.value = '';
      
      try {
        const user = getCurrentUser();
        if (!user) {
          router.push({ name: 'Login' });
          return;
        }
        
        const userId = user.id;
        let profileData;
        
        try {
          // 尝试获取完整用户资料
          profileData = await getUserProfile(userId);
        } catch (profileErr) {
          console.error('获取用户资料错误:', profileErr);
          // 如果获取资料失败，使用本地存储的基本信息
          profileData = {
            username: user.username || '用户',
            email: user.email || '',
            createdAt: user.createdAt || new Date().toISOString(),
            lastLogin: user.lastLogin || new Date().toISOString(),
            tags: [],
            ocrStats: { totalImages: 0 }
          };
          // 显示错误但不阻止页面加载
          error.value = '无法从服务器获取完整用户资料，显示的是基本信息';
        }
        
        // 更新用户数据
        userData.value = {
          ...profileData,
          tags: profileData.tags || [],
          ocrStats: profileData.ocrStats || { totalImages: 0 }
        };
      } catch (err) {
        console.error('用户资料加载主要错误:', err);
        error.value = '获取用户资料失败，请稍后再试';
        
        // 尝试使用本地存储的最小信息
        const user = getCurrentUser();
        if (user) {
          userData.value = {
            username: user.username || '用户',
            email: user.email || '',
            createdAt: '',
            lastLogin: '',
            tags: [],
            ocrStats: { totalImages: 0 }
          };
        }
      } finally {
        loading.value = false;
      }
    };
    
    // 开始编辑
    const startEdit = () => {
      formData.value = {
        username: userData.value.username,
        email: userData.value.email,
        tags: [...userData.value.tags]
      };
      isEditing.value = true;
    };
    
    // 取消编辑
    const cancelEdit = () => {
      isEditing.value = false;
    };
    
    // 添加标签
    const addTag = () => {
      if (newTag.value.trim() && !formData.value.tags.includes(newTag.value.trim())) {
        formData.value.tags.push(newTag.value.trim());
        newTag.value = '';
      }
    };
    
    // 删除标签
    const removeTag = (index) => {
      formData.value.tags.splice(index, 1);
    };
    
    // 更新用户资料
    const handleUpdateProfile = async () => {
      loading.value = true;
      error.value = '';
      
      try {
        const user = getCurrentUser();
        if (!user) {
          router.push({ name: 'Login' });
          return;
        }
        
        const userId = user.id;
        await updateUserProfile(userId, formData.value);
        
        // 更新本地用户数据
        userData.value = {
          ...userData.value,
          ...formData.value
        };
        
        isEditing.value = false;
      } catch (err) {
        console.error('更新用户资料错误:', err);
        error.value = '更新用户资料失败，请稍后再试';
      } finally {
        loading.value = false;
      }
    };
    
    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '暂无数据';
      
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    // 退出登录
    const confirmLogout = () => {
      if (window.confirm('确定要退出登录吗？')) {
        logout();
        router.push({ name: 'Login' });
      }
    };
    
    // 返回主页
    const goToHome = () => {
      router.push({ name: 'Home' });
    };
    
    onMounted(() => {
      loadUserProfile();
    });
    
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
      goToHome,
      loadUserProfile
    };
  }
};
</script> 