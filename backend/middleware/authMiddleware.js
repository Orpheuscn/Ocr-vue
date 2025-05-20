// middleware/authMiddleware.js
import passport from "passport";
import jwt from "jsonwebtoken";
import config from "../utils/envConfig.js";
import { getLogger } from "../utils/logger.js";
import { getAccessTokenFromRequest, getRefreshTokenFromRequest } from "./cookieMiddleware.js";
import User from "../models/User.js";

const logger = getLogger("auth");

// JWT认证中间件
export const authenticateJwt = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      logger.error("JWT认证错误", { error: err });
      return next(err);
    }

    if (!user) {
      logger.warn("JWT认证失败", {
        path: req.path,
        ip: req.ip,
        message: info ? info.message : "未授权",
      });

      return res.status(401).json({
        success: false,
        message: "未授权，请登录后重试",
      });
    }

    // 更新用户最后活动时间
    User.findByIdAndUpdate(user.id, { lastActive: new Date() }).catch((error) =>
      logger.error("更新用户最后活动时间失败", { userId: user.id, error })
    );

    req.user = user;
    return next();
  })(req, res, next);
};

// 生成访问令牌
export const generateAccessToken = (user) => {
  // 确保使用正确的ID字段
  const userId = user.id || user._id;

  return jwt.sign(
    {
      id: userId,
      email: user.email,
      isAdmin: user.isAdmin || false,
      tokenVersion: user.tokenVersion || 0,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn || "24h" }
  );
};

// 生成刷新令牌
export const generateRefreshToken = (user) => {
  // 确保使用正确的ID字段
  const userId = user.id || user._id;

  return jwt.sign(
    {
      id: userId,
      tokenVersion: user.tokenVersion || 0,
    },
    config.jwtSecret,
    { expiresIn: config.refreshTokenExpiresIn || "30d" }
  );
};

// 刷新令牌中间件
export const refreshTokenMiddleware = (req, res, next) => {
  console.log("刷新令牌中间件开始处理", {
    cookies: req.cookies,
    headers: req.headers,
    body: req.body,
    method: req.method,
    path: req.path,
  });

  // 从Cookie或请求体中获取刷新令牌
  const refreshToken = getRefreshTokenFromRequest(req);

  if (!refreshToken) {
    console.warn("刷新令牌缺失", { ip: req.ip });
    logger.warn("刷新令牌缺失", { ip: req.ip });
    return res.status(400).json({
      success: false,
      message: "需要刷新令牌",
    });
  }

  console.log("获取到刷新令牌，长度:", refreshToken.length);

  try {
    // 验证刷新令牌
    console.log("开始验证刷新令牌...");
    const decoded = jwt.verify(refreshToken, config.jwtSecret);
    console.log("刷新令牌验证成功，解码内容:", {
      id: decoded.id,
      exp: decoded.exp,
      tokenVersion: decoded.tokenVersion,
    });

    // 检查令牌是否过期
    const now = Date.now() / 1000;
    if (decoded.exp && decoded.exp < now) {
      console.warn("刷新令牌已过期", { userId: decoded.id, exp: decoded.exp, now });
      logger.warn("刷新令牌已过期", { userId: decoded.id });
      return res.status(401).json({
        success: false,
        message: "刷新令牌已过期，请重新登录",
      });
    }

    req.userId = decoded.id;
    req.tokenVersion = decoded.tokenVersion;
    console.log("刷新令牌验证通过，继续处理请求");
    next();
  } catch (error) {
    console.error("刷新令牌验证失败", { error: error.message, stack: error.stack });
    logger.warn("刷新令牌验证失败", { error: error.message, ip: req.ip });
    return res.status(401).json({
      success: false,
      message: "刷新令牌无效或已过期",
      error: process.env.NODE_ENV === "production" ? "认证失败" : error.message,
    });
  }
};

// 管理员权限检查中间件
export const requireAdmin = (req, res, next) => {
  // 确保用户已通过认证
  if (!req.user) {
    logger.warn("未认证用户尝试访问管理员资源", { ip: req.ip });
    return res.status(401).json({
      success: false,
      message: "未授权，请登录后重试",
    });
  }

  if (!req.user.isAdmin) {
    logger.warn("非管理员用户尝试访问管理员资源", { userId: req.user.id });
    return res.status(403).json({
      success: false,
      message: "需要管理员权限",
    });
  }

  logger.info("管理员访问资源", { userId: req.user.id, path: req.path });
  next();
};

// 资源所有者验证中间件
export const requireOwnership = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      // 确保用户已通过认证
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "未授权，请登录后重试",
        });
      }

      // 如果用户是管理员，允许访问
      if (req.user.isAdmin) {
        return next();
      }

      // 获取资源所有者ID
      const ownerId = await getResourceOwnerId(req);

      // 检查用户是否为资源所有者
      if (ownerId && ownerId.toString() === req.user.id.toString()) {
        return next();
      }

      // 不是资源所有者
      logger.warn("用户尝试访问不属于自己的资源", {
        userId: req.user.id,
        resourceOwnerId: ownerId,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        message: "您只能访问自己的资源",
      });
    } catch (error) {
      logger.error("所有权验证错误", { error, userId: req.user ? req.user.id : null });
      next(error);
    }
  };
};

// 验证用户是否为管理员的API端点
export const verifyAdminStatus = (req, res) => {
  // 用户已通过认证中间件验证
  res.json({
    success: true,
    isAdmin: req.user && req.user.isAdmin === true,
  });
};
