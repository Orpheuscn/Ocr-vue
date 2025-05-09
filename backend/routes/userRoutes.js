// api/routes/userRoutes.js
import express from 'express';
import * as userController from '../controllers/userController.js';

const router = express.Router();

// 获取所有用户（仅用于开发环境）
router.get('/all', userController.getAllUsers);

// 用户注册
router.post('/register', userController.register);

// 用户登录
router.post('/login', userController.login);

// 获取用户个人资料
router.get('/:id/profile', userController.getUserProfile);

// 更新用户资料
router.put('/:id', userController.updateUserProfile);

export default router; 