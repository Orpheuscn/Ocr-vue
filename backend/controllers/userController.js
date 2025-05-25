import * as userService from "../services/userService.js";
import * as ocrRecordService from "../services/ocrRecordService.js";
import { getLanguageName } from "../services/languageService.js";
import passport from "passport";
import { generateAccessToken, generateRefreshToken } from "../middleware/authMiddleware.js";
import config from "../utils/envConfig.js";
import { getLogger } from "../utils/logger.js";
import {
  clearAuthCookies,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from "../middleware/cookieMiddleware.js";

const logger = getLogger("user");

// 获取所有用户（仅用于开发环境）
export const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();

    res.status(200).json({
      success: true,
      message: "获取所有用户成功",
      data: users.map((user) => ({
        username: user.username,
        email: user.email,
        id: user.id,
        lastLogin: user.lastLogin,
      })),
    });
  } catch (error) {
    console.error("获取所有用户错误:", error);
    res.status(500).json({
      success: false,
      message: "获取用户列表失败",
      error: error.message,
    });
  }
};

// 用户注册
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "用户名、邮箱和密码为必填项",
      });
    }

    // 检查邮箱是否已存在
    const existingUserByEmail = await userService.findUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: "该邮箱已被注册",
      });
    }

    // 检查用户名是否已存在
    const existingUserByUsername = await userService.findUserByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({
        success: false,
        message: "该用户名已被使用",
      });
    }

    // 创建新用户
    const newUser = await userService.createUser({ username, email, password });

    // 生成令牌
    const token = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // 设置HttpOnly Cookie
    setAccessTokenCookie(res, token);
    setRefreshTokenCookie(res, refreshToken);

    logger.info("用户注册成功", { userId: newUser.id, email });

    // 返回成功响应，同时在响应体中返回令牌（向后兼容）
    res.status(201).json({
      success: true,
      message: "注册成功",
      data: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        isAdmin: newUser.isAdmin || false,
        token,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error("注册错误", { error });
    res.status(500).json({
      success: false,
      message: "注册失败",
      error: process.env.NODE_ENV === "production" ? "服务器错误" : error.message,
    });
  }
};

// 用户登录
export const login = (req, res, next) => {
  console.log("登录请求开始处理", {
    body: req.body,
    headers: req.headers,
    cookies: req.cookies,
    method: req.method,
    path: req.path,
  });

  passport.authenticate("local", { session: false }, async (err, user, info) => {
    try {
      if (err) {
        console.error("登录认证错误", err);
        logger.error("登录认证错误", { error: err });
        return next(err);
      }

      if (!user) {
        console.warn("登录失败：用户名或密码错误", { email: req.body.email, info });
        logger.warn("登录失败：用户名或密码错误", { email: req.body.email, info });
        return res.status(401).json({
          success: false,
          message: info.message || "邮箱或密码不正确",
        });
      }

      console.log("用户验证成功", { userId: user.id || user._id, email: user.email });

      // 更新最后登录时间
      await userService.updateUser(user.id || user._id, { lastLogin: new Date() });

      // 生成令牌
      const token = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      console.log("令牌生成成功", {
        tokenLength: token.length,
        refreshTokenLength: refreshToken.length,
      });

      // 设置HttpOnly Cookie
      setAccessTokenCookie(res, token);
      setRefreshTokenCookie(res, refreshToken);

      console.log("Cookie设置完成");

      logger.info("用户登录成功", { userId: user.id || user._id });

      // 登录成功，同时在响应体中返回令牌（向后兼容）
      const responseData = {
        success: true,
        message: "登录成功",
        data: {
          id: user.id || user._id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin || false,
          token,
          refreshToken,
        },
      };

      console.log("准备发送登录成功响应");
      return res.status(200).json(responseData);
    } catch (error) {
      logger.error("登录处理错误", { error });
      return res.status(500).json({
        success: false,
        message: "登录失败",
        error: process.env.NODE_ENV === "production" ? "服务器错误" : error.message,
      });
    }
  })(req, res, next);
};

// 获取用户信息
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    // 查找用户
    const user = await userService.findUserById(userId);

    // 如果用户不存在
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    // 获取用户OCR统计摘要
    const ocrSummary = await ocrRecordService.getUserOcrSummary(userId);

    // 获取用户使用过的语言统计，生成语言标签
    let languageTags = [];
    try {
      const languageStats = await ocrRecordService.getUserLanguageStats(userId);

      // 将语言代码转换为中文名称作为标签
      languageTags = await Promise.all(
        languageStats.map(async (stat) => {
          try {
            const languageName = getLanguageName(stat._id, "zh");
            return languageName;
          } catch (error) {
            console.warn(`获取语言名称失败: ${stat._id}`, error);
            return stat._id; // 如果获取失败，使用语言代码
          }
        })
      );

      // 过滤掉重复和无效的标签
      languageTags = [...new Set(languageTags)].filter((tag) => tag && tag.trim() !== "");
    } catch (error) {
      console.warn("获取用户语言统计失败:", error);
      languageTags = [];
    }

    // 返回用户信息
    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin || false,
        tags: languageTags, // 使用自动生成的语言标签替代用户手动设置的标签
        ocrStats: user.ocrStats,
        ocrSummary,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("获取用户信息错误:", error);
    res.status(500).json({
      success: false,
      message: "获取用户信息失败",
      error: error.message,
    });
  }
};

