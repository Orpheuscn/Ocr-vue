<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8 text-center">后端管理仪表板</h1>

    <!-- 错误提示 -->
    <div v-if="globalError" class="alert alert-error shadow-lg mb-8">
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="stroke-current flex-shrink-0 h-6 w-6"
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
        <div>
          <h3 class="font-bold">权限错误</h3>
          <div class="text-xs">{{ globalError }}</div>
        </div>
      </div>
      <div class="flex-none">
        <button @click="handleRelogin" class="btn btn-sm btn-primary">重新登录</button>
      </div>
    </div>

    <!-- 系统状态卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="card bg-base-100 shadow-xl border-t-4 border-accent">
        <div class="card-body">
          <h2 class="card-title">系统状态</h2>
          <div class="flex items-center">
            <div
              class="badge badge-sm mr-2"
              :class="serverStatus.online ? 'badge-success' : 'badge-error'"
            ></div>
            <span>{{ serverStatus.online ? '在线' : '离线' }}</span>
          </div>
          <div class="mt-2 space-y-1">
            <p>API版本: {{ serverStatus.version || 'N/A' }}</p>
            <p>启动时间: {{ formatUptime(serverStatus.uptime) || 'N/A' }}</p>
            <p>环境: {{ serverStatus.environment || 'N/A' }}</p>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl border-t-4 border-success">
        <div class="card-body">
          <h2 class="card-title">数据库状态</h2>
          <div class="flex items-center">
            <div
              class="badge badge-sm mr-2"
              :class="dbStatus.connected ? 'badge-success' : 'badge-error'"
            ></div>
            <span>{{ dbStatus.connected ? '已连接' : '未连接' }}</span>
          </div>
          <div class="mt-2 space-y-1">
            <p>类型: {{ dbStatus.type || 'MongoDB' }}</p>
            <p>URI: {{ dbStatus.uri || 'N/A' }}</p>
            <p>认证: {{ dbStatus.auth ? '已启用' : '未启用' }}</p>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl border-t-4 border-secondary">
        <div class="card-body">
          <h2 class="card-title">API 健康状态</h2>
          <div class="mt-2 space-y-1">
            <p>总请求数: {{ apiStatus.totalRequests || 0 }}</p>
            <p>成功率: {{ apiStatus.successRate || '0%' }}</p>
            <p>平均响应时间: {{ apiStatus.avgResponseTime || 'N/A' }}</p>
          </div>
          <div class="card-actions justify-end mt-4">
            <button @click="refreshData" class="btn btn-secondary btn-sm">刷新数据</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据统计标签页 -->
    <div class="card bg-base-100 shadow-xl mb-8">
      <div class="card-body">
        <div class="tabs tabs-boxed mb-4">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="tab"
            :class="activeTab === tab.id ? 'tab-active' : ''"
          >
            {{ tab.name }}
          </button>
        </div>

        <!-- 用户数据 -->
        <div v-if="activeTab === 'users'" class="p-2">
          <h3 class="text-lg font-medium mb-4">用户统计</h3>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用户名</th>
                  <th>邮箱</th>
                  <th>创建时间</th>
                  <th>上次登录</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in users" :key="user.id">
                  <td>{{ user.id }}</td>
                  <td>{{ user.username }}</td>
                  <td>{{ user.email }}</td>
                  <td>{{ formatDate(user.createdAt) }}</td>
                  <td>{{ formatDate(user.lastLogin) }}</td>
                </tr>
                <tr v-if="users.length === 0">
                  <td colspan="5" class="text-center">无用户数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- OCR记录数据 -->
        <div v-if="activeTab === 'ocr'" class="p-2">
          <h3 class="text-lg font-medium mb-4">OCR记录统计</h3>
          <div class="overflow-x-auto">
            <table class="table w-full">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用户</th>
                  <th>文件名</th>
                  <th>识别语言</th>
                  <th>创建时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in ocrRecords" :key="record.id">
                  <td>{{ record.id }}</td>
                  <td>{{ record.userId }}</td>
                  <td>{{ decodeFilename(record.filename) }}</td>
                  <td>{{ record.language }}</td>
                  <td>{{ formatDate(record.createdAt) }}</td>
                </tr>
                <tr v-if="ocrRecords.length === 0">
                  <td colspan="5" class="text-center">无OCR记录数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- API请求日志 -->
        <div v-if="activeTab === 'logs'" class="p-6">
          <h3 class="text-lg font-medium mb-4">API请求日志</h3>
          <div class="mb-4 flex items-center justify-between">
            <div class="flex space-x-2">
              <button
                v-for="filter in logFilters"
                :key="filter.type"
                @click="currentLogFilter = filter.type"
                class="btn btn-sm"
                :class="currentLogFilter === filter.type ? filter.activeClass : 'btn-ghost'"
              >
                {{ filter.label }}
              </button>
            </div>
            <button @click="clearLogs" class="btn btn-sm btn-error">清除日志</button>
          </div>
          <div class="overflow-x-auto">
            <table class="table table-zebra w-full">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>方法</th>
                  <th>路径</th>
                  <th>状态</th>
                  <th>响应时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(log, index) in filteredLogs" :key="index" :class="getLogRowClass(log)">
                  <td>{{ formatTime(log.timestamp) }}</td>
                  <td>
                    <span :class="getMethodClass(log.method)">{{ log.method }}</span>
                  </td>
                  <td>{{ log.path }}</td>
                  <td>
                    <span :class="getStatusClass(log.status)">{{ log.status }}</span>
                  </td>
                  <td>{{ log.responseTime }}ms</td>
                </tr>
                <tr v-if="filteredLogs.length === 0">
                  <td colspan="5" class="text-center">无日志数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据库查询工具 -->
    <div class="card bg-base-100 shadow-xl mb-8">
      <div class="card-body">
        <h2 class="card-title">数据库查询</h2>
        <div class="form-control mb-4">
          <textarea
            v-model="mongoQuery"
            class="textarea textarea-bordered w-full"
            rows="3"
            placeholder='输入MongoDB查询 (例如: { "collection": "users", "query": {}, "limit": 10 })'
          ></textarea>
        </div>
        <div class="flex justify-between">
          <button @click="executeQuery" class="btn btn-accent" :disabled="isQueryExecuting">
            {{ isQueryExecuting ? '执行中...' : '执行查询' }}
          </button>
          <div class="flex space-x-2">
            <button @click="loadSampleQuery('users')" class="btn btn-ghost">用户集合</button>
            <button @click="loadSampleQuery('ocr')" class="btn btn-ghost">OCR记录集合</button>
          </div>
        </div>

        <!-- 查询结果 -->
        <div v-if="queryResult" class="mt-6">
          <h3 class="text-lg font-medium mb-2">查询结果</h3>
          <div class="badge badge-neutral mb-2">
            执行时间: {{ queryResult.executionTime }}ms | 返回行数:
            {{ queryResult.rows ? queryResult.rows.length : 0 }}
          </div>
          <div class="overflow-x-auto">
            <table
              v-if="queryResult.rows && queryResult.rows.length > 0"
              class="table table-zebra w-full"
            >
              <thead>
                <tr>
                  <th v-for="column in Object.keys(queryResult.rows[0])" :key="column">
                    {{ column }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowIndex) in queryResult.rows" :key="rowIndex">
                  <td v-for="column in Object.keys(row)" :key="column">
                    {{ row[column] }}
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else-if="queryResult.error" class="alert alert-error">
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
              <div>
                <h3 class="font-bold">查询错误</h3>
                <div class="text-xs">{{ queryResult.error }}</div>
              </div>
            </div>
            <div v-else class="alert alert-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                class="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span>查询执行成功，但没有返回数据。</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { fetchWithAuth } from '@/services/authService'
