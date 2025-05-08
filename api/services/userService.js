import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { mockDb } from '../db/config.js';

// 用于跟踪是否使用内存数据库
let useMemoryDB = false;

// 设置是否使用内存数据库
export const setUseMemoryDB = (value) => {
  useMemoryDB = value;
  console.log(`User Service: ${useMemoryDB ? '使用内存数据库' : '使用MongoDB'}`);
};

// 创建新用户
export const createUser = async (userData) => {
  try {
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    if (useMemoryDB) {
      // 使用内存数据库
      return await mockDb.createUser({
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        tags: userData.tags || [],
        ocrStats: { totalImages: 0 },
        lastLogin: Date.now()
      });
    }
    
    // 使用MongoDB
    const newUser = new User({
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      tags: userData.tags || []
    });
    
    await newUser.save();
    return newUser;
  } catch (error) {
    throw error;
  }
};

// 通过电子邮件查找用户
export const findUserByEmail = async (email) => {
  try {
    if (useMemoryDB) {
      return await mockDb.findUserByEmail(email);
    }
    return await User.findOne({ email });
  } catch (error) {
    throw error;
  }
};

// 通过用户名查找用户
export const findUserByUsername = async (username) => {
  try {
    if (useMemoryDB) {
      return await mockDb.findUserByUsername(username);
    }
    return await User.findOne({ username });
  } catch (error) {
    throw error;
  }
};

// 通过ID查找用户
export const findUserById = async (id) => {
  try {
    if (useMemoryDB) {
      return Promise.resolve(mockDb.users.find(user => user._id.toString() === id.toString()));
    }
    return await User.findById(id);
  } catch (error) {
    throw error;
  }
};

// 获取所有用户
export const getAllUsers = async () => {
  try {
    if (useMemoryDB) {
      return Promise.resolve([...mockDb.users]);
    }
    return await User.find({});
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
    
    if (useMemoryDB) {
      const userIndex = mockDb.users.findIndex(user => user._id.toString() === id.toString());
      if (userIndex === -1) return null;
      
      const updatedUser = {
        ...mockDb.users[userIndex], 
        ...userData, 
        lastLogin: userData.lastLogin || Date.now()
      };
      mockDb.users[userIndex] = updatedUser;
      return updatedUser;
    }
    
    // 使用MongoDB
    return await User.findByIdAndUpdate(
      id,
      { ...userData, lastLogin: userData.lastLogin || Date.now() },
      { new: true }
    );
  } catch (error) {
    throw error;
  }
};

// 更新用户OCR统计信息
export const updateUserOcrStats = async (userId, { imageCount = 0, pdfPageCount = 0 }) => {
  try {
    if (useMemoryDB) {
      const userIndex = mockDb.users.findIndex(user => user._id.toString() === userId.toString());
      if (userIndex === -1) throw new Error('用户不存在');
      
      // 确保ocrStats存在
      if (!mockDb.users[userIndex].ocrStats) {
        mockDb.users[userIndex].ocrStats = { totalImages: 0 };
      }
      
      // 增加统计数字
      const totalCount = imageCount + pdfPageCount;
      mockDb.users[userIndex].ocrStats.totalImages += totalCount;
      
      return mockDb.users[userIndex];
    }
    
    // 使用MongoDB
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    
    // 增加统计数字，将图片和PDF页面合并计算
    const totalCount = imageCount + pdfPageCount;
    user.ocrStats.totalImages += totalCount;
    
    await user.save();
    return user;
  } catch (error) {
    throw error;
  }
};

// 获取用户OCR统计信息
export const getUserOcrStats = async (userId) => {
  try {
    if (useMemoryDB) {
      const user = mockDb.users.find(user => user._id.toString() === userId.toString());
      if (!user) throw new Error('用户不存在');
      return user.ocrStats || { totalImages: 0 };
    }
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    
    return user.ocrStats;
  } catch (error) {
    throw error;
  }
}; 