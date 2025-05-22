// middleware/csrfMiddleware.js
import crypto from "crypto";
import config from "../utils/envConfig.js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("csrf");

// CSRF令牌密钥
const CSRF_SECRET = config.csrfSecret || crypto.randomBytes(32).toString("hex");

// 需要CSRF保护的HTTP方法
const CSRF_PROTECTED_METHODS = ["POST", "PUT", "DELETE", "PATCH"];

// 不需要CSRF保护的路径
const CSRF_EXEMPT_PATHS = [
  "/api/users/login",
  "/api/users/register",
  "/api/users/refresh-token",
  "/api/health",
  "/api-docs",
  "/api/ocr/process",
  "/api/ocr/process-simple",
  "/api/node/recognition/process", // 添加图像识别路径
  "/api/node/recognition/processBase64", // 添加Base64图像识别路径
];

/**
 * 生成CSRF令牌
 * @param {Object} req - Express请求对象
 * @returns {string} - CSRF令牌
 */
export const generateCsrfToken = (req) => {
  // 使用会话ID和密钥生成令牌
  const sessionId = req.sessionID || "";
  const timestamp = Date.now();
  const data = `${sessionId}:${timestamp}`;

  // 使用HMAC生成令牌
  const hmac = crypto.createHmac("sha256", CSRF_SECRET);
  hmac.update(data);
  const token = hmac.digest("hex");

  // 将令牌和时间戳存储在会话中
  if (req.session) {
    req.session.csrfToken = token;
    req.session.csrfTokenTimestamp = timestamp;
  }

  return token;
};

/**
 * 验证CSRF令牌
 * @param {Object} req - Express请求对象
 * @param {string} token - 要验证的CSRF令牌
 * @returns {boolean} - 令牌是否有效
 */
export const validateCsrfToken = (req, token) => {
  // 如果没有会话，无法验证
  if (!req.session) {
    logger.warn("无法验证CSRF令牌：会话不存在");
    return false;
  }

  // 获取会话中存储的令牌和时间戳
  const storedToken = req.session.csrfToken;
  const storedTimestamp = req.session.csrfTokenTimestamp;

  // 如果没有存储的令牌，无法验证
  if (!storedToken || !storedTimestamp) {
    logger.warn("无法验证CSRF令牌：会话中没有存储令牌");
    return false;
  }

  // 检查令牌是否过期（4小时改为4小时）
  const now = Date.now();
  const tokenAge = now - storedTimestamp;
  const maxAge = 4 * 60 * 60 * 1000; // 4小时

  if (tokenAge > maxAge) {
    logger.warn("CSRF令牌已过期");
    return false;
  }

  // 验证令牌
  return token === storedToken;
};

/**
 * CSRF保护中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
export const csrfProtection = (req, res, next) => {
  // 如果是不需要保护的方法，直接通过
  if (!CSRF_PROTECTED_METHODS.includes(req.method)) {
    return next();
  }

  // 如果是豁免路径，直接通过
  if (CSRF_EXEMPT_PATHS.some((path) => req.path.startsWith(path))) {
    return next();
  }

  // 获取请求中的CSRF令牌
  const token = req.headers["x-csrf-token"] || req.body._csrf;

  // 如果没有令牌，拒绝请求
  if (!token) {
    logger.warn(`CSRF保护失败：缺少令牌 [${req.method} ${req.path}]`);
    return res.status(403).json({
      success: false,
      message: "缺少CSRF令牌",
      error: "CSRF_TOKEN_MISSING",
    });
  }

  // 验证令牌
  if (!validateCsrfToken(req, token)) {
    logger.warn(`CSRF保护失败：无效令牌 [${req.method} ${req.path}]`);
    return res.status(403).json({
      success: false,
      message: "CSRF令牌无效或已过期",
      error: "CSRF_TOKEN_INVALID",
    });
  }

  // 令牌有效，继续处理请求
  next();
};

/**
 * 为响应添加CSRF令牌
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
export const addCsrfToken = (req, res, next) => {
  // 生成新的CSRF令牌
  const token = generateCsrfToken(req);

  // 将令牌添加到响应头
  res.set("X-CSRF-Token", token);

  // 继续处理请求
  next();
};

export default {
  csrfProtection,
  addCsrfToken,
  generateCsrfToken,
  validateCsrfToken,
};