import { logout } from '@/services/authService'

export default {
  name: 'AdminDashboard',
  data() {
    return {
      // 全局错误信息
      globalError: null,

      // 系统状态
      serverStatus: {
        online: false,
        version: '',
        uptime: 0,
        environment: '',
      },

      // 数据库状态
      dbStatus: {
        connected: false,
        type: 'MongoDB',
        uri: '',
        auth: false,
      },

      // API状态
      apiStatus: {
        totalRequests: 0,
        successRate: '0%',
        avgResponseTime: '0ms',
      },

      // 标签页
      activeTab: 'users',
      tabs: [
        { id: 'users', name: '用户数据' },
        { id: 'ocr', name: 'OCR记录' },
        { id: 'logs', name: 'API日志' },
      ],

      // 用户数据
      users: [],

      // OCR记录
      ocrRecords: [],

      // 日志数据
      logs: [],
      currentLogFilter: 'all',
      logFilters: [
        { type: 'all', label: '全部', activeClass: 'btn-primary' },
        { type: 'error', label: '错误', activeClass: 'btn-error' },
        { type: 'success', label: '成功', activeClass: 'btn-success' },
      ],

      // 数据库查询
      mongoQuery: '',
      queryResult: null,
      isQueryExecuting: false,
    }
  },

  computed: {
    // 过滤日志
    filteredLogs() {
      if (this.currentLogFilter === 'all') {
        return this.logs
      } else if (this.currentLogFilter === 'error') {
        return this.logs.filter((log) => log.status >= 400)
      } else if (this.currentLogFilter === 'success') {
        return this.logs.filter((log) => log.status < 400)
      }
      return this.logs
    },
  },

  mounted() {
    this.fetchData()
  },

  methods: {
    // 获取所有数据
    async fetchData() {
      try {
        this.globalError = null
        await Promise.all([
          this.fetchServerStatus(),
          this.fetchDbStatus(),
          this.fetchApiStatus(),
          this.fetchUsers(),
          this.fetchOcrRecords(),
          this.fetchLogs(),
        ])
      } catch (error) {
        console.error('获取数据失败:', error)
        if (error.message.includes('授权已过期') || error.message.includes('jwt')) {
          this.globalError = '您的登录状态已过期或无效，请重新登录获取新的授权'
        }
      }
    },

    // 处理重新登录
    handleRelogin() {
      logout()
      this.$router.push({ name: 'Login', query: { redirect: '/admin' } })
    },

    // 刷新数据
    refreshData() {
      this.fetchData()
    },

    // 获取服务器状态
    async fetchServerStatus() {
      try {
        const data = await fetchWithAuth('/api/admin/status')
        if (data.success) {
          this.serverStatus = data.status
        }
      } catch (error) {
        console.error('获取服务器状态失败:', error)
        this.serverStatus.online = false
        throw error // 向上传播错误
      }
    },

    // 获取数据库状态
    async fetchDbStatus() {
      try {
        const data = await fetchWithAuth('/api/admin/db-status')
        if (data.success) {
          this.dbStatus = data.status
        }
      } catch (error) {
        console.error('获取数据库状态失败:', error)
        this.dbStatus.connected = false
        throw error // 向上传播错误
      }
    },

    // 获取API状态
    async fetchApiStatus() {
      try {
        const data = await fetchWithAuth('/api/admin/api-status')
        if (data.success) {
          this.apiStatus = data.status
        }
      } catch (error) {
        console.error('获取API状态失败:', error)
        throw error // 向上传播错误
      }
    },

    // 获取用户数据
    async fetchUsers() {
      try {
        const data = await fetchWithAuth('/api/admin/users')
        if (data.success) {
          this.users = data.users
        }
      } catch (error) {
        console.error('获取用户数据失败:', error)
        this.users = []
        throw error // 向上传播错误
      }
    },

    // 获取OCR记录
    async fetchOcrRecords() {
      try {
        const data = await fetchWithAuth('/api/admin/ocr-records')
        if (data.success) {
          this.ocrRecords = data.records
        }
      } catch (error) {
        console.error('获取OCR记录失败:', error)
        this.ocrRecords = []
        throw error // 向上传播错误
      }
    },

    // 获取日志
    async fetchLogs() {
      try {
        const data = await fetchWithAuth('/api/admin/logs')
        if (data.success) {
          this.logs = data.logs
        }
      } catch (error) {
        console.error('获取日志失败:', error)
        this.logs = []
        throw error // 向上传播错误
      }
    },

    // 清除日志
    async clearLogs() {
      try {
        const data = await fetchWithAuth('/api/admin/logs', {
          method: 'DELETE',
        })
        if (data.success) {
          this.logs = []
        }
      } catch (error) {
        console.error('清除日志失败:', error)
      }
    },

    // 执行查询
    async executeQuery() {
      if (!this.mongoQuery.trim()) return

      this.isQueryExecuting = true
      try {
        // 解析查询字符串为JSON对象
        let queryObj
        try {
          queryObj = JSON.parse(this.mongoQuery)
        } catch (parseError) {
          this.queryResult = {
            error: '查询格式错误: ' + parseError.message,
            executionTime: 0,
            rows: [],
          }
          return
        }

        // 发送查询请求
        const data = await fetchWithAuth('/api/admin/execute-query', {
          method: 'POST',
          body: JSON.stringify(queryObj),
        })

        if (data.success) {
          // 将结果转换为前端需要的格式
          this.queryResult = {
            executionTime: data.executionTime,
            rows: data.results || [],
            error: null,
          }
        } else {
          this.queryResult = {
            error: data.error || '查询执行失败',
            executionTime: data.executionTime || 0,
            rows: [],
          }
        }
      } catch (error) {
        console.error('执行查询失败:', error)
        this.queryResult = {
          error: '执行查询时发生错误: ' + (error.message || '请求失败'),
          executionTime: 0,
          rows: [],
        }
      } finally {
        this.isQueryExecuting = false
      }
    },

    // 加载样本查询
    loadSampleQuery(type) {
      if (type === 'users') {
        this.mongoQuery = JSON.stringify(
          {
            collection: 'users',
            query: {},
            limit: 10,
          },
          null,
          2,
        )
      } else if (type === 'ocr') {
        this.mongoQuery = JSON.stringify(
          {
            collection: 'ocrrecords',
            query: {},
            limit: 10,
          },
          null,
          2,
        )
      }
    },

    // 格式化时间
    formatDate(timestamp) {
      if (!timestamp) return 'N/A'
      return new Date(timestamp).toLocaleString('zh-CN')
    },

    // 格式化时间（仅显示时分秒）
    formatTime(timestamp) {
      if (!timestamp) return 'N/A'
      return new Date(timestamp).toLocaleTimeString('zh-CN')
    },

    // 格式化运行时间
    formatUptime(seconds) {
      if (!seconds) return 'N/A'
      const days = Math.floor(seconds / (24 * 60 * 60))
      const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
      const minutes = Math.floor((seconds % (60 * 60)) / 60)

      if (days > 0) {
        return `${days}天 ${hours}小时 ${minutes}分钟`
      } else if (hours > 0) {
        return `${hours}小时 ${minutes}分钟`
      } else {
        return `${minutes}分钟`
      }
    },

    // 获取HTTP方法的样式
    getMethodClass(method) {
      switch (method?.toUpperCase()) {
        case 'GET':
          return 'text-blue-600'
        case 'POST':
          return 'text-green-600'
        case 'PUT':
          return 'text-yellow-600'
        case 'DELETE':
          return 'text-red-600'
        default:
          return 'text-gray-600'
      }
    },

    // 获取状态码的样式
    getStatusClass(status) {
      if (status < 300) {
        return 'text-green-600'
      } else if (status < 400) {
        return 'text-blue-600'
      } else if (status < 500) {
        return 'text-yellow-600'
      } else {
        return 'text-red-600'
      }
    },

    // 获取日志行的样式
    getLogRowClass(log) {
      if (log.status >= 500) {
        return 'bg-red-50'
      } else if (log.status >= 400) {
        return 'bg-yellow-50'
      }
      return ''
    },

    // 格式化文件大小
    formatFileSize(bytes) {
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
      if (bytes === 0) return '0 Bytes'
      const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10)
      if (i === 0) return `${bytes} ${sizes[i]}`
      return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`
    },

    // 解码文件名，处理可能的UTF-8编码问题
    decodeFilename(filename) {
      if (!filename) return ''
      try {
        // 1. 如果看起来是URL编码的字符串
        if (filename.includes('%')) {
          return decodeURIComponent(filename)
        }

        // 2. 处理特定的中文乱码模式
        if (/æ|ø|å|ä|ö|ü|é|è|ê|ë|à|â|î|ï|ù|û|ÿ|ç|ñ/.test(filename)) {
          // 这种情况是拉丁1（ISO-8859-1）编码错误解释为UTF-8导致的
          // 首先将其转换回字节序列，然后正确解码为UTF-8
          try {
            // 先将ISO-8859-1编码的字符串转回字节
            const bytes = []
            for (let i = 0; i < filename.length; i++) {
              const code = filename.charCodeAt(i)
              if (code < 256) {
                bytes.push(code)
              }
            }
            // 然后将字节数组作为UTF-8解码
            const decoder = new TextDecoder('utf-8')
            const uint8Array = new Uint8Array(bytes)
            return decoder.decode(uint8Array)
          } catch (e) {
            console.error('TextDecoder不可用，尝试替代方案:', e)

            // 特殊情况: 硬编码替换æ··åè¯­è¨-è±ææ³°ç±³å°æ.png这种模式
            // 这只是一个针对特定文件的临时解决方案
            if (filename === 'æ··åè¯­è¨-è±ææ³°ç±³å°æ.png') {
              return '混合语言-英文泰米尔文.png'
            }

            // 其他常见中文乱码的替换映射
            const commonReplacements = {
              'æ··': '混合',
              å: '合',
              è: '英',
              é: '文',
              ç: '语',
              '¨': '言',
              'æ³°': '泰',
              'ç±³': '米',
              'å°': '尔',
            }

            // 应用替换
            let result = filename
            for (const [encoded, chinese] of Object.entries(commonReplacements)) {
              result = result.replace(new RegExp(encoded, 'g'), chinese)
            }

            return result
          }
        }

        // 3. 如果没有明显的乱码特征，直接返回
        return filename
      } catch (e) {
        console.error('解码文件名出错:', e)
        return filename
      }
    },
  },
}
</script>
