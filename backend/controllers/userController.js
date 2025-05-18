import * as userService from "../services/userService.js";
import * as ocrRecordService from "../services/ocrRecordService.js";
import passport from "passport";
import { generateAccessToken, generateRefreshToken } from "../middleware/authMiddleware.js";
import config from "../utils/envConfig.js";

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

    // 返回成功响应
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
    console.error("注册错误:", error);
    res.status(500).json({
      success: false,
      message: "注册失败",
      error: error.message,
    });
  }
};

// 用户登录
export const login = (req, res, next) => {
  passport.authenticate("local", { session: false }, async (err, user, info) => {
    try {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: info.message || "邮箱或密码不正确",
        });
      }

      // 更新最后登录时间
      await userService.updateUser(user.id || user._id, { lastLogin: new Date() });

      // 生成令牌
      const token = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // 登录成功
      return res.status(200).json({
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
      });
    } catch (error) {
      console.error("登录错误:", error);
      return res.status(500).json({
        success: false,
        message: "登录失败",
        error: error.message,
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

    // 返回用户信息
    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin || false,
        tags: user.tags || [],
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
  try {
    const userId = req.userId; // 从中间件获取

    // 查找用户
    const user = await userService.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    // 生成新令牌
    const newToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // 返回新令牌
    res.status(200).json({
      success: true,
      message: "令牌刷新成功",
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error("刷新令牌错误:", error);
    res.status(500).json({
      success: false,
      message: "刷新令牌失败",
      error: error.message,
    });
  }
};

// 注销账户
export const deactivateAccount = async (req, res) => {
  try {
    const userId = req.params.id;

    // 确保用户只能注销自己的账户，或者管理员可以注销任何账户
    if (req.user.id.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "您没有权限执行此操作",
      });
    }

    // 使用新的deleteUser方法来软删除用户
    const user = await userService.deleteUser(userId);

    res.status(200).json({
      success: true,
      message: "账户已成功注销",
    });
  } catch (error) {
    console.error("注销账户错误:", error);
    res.status(500).json({
      success: false,
      message: "注销账户失败",
      error: error.message,
    });
  }
};
