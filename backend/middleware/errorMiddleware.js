// middleware/errorMiddleware.js
import { getLogger } from '../utils/logger.js';

const logger = getLogger('error');

// 错误类型
export const ERROR_TYPES = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  CONFLICT: 'CONFLICT_ERROR',
  INTERNAL: 'INTERNAL_ERROR',
  EXTERNAL: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  BAD_REQUEST: 'BAD_REQUEST_ERROR',
  CSRF: 'CSRF_ERROR'
};

/**
 * 创建自定义错误
 * @param {string} message - 错误消息
 * @param {string} type - 错误类型
 * @param {number} statusCode - HTTP状态码
 * @param {Object} details - 错误详情
 * @returns {Error} - 自定义错误对象
 */
export const createError = (message, type = ERROR_TYPES.INTERNAL, statusCode = 500, details = {}) => {
  const error = new Error(message);
  error.type = type;
  error.statusCode = statusCode;
  error.details = details;
  return error;
};

/**
 * 验证错误
 * @param {string} message - 错误消息
 * @param {Object} details - 错误详情
 * @returns {Error} - 验证错误对象
 */
export const validationError = (message, details = {}) => {
  return createError(message, ERROR_TYPES.VALIDATION, 400, details);
};

/**
 * 认证错误
 * @param {string} message - 错误消息
 * @returns {Error} - 认证错误对象
 */
export const authenticationError = (message = '未授权，请登录后重试') => {
  return createError(message, ERROR_TYPES.AUTHENTICATION, 401);
};

/**
 * 授权错误
 * @param {string} message - 错误消息
 * @returns {Error} - 授权错误对象
 */
export const authorizationError = (message = '权限不足，无法执行此操作') => {
  return createError(message, ERROR_TYPES.AUTHORIZATION, 403);
};

/**
 * 资源不存在错误
 * @param {string} resource - 资源名称
 * @param {string} id - 资源ID
 * @returns {Error} - 资源不存在错误对象
 */
export const notFoundError = (resource, id) => {
  const message = id ? `${resource} ID ${id} 不存在` : `${resource}不存在`;
  return createError(message, ERROR_TYPES.NOT_FOUND, 404);
};

/**
 * 冲突错误
 * @param {string} message - 错误消息
 * @returns {Error} - 冲突错误对象
 */
export const conflictError = (message) => {
  return createError(message, ERROR_TYPES.CONFLICT, 409);
};

/**
 * 速率限制错误
 * @param {string} message - 错误消息
 * @returns {Error} - 速率限制错误对象
 */
export const rateLimitError = (message = '请求过于频繁，请稍后再试') => {
  return createError(message, ERROR_TYPES.RATE_LIMIT, 429);
};

/**
 * 错误处理中间件
 * @param {Error} err - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
export const errorHandler = (err, req, res, next) => {
  // 获取错误信息
  const statusCode = err.statusCode || 500;
  const type = err.type || ERROR_TYPES.INTERNAL;
  const message = err.message || '服务器内部错误';
  
  // 记录错误
  if (statusCode >= 500) {
    logger.error(`服务器错误: ${message}`, {
      error: {
        type,
        stack: err.stack,
        details: err.details
      },
      request: {
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        user: req.user ? { id: req.user.id } : null
      }
    });
  } else {
    logger.warn(`客户端错误 (${statusCode}): ${message}`, {
      error: {
        type,
        details: err.details
      },
      request: {
        method: req.method,
        path: req.path,
        ip: req.ip
      }
    });
  }
  
  // 构建错误响应
  const errorResponse = {
    success: false,
    message,
    error: {
      type,
      code: statusCode
    }
  };
  
  // 在开发环境中添加更多详细信息
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error.details = err.details;
    errorResponse.error.stack = err.stack;
  }
  
  // 发送错误响应
  res.status(statusCode).json(errorResponse);
};

/**
 * 404错误处理中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
export const notFoundHandler = (req, res, next) => {
  const error = notFoundError('路径', req.originalUrl);
  next(error);
};

export default {
  errorHandler,
  notFoundHandler,
  createError,
  validationError,
  authenticationError,
  authorizationError,
  notFoundError,
  conflictError,
  rateLimitError,
  ERROR_TYPES
};
