import User from "../models/User.js";
import bcrypt from "bcryptjs";

// 创建新用户
export const createUser = async (userData) => {
  try {
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // 使用Mongoose创建用户
    const newUser = await User.create({
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      tags: userData.tags || [],
    });

    // 返回用户信息
    return newUser;
  } catch (error) {
    throw error;
  }
};

// 通过电子邮件查找用户
export const findUserByEmail = async (email) => {
  try {
    return await User.findOne({ email });
  } catch (error) {
    throw error;
  }
};

// 通过用户名查找用户
export const findUserByUsername = async (username) => {
  try {
    return await User.findOne({ username });
  } catch (error) {
    throw error;
  }
};

// 通过ID查找用户
export const findUserById = async (id) => {
  try {
    // 尝试直接查找，支持字符串ID或ObjectId
    const user = await User.findById(id);
    if (user) return user;

    // 如果没有找到，尝试使用_id作为字符串查找
    return await User.findOne({ _id: id });
  } catch (error) {
    throw error;
  }
};

// 获取所有用户
export const getAllUsers = async () => {
  try {
    return await User.find({});
  } catch (error) {
    throw error;
  }
};

// 验证用户密码
export const verifyPassword = async (password, hashedPassword) => {
  try {
    console.log("开始验证密码", {
      passwordLength: password?.length,
      hashedPasswordLength: hashedPassword?.length,
      passwordType: typeof password,
      hashedPasswordType: typeof hashedPassword,
    });

    // 确保密码和哈希值都是有效的
    if (!password || !hashedPassword) {
      console.error("密码验证失败：密码或哈希值为空", {
        passwordEmpty: !password,
        hashedPasswordEmpty: !hashedPassword,
      });
      return false;
    }

    const result = await bcrypt.compare(password, hashedPassword);
    console.log("密码验证结果", { result });
    return result;
  } catch (error) {
    console.error("密码验证出错", error);
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

    // 查找并更新用户
    const user = await User.findById(id);
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

    // 查找并更新用户统计信息
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    // 获取当前统计信息，更新后保存
    const ocrStats = user.ocrStats || { totalImages: 0 };
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
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }
    return user.ocrStats;
  } catch (error) {
    throw error;
  }
};

// 删除用户（软删除）
export const deleteUser = async (userId) => {
  try {
    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    // MongoDB中没有内置的软删除功能，我们通过更新用户状态来实现
    user.status = "deactivated";
    user.tokenVersion = (user.tokenVersion || 0) + 1; // 使所有当前的令牌失效

    await user.save();
    return user;
  } catch (error) {
    throw error;
  }
};

// 增加用户的令牌版本，使所有现有令牌失效
export const incrementTokenVersion = async (userId) => {
  try {
    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    // 增加令牌版本
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();
    return user;
  } catch (error) {
    throw error;
  }
};
