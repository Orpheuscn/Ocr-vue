// middleware/cookieMiddleware.js
import config from "../utils/envConfig.js";

// Cookie配置
const COOKIE_CONFIG = {
  // 访问令牌Cookie配置
  accessToken: {
    name: "access_token",
    options: {
      httpOnly: true, // 防止JavaScript访问
      secure: process.env.NODE_ENV === "production", // 在生产环境中只通过HTTPS发送
      sameSite: "lax", // 使用lax而不是strict，允许从外部链接导航时发送Cookie
      path: "/", // 所有路径都可访问
      maxAge: 24 * 60 * 60 * 1000, // 24小时，与JWT过期时间一致
      domain: undefined, // 使用当前域名，确保跨子域可用
    },
  },
  // 刷新令牌Cookie配置
  refreshToken: {
    name: "refresh_token",
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // 使用lax而不是strict
      path: "/", // 修改为根路径，确保所有API请求都能访问
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30天，与刷新令牌过期时间一致
      domain: undefined, // 使用当前域名，确保跨子域可用
    },
  },
};

/**
 * 设置访问令牌Cookie
 * @param {Object} res - Express响应对象
 * @param {string} token - JWT访问令牌
 */
export const setAccessTokenCookie = (res, token) => {
  res.cookie(COOKIE_CONFIG.accessToken.name, token, COOKIE_CONFIG.accessToken.options);
};

/**
 * 设置刷新令牌Cookie
 * @param {Object} res - Express响应对象
 * @param {string} token - JWT刷新令牌
 */
export const setRefreshTokenCookie = (res, token) => {
  res.cookie(COOKIE_CONFIG.refreshToken.name, token, COOKIE_CONFIG.refreshToken.options);
};

/**
 * 清除认证Cookie
 * @param {Object} res - Express响应对象
 */
export const clearAuthCookies = (res) => {
  // 清除访问令牌Cookie
  res.clearCookie(COOKIE_CONFIG.accessToken.name, {
    path: COOKIE_CONFIG.accessToken.options.path,
  });

  // 清除刷新令牌Cookie
  res.clearCookie(COOKIE_CONFIG.refreshToken.name, {
    path: COOKIE_CONFIG.refreshToken.options.path,
  });
};

/**
 * 从请求中获取访问令牌
 * @param {Object} req - Express请求对象
 * @returns {string|null} - 访问令牌或null
 */
export const getAccessTokenFromRequest = (req) => {
  // 优先从Cookie中获取
  if (req.cookies && req.cookies[COOKIE_CONFIG.accessToken.name]) {
    return req.cookies[COOKIE_CONFIG.accessToken.name];
  }

  // 其次从Authorization头中获取
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  return null;
};

/**
 * 从请求中获取刷新令牌
 * @param {Object} req - Express请求对象
 * @returns {string|null} - 刷新令牌或null
 */
export const getRefreshTokenFromRequest = (req) => {
  console.log("尝试从请求中获取刷新令牌");
  console.log("请求cookies:", req.cookies);

  // 优先从Cookie中获取
  if (req.cookies && req.cookies[COOKIE_CONFIG.refreshToken.name]) {
    console.log("从Cookie中获取到刷新令牌");
    return req.cookies[COOKIE_CONFIG.refreshToken.name];
  }

  console.log("Cookie中没有刷新令牌，检查请求体");
  console.log("请求体:", req.body);

  // 其次从请求体中获取
  if (req.body && req.body.refreshToken) {
    console.log("从请求体中获取到刷新令牌");
    return req.body.refreshToken;
  }

  console.log("在请求中未找到刷新令牌");
  return null;
};

/**
 * 更新JWT策略配置，使其从Cookie中获取令牌
 * @param {Object} jwtOptions - JWT策略选项
 * @returns {Object} - 更新后的JWT策略选项
 */
export const updateJwtOptions = (jwtOptions) => {
  // 自定义JWT提取函数，优先从Cookie中获取
  jwtOptions.jwtFromRequest = (req) => {
    return getAccessTokenFromRequest(req);
  };

  return jwtOptions;
};

export default {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
  getAccessTokenFromRequest,
  getRefreshTokenFromRequest,
  updateJwtOptions,
  COOKIE_CONFIG,
};
