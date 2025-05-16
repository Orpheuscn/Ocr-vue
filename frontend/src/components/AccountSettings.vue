<template>
  <div class="account-settings">
    <h2>账户设置</h2>
    
    <div class="settings-section">
      <h3>个人信息</h3>
      <div class="form-group">
        <label for="username">用户名</label>
        <input 
          type="text" 
          id="username" 
          v-model="userProfile.username" 
          @change="handleDataChange"
        />
      </div>
      
      <div class="form-group">
        <label for="email">电子邮箱</label>
        <input 
          type="email" 
          id="email" 
          v-model="userProfile.email" 
          @change="handleDataChange"
        />
      </div>
      
      <div class="actions">
        <button 
          class="btn btn-primary" 
          @click="saveChanges" 
          :disabled="!hasChanges || isSaving"
        >
          {{ isSaving ? '保存中...' : '保存更改' }}
        </button>
      </div>
    </div>
    
    <div class="settings-section danger-zone">
      <h3>危险区域</h3>
      <p class="warning-text">注销账户后，您的所有数据将被标记为删除，此操作无法撤销。</p>
      
      <button 
        class="btn btn-danger" 
        @click="showDeactivateModal = true"
      >
        注销我的账户
      </button>
    </div>
    
    <!-- 注销确认对话框 -->
    <div v-if="showDeactivateModal" class="modal-overlay">
      <div class="modal-content">
        <h3>确定要注销您的账户吗？</h3>
        <p>此操作将会删除您的账户和所有相关数据，操作无法撤销。</p>
        
        <div class="confirm-password">
          <label for="confirm-password">请输入您的密码以确认：</label>
          <input 
            type="password" 
            id="confirm-password" 
            v-model="confirmPassword" 
            placeholder="输入密码确认"
          />
        </div>
        
        <div class="modal-actions">
          <button 
            class="btn btn-secondary" 
            @click="showDeactivateModal = false"
          >
            取消
          </button>
          
          <button 
            class="btn btn-danger" 
            @click="deactivateAccount"
            :disabled="!confirmPassword || isDeactivating"
          >
            {{ isDeactivating ? '处理中...' : '确认注销账户' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- 全局提示消息 -->
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import * as authService from '../services/authService.js';

export default {
  name: 'AccountSettings',
  
  setup() {
    const router = useRouter();
    const originalUserData = ref({});
    const userProfile = reactive({
      username: '',
      email: ''
    });
    const isSaving = ref(false);
    const isDeactivating = ref(false);
    const message = ref('');
    const messageType = ref('');
    const showDeactivateModal = ref(false);
    const confirmPassword = ref('');

    // 检查表单是否有变化
    const hasChanges = computed(() => {
      return userProfile.username !== originalUserData.value.username ||
             userProfile.email !== originalUserData.value.email;
    });

    // 加载用户数据
    const loadUserData = async () => {
      try {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
          router.push('/login');
          return;
        }

        const userData = await authService.getUserProfile(currentUser.id);
        
        // 设置表单数据
        userProfile.username = userData.username;
        userProfile.email = userData.email;
        
        // 保存原始数据用于比较
        originalUserData.value = {
          username: userData.username,
          email: userData.email
        };
      } catch (error) {
        showMessage('加载用户数据失败: ' + error.message, 'error');
      }
    };

    // 保存更改
    const saveChanges = async () => {
      if (!hasChanges.value) return;
      
      try {
        isSaving.value = true;
        const currentUser = authService.getCurrentUser();
        
        await authService.updateUserProfile(currentUser.id, {
          username: userProfile.username,
          email: userProfile.email
        });
        
        // 更新原始数据
        originalUserData.value = {
          username: userProfile.username,
          email: userProfile.email
        };
        
        showMessage('个人信息已更新', 'success');
      } catch (error) {
        showMessage('更新失败: ' + error.message, 'error');
      } finally {
        isSaving.value = false;
      }
    };

    // 注销账户
    const deactivateAccount = async () => {
      if (!confirmPassword.value) {
        showMessage('请输入密码确认', 'error');
        return;
      }
      
      try {
        isDeactivating.value = true;
        const currentUser = authService.getCurrentUser();
        
        await authService.deactivateAccount(currentUser.id);
        
        // 提示用户
        showMessage('您的账户已成功注销', 'success');
        
        // 关闭模态框
        showDeactivateModal.value = false;
        
        // 重定向到登录页
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } catch (error) {
        showMessage('注销账户失败: ' + error.message, 'error');
      } finally {
        isDeactivating.value = false;
        confirmPassword.value = '';
      }
    };

    // 显示消息
    const showMessage = (msg, type = 'info') => {
      message.value = msg;
      messageType.value = type;
      
      // 3秒后自动清除消息
      setTimeout(() => {
        message.value = '';
      }, 3000);
    };

    // 处理数据变更
    const handleDataChange = () => {
      // 这里仅用于触发computed计算
    };

    onMounted(() => {
      loadUserData();
    });

    return {
      userProfile,
      hasChanges,
      isSaving,
      isDeactivating,
      saveChanges,
      deactivateAccount,
      message,
      messageType,
      showDeactivateModal,
      confirmPassword,
      handleDataChange
    };
  }
};
</script>

<style scoped>
.account-settings {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.settings-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn {
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  font-size: 16px;
  font-weight: 500;
}

.btn-primary {
  background-color: #4caf50;
  color: white;
}

.btn-primary:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #f5f5f5;
  color: #333;
  margin-right: 10px;
}

.btn-danger {
  background-color: #f44336;
  color: white;
}

.btn-danger:disabled {
  background-color: #e57373;
  cursor: not-allowed;
}

.danger-zone {
  border-left: 4px solid #f44336;
}

.warning-text {
  color: #d32f2f;
  margin-bottom: 20px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
}

.confirm-password {
  margin: 20px 0;
}

.confirm-password label {
  display: block;
  margin-bottom: 10px;
}

.confirm-password input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.message {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1001;
}

.message.success {
  background-color: #4caf50;
}

.message.error {
  background-color: #f44336;
}

.message.info {
  background-color: #2196f3;
}
</style> 