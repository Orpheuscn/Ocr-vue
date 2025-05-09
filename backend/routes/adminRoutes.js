import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { isAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// 初始管理员设置路由 - 这个路由不受管理员中间件保护
// 这是一个仅在开发环境中使用的端点，用于初始设置管理员
// 在生产环境中应该被禁用或需要某种额外的安全措施
if (process.env.NODE_ENV === 'development') {
  router.put('/promote/:userId', adminController.promoteUserToAdmin);
}

// 添加一个调试端点，用于测试用户的管理员状态
router.get('/check-admin-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 导入User模型
    const User = (await import('../models/User.js')).default;
    
    // 查找用户
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 返回用户的管理员状态
    return res.json({
      success: true,
      userId,
      username: user.username,
      isAdmin: user.isAdmin === true,
      message: user.isAdmin === true ? '该用户是管理员' : '该用户不是管理员'
    });
  } catch (error) {
    console.error('检查管理员状态失败:', error);
    return res.status(500).json({
      success: false,
      message: '检查管理员状态失败',
      error: error.message
    });
  }
});

// 应用管理员权限中间件到所有其他管理路由
router.use(isAdmin);

// 服务器状态
router.get('/status', adminController.getServerStatus);

// 数据库状态
router.get('/db-status', adminController.getDbStatus);

// API状态
router.get('/api-status', adminController.getApiStatus);

// 用户数据
router.get('/users', adminController.getUsers);

// OCR记录
router.get('/ocr-records', adminController.getOcrRecords);

// API日志
router.get('/logs', adminController.getLogs);
router.delete('/logs', adminController.clearLogs);

// 执行SQL查询
router.post('/execute-query', adminController.executeQuery);

export default router; 