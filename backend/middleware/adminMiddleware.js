import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// 验证用户是否为管理员的中间件
export const isAdmin = async (req, res, next) => {
  try {
    // 获取请求头中的 Authorization 字段
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未授权，需要管理员权限'
      });
    }

    // 解析 token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 查找用户并检查是否为管理员
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (!user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: '权限不足，需要管理员权限'
      });
    }

    // 将用户信息添加到请求对象
    req.user = user;
    next();
  } catch (error) {
    console.error('管理员验证失败:', error);
    return res.status(401).json({
      success: false,
      message: '验证失败，无效的令牌',
      error: error.message
    });
  }
}; 