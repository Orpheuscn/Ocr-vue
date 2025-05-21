// analyticsService.js - 用户行为分析服务
import { getCurrentUser } from './authService';
import { logSecureError } from './logService';
import axios from 'axios';

// 配置
const ANALYTICS_ENABLED = true; // 可以通过环境变量控制
const BATCH_SIZE = 10; // 批量发送的事件数量
const FLUSH_INTERVAL = 30000; // 30秒自动发送一次

// 事件队列
let eventQueue = [];
let flushTimer = null;

/**
 * 跟踪用户行为
 * @param {Object} action - 行为数据
 * @param {string} action.type - 行为类型
 * @param {string} action.category - 行为类别
 * @param {Object} action.data - 附加数据
 */
export const trackUserAction = (action) => {
  if (!ANALYTICS_ENABLED) return;
  
  try {
    const user = getCurrentUser();
    const userId = user?.id || 'anonymous';
    
    // 创建事件对象
    const event = {
      userId,
      type: action.type,
      category: action.category || 'general',
      data: action.data || {},
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
      sessionId: getSessionId()
    };
    
    // 添加到队列
    eventQueue.push(event);
    
    // 如果队列达到批量大小，立即发送
    if (eventQueue.length >= BATCH_SIZE) {
      flushEvents();
    }
    
    // 确保有一个定时器在运行
    ensureFlushTimer();
    
  } catch (error) {
    logSecureError('跟踪用户行为失败', error);
  }
};

/**
 * 确保有一个刷新定时器在运行
 */
const ensureFlushTimer = () => {
  if (!flushTimer) {
    flushTimer = setInterval(flushEvents, FLUSH_INTERVAL);
  }
};

/**
 * 发送队列中的事件到服务器
 */
const flushEvents = async () => {
  if (eventQueue.length === 0) {
    clearInterval(flushTimer);
    flushTimer = null;
    return;
  }
  
  // 复制当前队列并清空
  const events = [...eventQueue];
  eventQueue = [];
  
  try {
    await axios.post('/api/analytics/events', { events });
  } catch (error) {
    // 如果发送失败，将事件放回队列
    logSecureError('发送分析事件失败', error);
    eventQueue = [...events, ...eventQueue];
  }
};

/**
 * 获取或创建会话ID
 */
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

/**
 * 生成唯一的会话ID
 */
const generateSessionId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * 页面浏览跟踪
 * @param {string} pageName - 页面名称
 */
export const trackPageView = (pageName) => {
  trackUserAction({
    type: 'page_view',
    category: 'navigation',
    data: { pageName }
  });
};

/**
 * 特性使用跟踪
 * @param {string} featureName - 特性名称
 * @param {Object} data - 使用数据
 */
export const trackFeatureUsage = (featureName, data = {}) => {
  trackUserAction({
    type: 'feature_usage',
    category: 'feature',
    data: { featureName, ...data }
  });
};

/**
 * 错误跟踪
 * @param {string} errorType - 错误类型
 * @param {string} errorMessage - 错误消息
 * @param {Object} context - 错误上下文
 */
export const trackError = (errorType, errorMessage, context = {}) => {
  trackUserAction({
    type: 'error',
    category: 'error',
    data: { errorType, errorMessage, context }
  });
};

// 在页面卸载前发送剩余事件
window.addEventListener('beforeunload', () => {
  if (eventQueue.length > 0) {
    // 使用同步XHR在页面卸载前发送
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/analytics/events', false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ events: eventQueue }));
  }
});

// 导出更多特定的跟踪函数
export const trackOcrStart = (fileInfo) => {
  trackUserAction({
    type: 'ocr_start',
    category: 'ocr',
    data: fileInfo
  });
};

export const trackOcrComplete = (fileInfo, resultInfo) => {
  trackUserAction({
    type: 'ocr_complete',
    category: 'ocr',
    data: { ...fileInfo, ...resultInfo }
  });
};

export default {
  trackUserAction,
  trackPageView,
  trackFeatureUsage,
  trackError,
  trackOcrStart,
  trackOcrComplete
};
