<template>
  <div class="queue-monitoring-page">
    <div class="page-header">
      <h1>{{ $t('admin.queueMonitoring.title') }}</h1>
      <div class="header-actions">
        <button 
          @click="refreshData" 
          :disabled="loading"
          class="btn btn-primary"
        >
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
          {{ $t('common.refresh') }}
        </button>
        <button 
          @click="toggleAutoRefresh"
          class="btn btn-secondary"
          :class="{ 'active': autoRefresh }"
        >
          <i class="fas fa-clock"></i>
          {{ $t('admin.queueMonitoring.autoRefresh') }}
        </button>
      </div>
    </div>

    <!-- 系统总览 -->
    <div class="overview-section">
      <h2>{{ $t('admin.queueMonitoring.systemOverview') }}</h2>
      <div class="overview-cards">
        <div class="card status-card">
          <div class="card-header">
            <h3>{{ $t('admin.queueMonitoring.serviceStatus') }}</h3>
          </div>
          <div class="card-body">
            <div class="service-status">
              <div 
                v-for="(service, name) in systemOverview.services" 
                :key="name"
                class="service-item"
              >
                <span class="service-name">{{ $t(`admin.queueMonitoring.services.${name}`) }}</span>
                <span 
                  class="service-indicator"
                  :class="service.status"
                >
                  {{ $t(`admin.queueMonitoring.status.${service.status}`) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="card metrics-card">
          <div class="card-header">
            <h3>{{ $t('admin.queueMonitoring.systemMetrics') }}</h3>
          </div>
          <div class="card-body">
            <div class="metrics-grid">
              <div class="metric-item">
                <span class="metric-label">{{ $t('admin.queueMonitoring.uptime') }}</span>
                <span class="metric-value">{{ formatUptime(systemOverview.system?.uptime) }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">{{ $t('admin.queueMonitoring.memoryUsage') }}</span>
                <span class="metric-value">{{ formatMemory(systemOverview.system?.memoryUsage?.heapUsed) }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">{{ $t('admin.queueMonitoring.dbCollections') }}</span>
                <span class="metric-value">{{ Object.keys(systemOverview.database?.collections || {}).length }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 队列状态 -->
    <div class="queue-section">
      <h2>{{ $t('admin.queueMonitoring.queueStatus') }}</h2>
      <div class="queue-cards">
        <div 
          v-for="(queue, name) in queueStatus.queues" 
          :key="name"
          class="card queue-card"
        >
          <div class="card-header">
            <h3>{{ name }}</h3>
            <span 
              class="queue-health"
              :class="getQueueHealth(queue)"
            >
              {{ $t(`admin.queueMonitoring.queueHealth.${getQueueHealth(queue)}`) }}
            </span>
          </div>
          <div class="card-body">
            <div class="queue-metrics">
              <div class="metric">
                <span class="label">{{ $t('admin.queueMonitoring.messageCount') }}</span>
                <span class="value">{{ queue.messageCount || 0 }}</span>
              </div>
              <div class="metric">
                <span class="label">{{ $t('admin.queueMonitoring.consumerCount') }}</span>
                <span class="value">{{ queue.consumerCount || 0 }}</span>
              </div>
              <div class="metric">
                <span class="label">{{ $t('admin.queueMonitoring.publishRate') }}</span>
                <span class="value">{{ (queue.publishRate || 0).toFixed(2) }}/s</span>
              </div>
              <div class="metric">
                <span class="label">{{ $t('admin.queueMonitoring.deliverRate') }}</span>
                <span class="value">{{ (queue.deliverRate || 0).toFixed(2) }}/s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 性能指标 -->
    <div class="performance-section">
      <h2>{{ $t('admin.queueMonitoring.performanceMetrics') }}</h2>
      <div class="time-range-selector">
        <button 
          v-for="range in timeRanges"
          :key="range.value"
          @click="selectedTimeRange = range.value; loadPerformanceMetrics()"
          class="btn btn-outline"
          :class="{ 'active': selectedTimeRange === range.value }"
        >
          {{ $t(range.label) }}
        </button>
      </div>
      <div class="performance-cards">
        <div class="card performance-card">
          <div class="card-header">
            <h3>{{ $t('admin.queueMonitoring.ocrPerformance') }}</h3>
          </div>
          <div class="card-body">
            <div class="performance-metrics">
              <div class="metric">
                <span class="label">{{ $t('admin.queueMonitoring.totalTasks') }}</span>
                <span class="value">{{ performanceMetrics.ocr?.totalTasks || 0 }}</span>
              </div>
              <div class="metric">
                <span class="label">{{ $t('admin.queueMonitoring.avgProcessingTime') }}</span>
                <span class="value">{{ (performanceMetrics.ocr?.avgProcessingTime || 0).toFixed(2) }}s</span>
              </div>
              <div class="metric">
                <span class="label">{{ $t('admin.queueMonitoring.successRate') }}</span>
                <span class="value">{{ ((performanceMetrics.ocr?.successRate || 0) * 100).toFixed(1) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card performance-card">
          <div class="card-header">
            <h3>{{ $t('admin.queueMonitoring.notificationPerformance') }}</h3>
          </div>
          <div class="card-body">
            <div class="performance-metrics">
              <div class="metric">
                <span class="label">{{ $t('admin.queueMonitoring.totalNotifications') }}</span>
                <span class="value">{{ performanceMetrics.notifications?.total || 0 }}</span>
              </div>
              <div class="metric">
                <span class="label">{{ $t('admin.queueMonitoring.sentNotifications') }}</span>
                <span class="value">{{ performanceMetrics.notifications?.sent || 0 }}</span>
              </div>
              <div class="metric">
                <span class="label">{{ $t('admin.queueMonitoring.failedNotifications') }}</span>
                <span class="value">{{ performanceMetrics.notifications?.failed || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务统计 -->
    <div class="tasks-section">
      <h2>{{ $t('admin.queueMonitoring.taskStatistics') }}</h2>
      <div class="period-selector">
        <button 
          v-for="period in periods"
          :key="period.value"
          @click="selectedPeriod = period.value; loadTaskStatistics()"
          class="btn btn-outline"
          :class="{ 'active': selectedPeriod === period.value }"
        >
          {{ $t(period.label) }}
        </button>
      </div>
      <div class="tasks-cards">
        <div class="card tasks-card">
          <div class="card-header">
            <h3>{{ $t('admin.queueMonitoring.ocrTasks') }}</h3>
          </div>
          <div class="card-body">
            <div class="task-stats">
              <div class="stat-item">
                <span class="stat-label">{{ $t('admin.queueMonitoring.total') }}</span>
                <span class="stat-value">{{ taskStatistics.ocrTasks?.total || 0 }}</span>
              </div>
              <div class="stat-item success">
                <span class="stat-label">{{ $t('admin.queueMonitoring.success') }}</span>
                <span class="stat-value">{{ taskStatistics.ocrTasks?.success || 0 }}</span>
              </div>
              <div class="stat-item failed">
                <span class="stat-label">{{ $t('admin.queueMonitoring.failed') }}</span>
                <span class="stat-value">{{ taskStatistics.ocrTasks?.failed || 0 }}</span>
              </div>
              <div class="stat-item processing">
                <span class="stat-label">{{ $t('admin.queueMonitoring.processing') }}</span>
                <span class="stat-value">{{ taskStatistics.ocrTasks?.processing || 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card tasks-card">
          <div class="card-header">
            <h3>{{ $t('admin.queueMonitoring.scheduledTasks') }}</h3>
          </div>
          <div class="card-body">
            <div class="scheduled-tasks">
              <div 
                v-for="task in taskStatistics.scheduledTasks" 
                :key="task.id"
                class="scheduled-task-item"
              >
                <div class="task-info">
                  <span class="task-name">{{ task.description }}</span>
                  <span class="task-cron">{{ task.cronExpression }}</span>
                </div>
                <span 
                  class="task-status"
                  :class="{ 'running': task.isRunning }"
                >
                  {{ task.isRunning ? $t('admin.queueMonitoring.running') : $t('admin.queueMonitoring.stopped') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 服务控制 -->
    <div class="control-section">
      <h2>{{ $t('admin.queueMonitoring.serviceControl') }}</h2>
      <div class="control-buttons">
        <button 
          @click="restartService('rabbitmq')"
          :disabled="loading"
          class="btn btn-warning"
        >
          <i class="fas fa-redo"></i>
          {{ $t('admin.queueMonitoring.restartRabbitMQ') }}
        </button>
        <button 
          @click="restartService('notification')"
          :disabled="loading"
          class="btn btn-warning"
        >
          <i class="fas fa-redo"></i>
          {{ $t('admin.queueMonitoring.restartNotification') }}
        </button>
        <button 
          @click="restartService('scheduler')"
          :disabled="loading"
          class="btn btn-warning"
        >
          <i class="fas fa-redo"></i>
          {{ $t('admin.queueMonitoring.restartScheduler') }}
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <span>{{ $t('common.loading') }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { monitoringApi } from '@/api/monitoring'

export default {
  name: 'QueueMonitoringPage',
  setup() {
    const { t } = useI18n()
    
    // 响应式数据
    const loading = ref(false)
    const autoRefresh = ref(false)
    const refreshInterval = ref(null)
    
    const systemOverview = reactive({})
    const queueStatus = reactive({})
    const performanceMetrics = reactive({})
    const taskStatistics = reactive({})
    
    const selectedTimeRange = ref('1h')
    const selectedPeriod = ref('today')
    
    const timeRanges = [
      { value: '1h', label: 'admin.queueMonitoring.timeRange.1h' },
      { value: '24h', label: 'admin.queueMonitoring.timeRange.24h' },
      { value: '7d', label: 'admin.queueMonitoring.timeRange.7d' }
    ]
    
    const periods = [
      { value: 'today', label: 'admin.queueMonitoring.period.today' },
      { value: 'week', label: 'admin.queueMonitoring.period.week' },
      { value: 'month', label: 'admin.queueMonitoring.period.month' }
    ]

    // 方法
    const loadSystemOverview = async () => {
      try {
        const response = await monitoringApi.getSystemOverview()
        if (response.success) {
          Object.assign(systemOverview, response.data)
        }
      } catch (error) {
        console.error('加载系统总览失败:', error)
        ElMessage.error(t('admin.queueMonitoring.errors.loadOverviewFailed'))
      }
    }

    const loadQueueStatus = async () => {
      try {
        const response = await monitoringApi.getQueueStatus()
        if (response.success) {
          Object.assign(queueStatus, response.data)
        }
      } catch (error) {
        console.error('加载队列状态失败:', error)
        ElMessage.error(t('admin.queueMonitoring.errors.loadQueueStatusFailed'))
      }
    }

    const loadPerformanceMetrics = async () => {
      try {
        const response = await monitoringApi.getPerformanceMetrics(selectedTimeRange.value)
        if (response.success) {
          Object.assign(performanceMetrics, response.data)
        }
      } catch (error) {
        console.error('加载性能指标失败:', error)
        ElMessage.error(t('admin.queueMonitoring.errors.loadMetricsFailed'))
      }
    }

    const loadTaskStatistics = async () => {
      try {
        const response = await monitoringApi.getTaskStatistics(selectedPeriod.value)
        if (response.success) {
          Object.assign(taskStatistics, response.data)
        }
      } catch (error) {
        console.error('加载任务统计失败:', error)
        ElMessage.error(t('admin.queueMonitoring.errors.loadStatsFailed'))
      }
    }

    const refreshData = async () => {
      loading.value = true
      try {
        await Promise.all([
          loadSystemOverview(),
          loadQueueStatus(),
          loadPerformanceMetrics(),
          loadTaskStatistics()
        ])
      } finally {
        loading.value = false
      }
    }

    const toggleAutoRefresh = () => {
      autoRefresh.value = !autoRefresh.value
      
      if (autoRefresh.value) {
        refreshInterval.value = setInterval(refreshData, 30000) // 30秒刷新一次
        ElMessage.success(t('admin.queueMonitoring.autoRefreshEnabled'))
      } else {
        if (refreshInterval.value) {
          clearInterval(refreshInterval.value)
          refreshInterval.value = null
        }
        ElMessage.info(t('admin.queueMonitoring.autoRefreshDisabled'))
      }
    }

    const restartService = async (serviceName) => {
      try {
        loading.value = true
        const response = await monitoringApi.restartService(serviceName)
        if (response.success) {
          ElMessage.success(t('admin.queueMonitoring.serviceRestartSuccess', { service: serviceName }))
          // 延迟刷新数据
          setTimeout(refreshData, 2000)
        } else {
          ElMessage.error(t('admin.queueMonitoring.serviceRestartFailed', { service: serviceName }))
        }
      } catch (error) {
        console.error('重启服务失败:', error)
        ElMessage.error(t('admin.queueMonitoring.serviceRestartFailed', { service: serviceName }))
      } finally {
        loading.value = false
      }
    }

    const getQueueHealth = (queue) => {
      if (!queue) return 'unknown'
      if (queue.consumerCount === 0) return 'warning'
      if (queue.messageCount > 100) return 'warning'
      return 'healthy'
    }

    const formatUptime = (seconds) => {
      if (!seconds) return '0s'
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = Math.floor(seconds % 60)
      return `${hours}h ${minutes}m ${secs}s`
    }

    const formatMemory = (bytes) => {
      if (!bytes) return '0 MB'
      const mb = bytes / (1024 * 1024)
      return `${mb.toFixed(1)} MB`
    }

    // 生命周期
    onMounted(() => {
      refreshData()
    })

    onUnmounted(() => {
      if (refreshInterval.value) {
        clearInterval(refreshInterval.value)
      }
    })

    return {
      loading,
      autoRefresh,
      systemOverview,
      queueStatus,
      performanceMetrics,
      taskStatistics,
      selectedTimeRange,
      selectedPeriod,
      timeRanges,
      periods,
      refreshData,
      toggleAutoRefresh,
      restartService,
      getQueueHealth,
      formatUptime,
      formatMemory,
      loadPerformanceMetrics,
      loadTaskStatistics
    }
  }
}
</script>

<style scoped>
.queue-monitoring-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.page-header h1 {
  margin: 0;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
}

.btn:hover {
  background: #f5f5f5;
}

.btn.btn-primary {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.btn.btn-primary:hover {
  background: #0056b3;
}

.btn.btn-secondary {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

.btn.btn-secondary.active {
  background: #495057;
}

.btn.btn-warning {
  background: #ffc107;
  color: #212529;
  border-color: #ffc107;
}

.btn.btn-outline {
  background: transparent;
  color: #007bff;
  border-color: #007bff;
}

.btn.btn-outline.active {
  background: #007bff;
  color: white;
}

.overview-section,
.queue-section,
.performance-section,
.tasks-section,
.control-section {
  margin-bottom: 40px;
}

.overview-section h2,
.queue-section h2,
.performance-section h2,
.tasks-section h2,
.control-section h2 {
  margin-bottom: 20px;
  color: #333;
  font-size: 1.5rem;
}

.overview-cards,
.queue-cards,
.performance-cards,
.tasks-cards {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card-header {
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.card-body {
  padding: 20px;
}

.service-status {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.service-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.service-indicator {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}

.service-indicator.healthy {
  background: #d4edda;
  color: #155724;
}

.service-indicator.unhealthy {
  background: #f8d7da;
  color: #721c24;
}

.metrics-grid {
  display: grid;
  gap: 15px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.metric-item:last-child {
  border-bottom: none;
}

.metric-label {
  color: #666;
  font-size: 0.9rem;
}

.metric-value {
  font-weight: 600;
  color: #333;
}

.queue-health {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}

.queue-health.healthy {
  background: #d4edda;
  color: #155724;
}

.queue-health.warning {
  background: #fff3cd;
  color: #856404;
}

.queue-health.unknown {
  background: #f8f9fa;
  color: #6c757d;
}

.queue-metrics {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, 1fr);
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric .label {
  font-size: 0.85rem;
  color: #666;
}

.metric .value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.time-range-selector,
.period-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.performance-metrics {
  display: grid;
  gap: 15px;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.task-stats {
  display: grid;
  gap: 15px;
  grid-template-columns: repeat(2, 1fr);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 4px;
  background: #f8f9fa;
}

.stat-item.success {
  background: #d4edda;
}

.stat-item.failed {
  background: #f8d7da;
}

.stat-item.processing {
  background: #fff3cd;
}

.stat-label {
  font-size: 0.85rem;
  color: #666;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.scheduled-tasks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scheduled-task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-name {
  font-weight: 500;
  color: #333;
}

.task-cron {
  font-size: 0.85rem;
  color: #666;
  font-family: monospace;
}

.task-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  background: #6c757d;
  color: white;
}

.task-status.running {
  background: #28a745;
}

.control-buttons {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-spinner {
  background: white;
  padding: 30px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.loading-spinner i {
  font-size: 2rem;
  color: #007bff;
}

@media (max-width: 768px) {
  .overview-cards,
  .queue-cards,
  .performance-cards,
  .tasks-cards {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .time-range-selector,
  .period-selector {
    flex-wrap: wrap;
  }
  
  .control-buttons {
    flex-direction: column;
  }
}
</style>