// 更新用户信息
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, email, tags } = req.body;

    // 查找用户
    const user = await userService.findUserById(userId);

    // 如果用户不存在
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    // 如果更新邮箱，检查是否已被使用
    if (email && email !== user.email) {
      const existingUserByEmail = await userService.findUserByEmail(email);
      if (existingUserByEmail && existingUserByEmail.id.toString() !== userId) {
        return res.status(400).json({
          success: false,
          message: "该邮箱已被注册",
        });
      }
    }

    // 如果更新用户名，检查是否已被使用
    if (username && username !== user.username) {
      const existingUserByUsername = await userService.findUserByUsername(username);
      if (existingUserByUsername && existingUserByUsername.id.toString() !== userId) {
        return res.status(400).json({
          success: false,
          message: "该用户名已被使用",
        });
      }
    }

    // 更新用户信息
    const updatedUser = await userService.updateUser(userId, { username, email, tags });

    // 返回更新后的用户信息
    res.status(200).json({
      success: true,
      message: "用户信息更新成功",
      data: updatedUser,
    });
  } catch (error) {
    console.error("更新用户信息错误:", error);
    res.status(500).json({
      success: false,
      message: "更新用户信息失败",
      error: error.message,
    });
  }
};

// 获取用户OCR历史记录
export const getUserOcrHistory = async (req, res) => {
  try {
    const userId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // 验证用户存在
    const user = await userService.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    // 计算跳过的记录数
    const skip = (page - 1) * limit;

    // 获取用户OCR记录
    const ocrHistory = await ocrRecordService.getUserOcrRecords(userId, limit, skip);

    res.status(200).json({
      success: true,
      data: ocrHistory,
    });
  } catch (error) {
    console.error("获取用户OCR历史记录错误:", error);
    res.status(500).json({
      success: false,
      message: "获取OCR历史记录失败",
      error: error.message,
    });
  }
};

// 刷新令牌
export const refreshToken = async (req, res) => {
  console.log("刷新令牌控制器开始处理", {
    userId: req.userId,
    tokenVersion: req.tokenVersion,
  });

  try {
    const userId = req.userId; // 从中间件获取

    // 查找用户
    console.log("查找用户:", userId);
    const user = await userService.findUserById(userId);
    if (!user) {
      console.warn("刷新令牌失败：用户不存在", { userId });
      logger.warn("刷新令牌失败：用户不存在", { userId });
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    console.log("用户找到:", {
      id: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
    });

    // 检查令牌版本
    if (user.tokenVersion !== req.tokenVersion) {
      console.warn("刷新令牌失败：令牌版本不匹配", {
        userTokenVersion: user.tokenVersion,
        requestTokenVersion: req.tokenVersion,
      });
      return res.status(401).json({
        success: false,
        message: "令牌已失效，请重新登录",
      });
    }

    // 生成新令牌
    console.log("生成新令牌...");
    const newToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // 设置HttpOnly Cookie
    console.log("设置HttpOnly Cookie...");
    setAccessTokenCookie(res, newToken);
    setRefreshTokenCookie(res, newRefreshToken);

    console.log("令牌刷新成功");
    logger.info("令牌刷新成功", { userId });

    // 返回新令牌（向后兼容）
    res.status(200).json({
      success: true,
      message: "令牌刷新成功",
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin || false,
      },
    });
  } catch (error) {
    console.error("刷新令牌错误", { error: error.message, stack: error.stack });
    logger.error("刷新令牌错误", { error });
    res.status(500).json({
      success: false,
      message: "刷新令牌失败",
      error: process.env.NODE_ENV === "production" ? "服务器错误" : error.message,
    });
  }
};

// 注销账户
export const deactivateAccount = async (req, res) => {
  try {
    const userId = req.params.id;

    // 确保用户只能注销自己的账户，或者管理员可以注销任何账户
    if (req.user.id.toString() !== userId && !req.user.isAdmin) {
      logger.warn("用户尝试注销其他用户账户", {
        userId: req.user.id,
        targetUserId: userId,
      });

      return res.status(403).json({
        success: false,
        message: "您没有权限执行此操作",
      });
    }

    // 使用新的deleteUser方法来软删除用户
    const user = await userService.deleteUser(userId);

    logger.info("用户账户已注销", { userId });

    res.status(200).json({
      success: true,
      message: "账户已成功注销",
    });
  } catch (error) {
    logger.error("注销账户错误", { error, userId: req.params.id });
    res.status(500).json({
      success: false,
      message: "注销账户失败",
      error: process.env.NODE_ENV === "production" ? "服务器错误" : error.message,
    });
  }
};

// 用户登出
export const logout = (req, res) => {
  try {
    // 清除认证Cookie
    clearAuthCookies(res);

    // 如果用户已登录，记录登出信息
    if (req.user) {
      logger.info("用户登出", { userId: req.user.id });

      // 增加用户的令牌版本，使所有现有令牌失效
      userService
        .incrementTokenVersion(req.user.id)
        .catch((error) => logger.error("增加令牌版本失败", { error, userId: req.user.id }));
    }

    res.status(200).json({
      success: true,
      message: "登出成功",
    });
  } catch (error) {
    logger.error("登出错误", { error, userId: req.user ? req.user.id : null });
    res.status(500).json({
      success: false,
      message: "登出失败",
      error: process.env.NODE_ENV === "production" ? "服务器错误" : error.message,
    });
  }
};
