<template>
  <div class="min-h-screen bg-base-200 p-4">
    <div class="max-w-4xl mx-auto">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h1 class="card-title text-2xl mb-4">🧪 前端环境检测测试</h1>
          
          <!-- 测试控制 -->
          <div class="flex gap-2 mb-4">
            <button 
              @click="runTest" 
              :disabled="isLoading"
              class="btn btn-primary"
            >
              <span v-if="!isLoading">运行测试</span>
              <span v-else class="loading loading-spinner loading-sm"></span>
            </button>
            <button @click="clearResults" class="btn btn-outline">清除结果</button>
            <button @click="testApiConnection" class="btn btn-secondary">测试API连接</button>
          </div>

          <!-- 测试结果 -->
          <div v-if="testResult" class="mb-4">
            <div :class="['alert', testResult.success ? 'alert-success' : 'alert-error']">
              <span>{{ testResult.message }}</span>
            </div>
          </div>

          <!-- 环境信息 -->
          <div v-if="environmentInfo" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="card bg-base-200">
              <div class="card-body">
                <h3 class="card-title text-lg">🌍 基础环境信息</h3>
                <div class="space-y-2">
                  <div><strong>运行环境:</strong> {{ environmentInfo.environment }}</div>
                  <div><strong>运行平台:</strong> {{ environmentInfo.platform }}</div>
                  <div><strong>开发环境:</strong> {{ environmentInfo.isDevelopment ? '是' : '否' }}</div>
                  <div><strong>生产环境:</strong> {{ environmentInfo.isProduction ? '是' : '否' }}</div>
                  <div><strong>本地环境:</strong> {{ environmentInfo.isLocal ? '是' : '否' }}</div>
                  <div><strong>云端环境:</strong> {{ environmentInfo.isCloud ? '是' : '否' }}</div>
                </div>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body">
                <h3 class="card-title text-lg">🔗 API配置</h3>
                <div class="space-y-2">
                  <div><strong>基础URL:</strong> {{ apiConfig?.baseUrl }}</div>
                  <div><strong>超时时间:</strong> {{ apiConfig?.timeout }}ms</div>
                  <div><strong>重试次数:</strong> {{ apiConfig?.retries }}</div>
                  <div><strong>启用缓存:</strong> {{ apiConfig?.enableCaching ? '是' : '否' }}</div>
                </div>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body">
                <h3 class="card-title text-lg">📝 日志配置</h3>
                <div class="space-y-2">
                  <div><strong>日志级别:</strong> {{ logConfig?.level }}</div>
                  <div><strong>启用控制台:</strong> {{ logConfig?.enableConsole ? '是' : '否' }}</div>
                  <div><strong>启用API日志:</strong> {{ logConfig?.enableApiLogging ? '是' : '否' }}</div>
                </div>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body">
                <h3 class="card-title text-lg">🎛️ 功能开关</h3>
                <div class="space-y-2">
                  <div><strong>调试日志:</strong> {{ features?.debugLogs ? '启用' : '禁用' }}</div>
                  <div><strong>详细错误:</strong> {{ features?.detailedErrors ? '启用' : '禁用' }}</div>
                  <div><strong>开发工具:</strong> {{ features?.devTools ? '启用' : '禁用' }}</div>
                  <div><strong>OAuth:</strong> {{ features?.oauth ? '启用' : '禁用' }}</div>
                  <div><strong>分析统计:</strong> {{ features?.analytics ? '启用' : '禁用' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- API连接测试结果 -->
          <div v-if="apiTestResult" class="mb-4">
            <div class="card bg-base-200">
              <div class="card-body">
                <h3 class="card-title text-lg">🔗 API连接测试</h3>
                <div :class="['alert', apiTestResult.success ? 'alert-success' : 'alert-error']">
                  <span>{{ apiTestResult.message }}</span>
                </div>
                <div v-if="apiTestResult.data" class="mt-2">
                  <pre class="bg-base-300 p-2 rounded text-xs overflow-x-auto">{{ JSON.stringify(apiTestResult.data, null, 2) }}</pre>
                </div>
              </div>
            </div>
          </div>

          <!-- 详细日志 -->
          <div class="card bg-base-200">
            <div class="card-body">
              <h3 class="card-title text-lg">📋 详细日志</h3>
              <div class="bg-base-300 p-4 rounded max-h-96 overflow-y-auto">
                <pre class="text-xs">{{ logs.join('\n') }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const isLoading = ref(false)
const testResult = ref(null)
const environmentInfo = ref(null)
const apiConfig = ref(null)
const logConfig = ref(null)
const features = ref(null)
const apiTestResult = ref(null)
const logs = ref(['等待测试开始...'])

function log(message) {
  const timestamp = new Date().toLocaleTimeString()
  const logEntry = `[${timestamp}] ${message}`
  logs.value.push(logEntry)
  console.log(message)
}

function clearResults() {
  testResult.value = null
  environmentInfo.value = null
  apiConfig.value = null
  logConfig.value = null
  features.value = null
  apiTestResult.value = null
  logs.value = ['日志已清除，等待新的测试...']
}

async function runTest() {
  isLoading.value = true
  testResult.value = null
  logs.value = []
  
  try {
    log('🧪 开始前端环境检测测试...')
    
    // 导入环境检测器
    log('📦 尝试导入环境检测器...')
    const environmentModule = await import('@/utils/environment')
    log('✅ 环境检测器导入成功')

    const {
      environment,
      isDevelopment,
      isProduction,
      getConfig,
      getEnvironment,
      getPlatform
    } = environmentModule

    // 基础环境信息测试
    log('🌍 收集基础环境信息...')
    environmentInfo.value = {
      environment: getEnvironment(),
      platform: getPlatform(),
      isDevelopment: isDevelopment(),
      isProduction: isProduction(),
      isLocal: environment.isLocal(),
      isCloud: environment.isCloud()
    }

    // API配置测试
    log('🔗 获取API配置...')
    apiConfig.value = getConfig('api')

    // 日志配置测试
    log('📝 获取日志配置...')
    logConfig.value = getConfig('log')

    // 功能开关测试
    log('🎛️ 检查功能开关...')
    features.value = {
      debugLogs: environment.shouldEnableDebugLogs(),
      detailedErrors: environment.shouldShowDetailedErrors(),
      devTools: environment.shouldEnableDevTools(),
      oauth: environment.shouldEnableOAuth(),
      analytics: environment.shouldEnableAnalytics()
    }

    log('✅ 所有测试完成')
    testResult.value = {
      success: true,
      message: '环境检测测试成功完成！所有功能正常工作。'
    }

  } catch (error) {
    log(`❌ 测试失败: ${error.message}`)
    log(`错误详情: ${error.stack}`)
    
    testResult.value = {
      success: false,
      message: `测试失败: ${error.message}`
    }
  } finally {
    isLoading.value = false
  }
}

async function testApiConnection() {
  log('🔗 开始API连接测试...')
  
  try {
    // 导入环境检测器获取API配置
    const { getConfig } = await import('@/utils/environment')
    const config = getConfig('api')
    
    log(`📡 测试API连接: ${config.baseUrl}`)
    
    // 测试健康检查端点
    const response = await fetch(`${config.baseUrl}/api/health`)
    
    if (response.ok) {
      const data = await response.json()
      log('✅ API连接成功')
      
      apiTestResult.value = {
        success: true,
        message: `API连接成功 (状态码: ${response.status})`,
        data: data
      }
    } else {
      log(`❌ API连接失败: ${response.status} ${response.statusText}`)
      
      apiTestResult.value = {
        success: false,
        message: `API连接失败: ${response.status} ${response.statusText}`
      }
    }
    
  } catch (error) {
    log(`❌ API连接测试失败: ${error.message}`)
    
    apiTestResult.value = {
      success: false,
      message: `API连接测试失败: ${error.message}`
    }
  }
}
</script>
