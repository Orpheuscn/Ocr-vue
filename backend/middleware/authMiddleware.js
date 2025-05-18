// middleware/authMiddleware.js
import passport from "passport";
import jwt from "jsonwebtoken";
import config from "../utils/envConfig.js";

// JWT认证中间件
export const authenticateJwt = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "未授权，请登录后重试",
      });
    }

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
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: "需要刷新令牌",
    });
  }

  try {
    // 验证刷新令牌
    const decoded = jwt.verify(refreshToken, config.jwtSecret);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "刷新令牌无效或已过期",
      error: error.message,
    });
  }
};

// 管理员权限检查中间件
export const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: "需要管理员权限",
    });
  }
  next();
};
