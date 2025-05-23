// frontend/src/api/monitoring.js
import { fetchHelper } from '@/utils/fetchHelper'

/**
 * 监控相关API
 */
export const monitoringApi = {
  /**
   * 获取系统总览
   */
  async getSystemOverview() {
    try {
      const response = await fetchHelper.get('/api/monitoring/overview')
      return response
    } catch (error) {
      console.error('获取系统总览失败:', error)
      throw error
    }
  },

  /**
   * 获取队列状态详情
   */
  async getQueueStatus() {
    try {
      const response = await fetchHelper.get('/api/monitoring/queue-status')
      return response
    } catch (error) {
      console.error('获取队列状态失败:', error)
      throw error
    }
  },

  /**
   * 获取性能指标
   * @param {string} timeRange - 时间范围 (1h, 24h, 7d)
   */
  async getPerformanceMetrics(timeRange = '1h') {
    try {
      const response = await fetchHelper.get('/api/monitoring/performance', {
        params: { timeRange }
      })
      return response
    } catch (error) {
      console.error('获取性能指标失败:', error)
      throw error
    }
  },

  /**
   * 获取任务统计
   * @param {string} period - 统计周期 (today, week, month)
   */
  async getTaskStatistics(period = 'today') {
    try {
      const response = await fetchHelper.get('/api/monitoring/task-statistics', {
        params: { period }
      })
      return response
    } catch (error) {
      console.error('获取任务统计失败:', error)
      throw error
    }
  },

  /**
   * 重启服务
   * @param {string} service - 服务名称 (rabbitmq, notification, scheduler)
   */
  async restartService(service) {
    try {
      const response = await fetchHelper.post('/api/monitoring/restart-service', {
        service
      })
      return response
    } catch (error) {
      console.error('重启服务失败:', error)
      throw error
    }
  }
}

/**
 * OCR队列相关API
 */
export const ocrQueueApi = {
  /**
   * 提交OCR任务到队列
   * @param {FormData} formData - 包含文件和参数的表单数据
   */
  async submitTask(formData) {
    try {
      const response = await fetchHelper.post('/api/ocr-queue/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response
    } catch (error) {
      console.error('提交OCR任务失败:', error)
      throw error
    }
  },

  /**
   * 获取OCR任务状态
   * @param {string} taskId - 任务ID
   */
  async getTaskStatus(taskId) {
    try {
      const response = await fetchHelper.get(`/api/ocr-queue/task/${taskId}/status`)
      return response
    } catch (error) {
      console.error('获取任务状态失败:', error)
      throw error
    }
  },

  /**
   * 获取用户的OCR任务列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.status - 任务状态过滤
   */
  async getUserTasks(params = {}) {
    try {
      const response = await fetchHelper.get('/api/ocr-queue/tasks', {
        params
      })
      return response
    } catch (error) {
      console.error('获取用户任务列表失败:', error)
      throw error
    }
  },

  /**
   * 取消OCR任务
   * @param {string} taskId - 任务ID
   */
  async cancelTask(taskId) {
    try {
      const response = await fetchHelper.post(`/api/ocr-queue/task/${taskId}/cancel`)
      return response
    } catch (error) {
      console.error('取消任务失败:', error)
      throw error
    }
  },

  /**
   * 获取队列状态统计（管理员）
   */
  async getQueueStats() {
    try {
      const response = await fetchHelper.get('/api/ocr-queue/stats')
      return response
    } catch (error) {
      console.error('获取队列统计失败:', error)
      throw error
    }
  }
}

/**
 * 实时监控工具类
 */
export class RealTimeMonitor {
  constructor() {
    this.subscribers = new Map()
    this.isRunning = false
    this.interval = null
    this.refreshRate = 5000 // 5秒刷新一次
  }

  /**
   * 订阅监控数据
   * @param {string} type - 监控类型 (overview, queue, performance, tasks)
   * @param {Function} callback - 回调函数
   */
  subscribe(type, callback) {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set())
    }
    this.subscribers.get(type).add(callback)

    // 如果是第一个订阅者，启动监控
    if (!this.isRunning) {
      this.start()
    }

    // 返回取消订阅函数
    return () => {
      this.unsubscribe(type, callback)
    }
  }

  /**
   * 取消订阅
   * @param {string} type - 监控类型
   * @param {Function} callback - 回调函数
   */
  unsubscribe(type, callback) {
    if (this.subscribers.has(type)) {
      this.subscribers.get(type).delete(callback)
      
      // 如果该类型没有订阅者了，删除该类型
      if (this.subscribers.get(type).size === 0) {
        this.subscribers.delete(type)
      }
    }

    // 如果没有任何订阅者，停止监控
    if (this.subscribers.size === 0) {
      this.stop()
    }
  }

  /**
   * 启动实时监控
   */
  start() {
    if (this.isRunning) return

    this.isRunning = true
    this.interval = setInterval(async () => {
      await this.fetchAndNotify()
    }, this.refreshRate)

    console.log('实时监控已启动')
  }

  /**
   * 停止实时监控
   */
  stop() {
    if (!this.isRunning) return

    this.isRunning = false
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }

    console.log('实时监控已停止')
  }

  /**
   * 获取数据并通知订阅者
   */
  async fetchAndNotify() {
    try {
      const promises = []
      const types = Array.from(this.subscribers.keys())

      // 根据订阅类型获取相应数据
      if (types.includes('overview')) {
        promises.push(
          monitoringApi.getSystemOverview()
            .then(data => this.notify('overview', data))
            .catch(error => console.error('获取系统总览失败:', error))
        )
      }

      if (types.includes('queue')) {
        promises.push(
          monitoringApi.getQueueStatus()
            .then(data => this.notify('queue', data))
            .catch(error => console.error('获取队列状态失败:', error))
        )
      }

      if (types.includes('performance')) {
        promises.push(
          monitoringApi.getPerformanceMetrics()
            .then(data => this.notify('performance', data))
            .catch(error => console.error('获取性能指标失败:', error))
        )
      }

      if (types.includes('tasks')) {
        promises.push(
          monitoringApi.getTaskStatistics()
            .then(data => this.notify('tasks', data))
            .catch(error => console.error('获取任务统计失败:', error))
        )
      }

      await Promise.allSettled(promises)

    } catch (error) {
      console.error('实时监控数据获取失败:', error)
    }
  }

  /**
   * 通知订阅者
   * @param {string} type - 监控类型
   * @param {Object} data - 数据
   */
  notify(type, data) {
    if (this.subscribers.has(type)) {
      this.subscribers.get(type).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`通知订阅者失败 (${type}):`, error)
        }
      })
    }
  }

  /**
   * 设置刷新频率
   * @param {number} rate - 刷新频率（毫秒）
   */
  setRefreshRate(rate) {
    this.refreshRate = rate
    
    // 如果正在运行，重启以应用新的频率
    if (this.isRunning) {
      this.stop()
      this.start()
    }
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      subscriberCount: this.subscribers.size,
      refreshRate: this.refreshRate,
      subscriberTypes: Array.from(this.subscribers.keys())
    }
  }
}

// 创建全局实时监控实例
export const realTimeMonitor = new RealTimeMonitor()

// 导出默认对象
export default {
  monitoringApi,
  ocrQueueApi,
  RealTimeMonitor,
  realTimeMonitor
}
