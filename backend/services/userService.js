import User from "../models/User.js";
import bcrypt from "bcryptjs";
import emailService from "./emailService.js";
import passwordValidationService from "./passwordValidationService.js";
import config from "../utils/envConfig.js";

// 创建新用户
export const createUser = async (userData) => {
  try {
    // 验证邮箱格式
    const emailValidation = passwordValidationService.validateEmail(userData.email);
    if (!emailValidation.isValid) {
      throw new Error(emailValidation.errors.join(", "));
    }

    // 验证密码强度（如果不是OAuth用户）
    if (!userData.isOAuthUser && userData.password) {
      const passwordValidation = passwordValidationService.validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(", "));
      }
    }

    // 生成邮箱验证令牌
    const emailVerificationToken = emailService.generateVerificationToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

    // 准备用户数据
    const newUserData = {
      username: userData.username,
      email: userData.email,
      tags: userData.tags || [],
      emailVerificationToken,
      emailVerificationExpires,
      emailVerified: userData.isOAuthUser || config.enableEmailVerification !== "true", // OAuth用户或开发环境直接验证
      isOAuthUser: userData.isOAuthUser || false,
      googleId: userData.googleId,
      appleId: userData.appleId,
      avatar: userData.avatar,
    };

    // 如果有密码，则加密
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      newUserData.password = await bcrypt.hash(userData.password, salt);
    }

    // 使用Mongoose创建用户
    const newUser = await User.create(newUserData);

    // 发送验证邮件（如果启用且不是OAuth用户）
    if (!userData.isOAuthUser && config.enableEmailVerification === "true") {
      try {
        await emailService.sendVerificationEmail(
          userData.email,
          userData.username,
          emailVerificationToken
        );
      } catch (emailError) {
        console.warn("发送验证邮件失败，但用户创建成功", emailError);
      }
    }

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

// 验证邮箱
export const verifyEmail = async (email, token) => {
  try {
    const user = await User.findOne({
      email: email,
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new Error("验证链接无效或已过期");
    }

    // 更新用户邮箱验证状态
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();
    return user;
  } catch (error) {
    throw error;
  }
};

// 重新发送验证邮件
export const resendVerificationEmail = async (email) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("用户不存在");
    }

    if (user.emailVerified) {
      throw new Error("邮箱已经验证过了");
    }

    // 生成新的验证令牌
    const emailVerificationToken = emailService.generateVerificationToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;

    await user.save();

    // 发送验证邮件
    await emailService.sendVerificationEmail(user.email, user.username, emailVerificationToken);

    return { success: true, message: "验证邮件已重新发送" };
  } catch (error) {
    throw error;
  }
};

// 请求密码重置
export const requestPasswordReset = async (email) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // 为了安全，不透露用户是否存在
      return { success: true, message: "如果邮箱存在，重置链接已发送" };
    }

    if (user.isOAuthUser) {
      throw new Error("OAuth用户无法重置密码，请使用第三方登录");
    }

    // 生成密码重置令牌
    const resetToken = emailService.generateVerificationToken();
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1小时后过期

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetTokenExpires;

    await user.save();

    // 发送密码重置邮件
    await emailService.sendPasswordResetEmail(user.email, user.username, resetToken);

    return { success: true, message: "密码重置链接已发送到您的邮箱" };
  } catch (error) {
    throw error;
  }
};

// 重置密码
export const resetPassword = async (email, token, newPassword) => {
  try {
    // 验证密码强度
    const passwordValidation = passwordValidationService.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors.join(", "));
    }

    const user = await User.findOne({
      email: email,
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new Error("重置链接无效或已过期");
    }

    // 加密新密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 更新密码并清除重置令牌
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // 使所有现有令牌失效

    await user.save();
    return user;
  } catch (error) {
    throw error;
  }
};
