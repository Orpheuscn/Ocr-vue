import User from '../models/User.js';
import bcrypt from 'bcryptjs';

// 创建新用户
export const createUser = async (userData) => {
  try {
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    // 使用Sequelize创建用户
    const newUser = await User.create({
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      tags: userData.tags || []
    });
    
    // 返回用户信息（排除密码）
    return newUser.toJSON();
  } catch (error) {
    throw error;
  }
};

// 通过电子邮件查找用户
export const findUserByEmail = async (email) => {
  try {
    return await User.findOne({ where: { email } });
  } catch (error) {
    throw error;
  }
};

// 通过用户名查找用户
export const findUserByUsername = async (username) => {
  try {
    return await User.findOne({ where: { username } });
  } catch (error) {
    throw error;
  }
};

// 通过ID查找用户
export const findUserById = async (id) => {
  try {
    return await User.findByPk(id);
  } catch (error) {
    throw error;
  }
};

// 获取所有用户
export const getAllUsers = async () => {
  try {
    return await User.findAll({
      attributes: { exclude: ['password'] }
    });
  } catch (error) {
    throw error;
  }
};

// 验证用户密码
export const verifyPassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw error;
  }
};

// 更新用户信息
export const updateUser = async (id, userData) => {
  try {
    // 如果更新包含密码，则需要加密
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
    }
    
    // 使用Sequelize更新用户
    const user = await User.findByPk(id);
    if (!user) {
      return null;
    }
    
    // 更新字段
    if (userData.username) user.username = userData.username;
    if (userData.email) user.email = userData.email;
    if (userData.password) user.password = userData.password;
    if (userData.tags) user.tags = userData.tags;
    if (userData.lastLogin) user.lastLogin = userData.lastLogin || new Date();
    
    await user.save();
    return user;
  } catch (error) {
    throw error;
  }
};

// 更新用户OCR统计信息
export const updateUserOcrStats = async (userId, { imageCount = 0, pdfPageCount = 0 }) => {
  try {
    // 增加统计数字，将图片和PDF页面合并计算
    const totalCount = imageCount + pdfPageCount;
    
    // 使用Sequelize更新统计信息
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    
    // 获取当前统计信息，更新后保存
    const ocrStats = user.ocrStats;
    ocrStats.totalImages = (ocrStats.totalImages || 0) + totalCount;
    user.ocrStats = ocrStats;
    
    await user.save();
    return user;
  } catch (error) {
    throw error;
  }
};

// 获取用户OCR统计信息
export const getUserOcrStats = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    return user.ocrStats;
  } catch (error) {
    throw error;
  }
}; 