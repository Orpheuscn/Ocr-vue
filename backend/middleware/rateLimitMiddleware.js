// middleware/rateLimitMiddleware.js
import { getLogger } from '../utils/logger.js';
import { rateLimitError } from './errorMiddleware.js';

const logger = getLogger('rateLimit');

// 内存存储，用于存储请求计数
// 注意：在生产环境中，应该使用Redis等分布式存储
const requestCounts = new Map();

// 默认配置
const DEFAULT_CONFIG = {
  // 窗口大小（毫秒）
  windowMs: 60 * 1000, // 1分钟
  // 窗口内最大请求数
  maxRequests: 30, // 每分钟30个请求
  // 是否根据IP限制
  limitByIp: true,
  // 是否根据用户ID限制
  limitByUserId: true,
  // 是否跳过对管理员的限制
  skipAdmin: true,
  // 自定义消息
  message: '请求过于频繁，请稍后再试',
  // 自定义标识符函数
  identifierFn: null
};

/**
 * 获取请求标识符
 * @param {Object} req - Express请求对象
 * @param {Object} options - 配置选项
 * @returns {string} - 请求标识符
 */
const getRequestIdentifier = (req, options) => {
  // 如果提供了自定义标识符函数，使用它
  if (options.identifierFn) {
    return options.identifierFn(req);
  }
  
  // 构建标识符
  const parts = [];
  
  // 添加路径
  parts.push(req.path);
  
  // 添加IP
  if (options.limitByIp) {
    parts.push(req.ip);
  }
  
  // 添加用户ID
  if (options.limitByUserId && req.user && req.user.id) {
    parts.push(req.user.id);
  }
  
  return parts.join(':');
};

/**
 * 创建速率限制中间件
 * @param {Object} customConfig - 自定义配置
 * @returns {Function} - 中间件函数
 */
export const rateLimit = (customConfig = {}) => {
  // 合并配置
  const options = { ...DEFAULT_CONFIG, ...customConfig };
  
  // 返回中间件函数
  return (req, res, next) => {
    try {
      // 如果是管理员且配置为跳过管理员，直接通过
      if (options.skipAdmin && req.user && req.user.isAdmin) {
        return next();
      }
      
      // 获取请求标识符
      const identifier = getRequestIdentifier(req, options);
      
      // 获取当前时间
      const now = Date.now();
      
      // 获取或创建请求记录
      let record = requestCounts.get(identifier);
      if (!record) {
        record = {
          count: 0,
          resetTime: now + options.windowMs
        };
        requestCounts.set(identifier, record);
      }
      
      // 如果已经过了重置时间，重置计数
      if (now > record.resetTime) {
        record.count = 0;
        record.resetTime = now + options.windowMs;
      }
      
      // 增加请求计数
      record.count++;
      
      // 设置RateLimit响应头
      res.set('X-RateLimit-Limit', options.maxRequests.toString());
      res.set('X-RateLimit-Remaining', Math.max(0, options.maxRequests - record.count).toString());
      res.set('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());
      
      // 如果超过限制，拒绝请求
      if (record.count > options.maxRequests) {
        logger.warn('速率限制超过', {
          identifier,
          count: record.count,
          limit: options.maxRequests,
          path: req.path,
          ip: req.ip,
          userId: req.user ? req.user.id : null
        });
        
        // 设置Retry-After响应头
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        res.set('Retry-After', retryAfter.toString());
        
        // 返回错误响应
        return next(rateLimitError(options.message));
      }
      
      // 请求未超过限制，继续处理
      next();
    } catch (error) {
      logger.error('速率限制中间件错误', { error });
      next(error);
    }
  };
};

// 清理过期的请求记录
setInterval(() => {
  const now = Date.now();
  for (const [identifier, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(identifier);
    }
  }
}, 60 * 1000); // 每分钟清理一次

// 为不同类型的请求创建预配置的速率限制中间件
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 30, // 每分钟30个请求
  message: 'API请求过于频繁，请稍后再试'
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  maxRequests: 10, // 每15分钟10个请求
  message: '登录尝试过于频繁，请稍后再试',
  identifierFn: (req) => `auth:${req.ip}`
});

export const ocrRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 5, // 每分钟5个请求
  message: 'OCR请求过于频繁，请稍后再试'
});

export default {
  rateLimit,
  apiRateLimit,
  authRateLimit,
  ocrRateLimit
};
