// api/routes/userRoutes.js
import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticateJwt, refreshTokenMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: 用户管理 API
 */

/**
 * @swagger
 * /api/users/all:
 *   get:
 *     summary: 获取所有用户
 *     description: 仅用于开发环境，获取所有用户列表
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取用户列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/all', authenticateJwt, userController.getAllUsers);

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: 用户注册
 *     description: 创建新用户
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: 用户创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: 请求参数错误
 *       409:
 *         description: 用户名或邮箱已存在
 *       500:
 *         description: 服务器错误
 */
router.post('/register', userController.register);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: 用户登录
 *     description: 用户登录并获取认证令牌
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 邮箱或密码错误
 *       500:
 *         description: 服务器错误
 */
router.post('/login', userController.login);

/**
 * @swagger
 * /api/users/refresh-token:
 *   post:
 *     summary: 刷新认证令牌
 *     description: 使用刷新令牌获取新的访问令牌
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: 刷新令牌成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 刷新令牌无效或已过期
 *       500:
 *         description: 服务器错误
 */
router.post('/refresh-token', refreshTokenMiddleware, userController.refreshToken);

/**
 * @swagger
 * /api/users/{id}/profile:
 *   get:
 *     summary: 获取用户个人资料
 *     description: 获取指定用户的个人资料
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 成功获取用户资料
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: 未授权
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:id/profile', authenticateJwt, userController.getUserProfile);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: 更新用户资料
 *     description: 更新指定用户的个人资料
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 用户ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 用户资料更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器错误
 */
router.put('/:id', authenticateJwt, userController.updateUserProfile);

/**
 * @swagger
 * /api/users/{id}/deactivate:
 *   delete:
 *     summary: 注销用户账户
 *     description: 注销指定用户的账户（软删除）
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 账户注销成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器错误
 */
router.delete('/:id/deactivate', authenticateJwt, userController.deactivateAccount);

export default router; 