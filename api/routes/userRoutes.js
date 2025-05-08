// api/routes/userRoutes.js
import express from 'express';
import * as userController from '../controllers/userController.js';

const router = express.Router();

// 用户注册
router.post('/register', userController.register);

// 用户登录
router.post('/login', userController.login);

// 获取用户信息
router.get('/profile/:id', userController.getUserProfile);

// 更新用户信息
router.put('/profile/:id', userController.updateUserProfile);

export default router; 