import * as userService from '../services/userService.js';
import * as ocrRecordService from '../services/ocrRecordService.js';
import jwt from 'jsonwebtoken';

// 获取所有用户（仅用于开发环境）
export const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    
    res.status(200).json({
      success: true,
      message: '获取所有用户成功',
      data: users.map(user => ({
        username: user.username,
        email: user.email,
        id: user.id,
        lastLogin: user.lastLogin
      }))
    });
  } catch (error) {
    console.error('获取所有用户错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      error: error.message
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
        message: '用户名、邮箱和密码为必填项'
      });
    }
    
    // 检查邮箱是否已存在
    const existingUserByEmail = await userService.findUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: '该邮箱已被注册'
      });
    }
    
    // 检查用户名是否已存在
    const existingUserByUsername = await userService.findUserByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({
        success: false,
        message: '该用户名已被使用'
      });
    }
    
    // 创建新用户
    const newUser = await userService.createUser({ username, email, password });
    
    // 返回成功响应
    res.status(201).json({
      success: true,
      message: '注册成功',
      data: newUser
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '注册失败',
      error: error.message
    });
  }
};

// 用户登录
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 验证必填字段
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '邮箱和密码为必填项'
      });
    }
    
    // 查找用户
    const user = await userService.findUserByEmail(email);
    
    // 如果用户不存在
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码不正确'
      });
    }
    
    // 验证密码
    const isPasswordValid = await userService.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码不正确'
      });
    }
    
    // 更新最后登录时间
    await userService.updateUser(user.id, { lastLogin: new Date() });
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, isAdmin: user.isAdmin || false },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // 令牌24小时有效
    );
    
    // 登录成功
    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin || false,
        token: token // 返回JWT令牌
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: error.message
    });
  }
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
        message: '用户不存在'
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
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: error.message
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
        message: '用户不存在'
      });
    }
    
    // 如果更新邮箱，检查是否已被使用
    if (email && email !== user.email) {
      const existingUserByEmail = await userService.findUserByEmail(email);
      if (existingUserByEmail && existingUserByEmail.id.toString() !== userId) {
        return res.status(400).json({
          success: false,
          message: '该邮箱已被注册'
        });
      }
    }
    
    // 如果更新用户名，检查是否已被使用
    if (username && username !== user.username) {
      const existingUserByUsername = await userService.findUserByUsername(username);
      if (existingUserByUsername && existingUserByUsername.id.toString() !== userId) {
        return res.status(400).json({
          success: false,
          message: '该用户名已被使用'
        });
      }
    }
    
    // 更新用户信息
    const updatedUser = await userService.updateUser(userId, { username, email, tags });
    
    // 返回更新后的用户信息
    res.status(200).json({
      success: true,
      message: '用户信息更新成功',
      data: updatedUser
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '更新用户信息失败',
      error: error.message
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
        message: '用户不存在'
      });
    }
    
    // 计算跳过的记录数
    const skip = (page - 1) * limit;
    
    // 获取用户OCR记录
    const ocrHistory = await ocrRecordService.getUserOcrRecords(userId, limit, skip);
    
    res.status(200).json({
      success: true,
      data: ocrHistory
    });
  } catch (error) {
    console.error('获取用户OCR历史记录错误:', error);
    res.status(500).json({
      success: false,
      message: '获取OCR历史记录失败',
      error: error.message
    });
  }
}; 