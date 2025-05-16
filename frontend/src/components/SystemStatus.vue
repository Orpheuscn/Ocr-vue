<!-- 系统状态组件 - 用于监控和显示后端服务状态 -->
<template>
  <div class="system-status" :class="statusClass">
    <div class="status-indicator" :title="statusTitle">
      <div class="status-dot" :class="statusClass"></div>
      <span class="status-text">{{ statusText }}</span>
    </div>
    
    <div v-if="expanded" class="status-details">
      <div class="status-item">
        <strong>服务器:</strong> {{ status.server ? '在线' : '离线' }}
      </div>
      <div class="status-item">
        <strong>数据库:</strong> {{ status.database ? '已连接' : (initializing ? '正在连接...' : '未连接') }}
      </div>
      <div class="status-item">
        <strong>API:</strong> {{ status.api ? '可用' : '不可用' }}
      </div>
      <div class="status-item">
        <strong>JWT:</strong> {{ status.jwt ? '已配置' : '未配置' }}
      </div>
      <div class="status-actions">
        <button @click="refreshStatus" class="refresh-btn" :disabled="loading">
          {{ loading ? '检查中...' : '刷新状态' }}
        </button>
      </div>
    </div>
    
    <button class="toggle-btn" @click="expanded = !expanded">
      {{ expanded ? '收起' : '展开' }}
    </button>
  </div>
</template>

<script>
export default {
  name: 'SystemStatus',
  
  data() {
    return {
      status: {
        server: false,
        database: false,
        api: false, 
        jwt: false
      },
      loading: false,
      error: null,
      lastCheck: null,
      expanded: false,
      checkInterval: null,
      initializing: true, // 标记系统是否处于初始化状态
      retryTimer: null,
      autoRetryCount: 0
    };
  },
  
  computed: {
    isSystemOnline() {
      return this.status.server && this.status.database && this.status.jwt;
    },
    
    statusClass() {
      if (this.loading) return 'status-loading';
      if (this.error) return 'status-error';
      if (this.initializing) return 'status-initializing';
      return this.isSystemOnline ? 'status-online' : 'status-offline';
    },
    
    statusText() {
      if (this.loading) return '检查中...';
      if (this.error) return '检查失败';
      if (this.initializing) return '初始化中...';
      return this.isSystemOnline ? '系统在线' : '系统离线';
    },
    
    statusTitle() {
      if (this.error) return `检查失败: ${this.error}`;
      if (this.initializing) return '系统正在初始化，请稍候...';
      if (!this.isSystemOnline) {
        const issues = [];
        if (!this.status.server) issues.push('服务器离线');
        if (!this.status.database) issues.push('数据库未连接');
        if (!this.status.jwt) issues.push('JWT未配置');
        if (!this.status.api) issues.push('API不可用');
        return `系统问题: ${issues.join(', ')}`;
      }
      return `系统正常运行，最后检查: ${this.lastCheck}`;
    }
  },
  
  methods: {
    async checkSystemStatus() {
      if (this.loading) return; // 防止重复检查
      
      this.loading = true;
      this.error = null;
      
      // 增加重试机制
      const maxRetries = 3;
      let retryCount = 0;
      let success = false;
      
      while (retryCount < maxRetries && !success) {
        try {
          const response = await fetch('/api/health', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            },
            timeout: 5000
          });
          
          if (!response.ok) {
            throw new Error(`服务器返回错误: ${response.status}`);
          }
          
          const data = await response.json();
          
          // 如果数据库状态曾经是已连接的，就不再显示初始化状态
          if (data.services?.database?.status === 'connected') {
            this.initializing = false;
          }
          
          this.status = {
            server: data.status === 'online',
            database: data.services?.database?.status === 'connected',
            jwt: data.services?.jwt?.configured === true,
            api: data.services?.api?.googleVision === true
          };
          
          this.lastCheck = new Date().toLocaleTimeString();
          success = true;
          this.autoRetryCount = 0; // 重置自动重试计数
        } catch (error) {
          console.error(`系统状态检查失败 (尝试 ${retryCount + 1}/${maxRetries}):`, error);
          
          retryCount++;
          
          if (retryCount === maxRetries) {
            // 所有重试都失败
            this.error = error.message || '无法连接到服务器';
            // 仅在不是初始化阶段时才将状态设置为全部离线
            if (!this.initializing) {
              this.status = {
                server: false,
                database: false,
                jwt: false,
                api: false
              };
            }
            
            // 在初始化阶段，如果连接失败，启动自动重试机制
            if (this.initializing && this.autoRetryCount < 5) {
              this.scheduleAutoRetry();
            }
          }
          
          // 增加重试间隔时间
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }
      
      this.loading = false;
    },
    
    scheduleAutoRetry() {
      // 取消之前的重试计时器
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
      }
      
      // 递增重试间隔（2秒，然后4秒，然后8秒...）
      const retryDelay = Math.min(2000 * Math.pow(2, this.autoRetryCount), 30000);
      this.autoRetryCount++;
      
      console.log(`计划在 ${retryDelay}ms 后自动重试连接检查 (第 ${this.autoRetryCount} 次)`);
      
      this.retryTimer = setTimeout(() => {
        console.log(`执行自动重试连接检查 (第 ${this.autoRetryCount} 次)`);
        this.checkSystemStatus();
      }, retryDelay);
    },
    
    refreshStatus() {
      // 取消任何待处理的自动重试
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      
      this.checkSystemStatus();
    },
    
    startPolling() {
      // 每60秒检查一次系统状态
      this.checkInterval = setInterval(() => {
        this.checkSystemStatus();
      }, 60000);
    },
    
    stopPolling() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
      
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
    }
  },
  
  mounted() {
    // 延迟初始检查，给后端一些时间初始化
    setTimeout(() => {
      this.checkSystemStatus();
      this.startPolling();
    }, 3000);
  },
  
  beforeUnmount() {
    this.stopPolling();
  }
};
</script>

<style scoped>
.system-status {
  position: relative;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  margin: 8px 0;
  transition: all 0.3s ease;
  max-width: 300px;
}

.status-indicator {
  display: flex;
  align-items: center;
  margin-right: 12px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
}

.status-online .status-dot {
  background-color: #4caf50;
  box-shadow: 0 0 4px 2px rgba(76, 175, 80, 0.3);
}

.status-offline .status-dot {
  background-color: #f44336;
  box-shadow: 0 0 4px 2px rgba(244, 67, 54, 0.3);
}

.status-loading .status-dot {
  background-color: #ff9800;
  box-shadow: 0 0 4px 2px rgba(255, 152, 0, 0.3);
  animation: pulse 1.5s infinite;
}

.status-initializing .status-dot {
  background-color: #2196f3;
  box-shadow: 0 0 4px 2px rgba(33, 150, 243, 0.3);
  animation: pulse 1.5s infinite;
}

.status-error .status-dot {
  background-color: #9e9e9e;
  box-shadow: 0 0 4px 2px rgba(158, 158, 158, 0.3);
}

.status-details {
  border-top: 1px solid #e0e0e0;
  margin-top: 8px;
  padding-top: 8px;
  font-size: 13px;
  width: 100%;
}

.status-item {
  margin: 4px 0;
}

.status-actions {
  margin-top: 8px;
}

.refresh-btn {
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.refresh-btn:disabled {
  background-color: #9e9e9e;
  cursor: not-allowed;
}

.toggle-btn {
  border: none;
  background: transparent;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  margin-left: auto;
}

@keyframes pulse {
  0% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.7;
  }
}
</style> 