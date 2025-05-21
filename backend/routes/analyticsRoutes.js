// routes/analyticsRoutes.js
import express from "express";
import * as analyticsController from "../controllers/analyticsController.js";
import { authenticateJwt, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: 用户行为分析相关API
 */

/**
 * @swagger
 * /api/analytics/events:
 *   post:
 *     summary: 记录用户活动事件
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - events
 *             properties:
 *               events:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     type:
 *                       type: string
 *                     category:
 *                       type: string
 *                     data:
 *                       type: object
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     sessionId:
 *                       type: string
 *                     page:
 *                       type: string
 *     responses:
 *       200:
 *         description: 事件记录成功
 *       400:
 *         description: 无效的请求数据
 *       500:
 *         description: 服务器错误
 */
router.post("/events", analyticsController.recordEvents);

/**
 * @swagger
 * /api/analytics/users/{userId}:
 *   get:
 *     summary: 获取特定用户的活动统计
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功获取用户活动统计
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get("/users/:userId", authenticateJwt, analyticsController.getUserActivityStats);

/**
 * @swagger
 * /api/analytics/app-usage:
 *   get:
 *     summary: 获取应用整体使用统计
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: 成功获取应用使用统计
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问
 *       500:
 *         description: 服务器错误
 */
router.get("/app-usage", authenticateJwt, requireAdmin, analyticsController.getAppUsageStats);

export default router;
