// backend/routes/monitoringRoutes.js
import express from "express";
import { authenticateJwt } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/adminMiddleware.js";
import {
  getSystemOverview,
  getQueueStatus,
  getPerformanceMetrics,
  getTaskStatistics,
  restartService,
} from "../controllers/monitoringController.js";

const router = express.Router();

/**
 * @swagger
 * /api/monitoring/overview:
 *   get:
 *     summary: 获取系统总览（管理员）
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 系统总览信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     services:
 *                       type: object
 *                       properties:
 *                         rabbitmq:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                               enum: [healthy, unhealthy]
 *                             details:
 *                               type: object
 *                         notification:
 *                           type: object
 *                         scheduler:
 *                           type: object
 *                     database:
 *                       type: object
 *                     queues:
 *                       type: object
 *                     system:
 *                       type: object
 *                       properties:
 *                         uptime:
 *                           type: number
 *                         memoryUsage:
 *                           type: object
 *                         cpuUsage:
 *                           type: object
 *       401:
 *         description: 用户未认证
 *       403:
 *         description: 需要管理员权限
 */
router.get("/overview", authenticateJwt, isAdmin, getSystemOverview);

/**
 * @swagger
 * /api/monitoring/queue-status:
 *   get:
 *     summary: 获取队列状态详情（管理员）
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 队列状态信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     connection:
 *                       type: object
 *                     queues:
 *                       type: object
 *                     services:
 *                       type: object
 *       401:
 *         description: 用户未认证
 *       403:
 *         description: 需要管理员权限
 */
router.get("/queue-status", authenticateJwt, isAdmin, getQueueStatus);

/**
 * @swagger
 * /api/monitoring/performance:
 *   get:
 *     summary: 获取性能指标（管理员）
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d]
 *           default: 1h
 *         description: 时间范围
 *     responses:
 *       200:
 *         description: 性能指标
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     timeRange:
 *                       type: string
 *                     ocr:
 *                       type: object
 *                       properties:
 *                         totalTasks:
 *                           type: integer
 *                         avgProcessingTime:
 *                           type: number
 *                         successRate:
 *                           type: number
 *                     notifications:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         sent:
 *                           type: integer
 *                         failed:
 *                           type: integer
 *                         pending:
 *                           type: integer
 *                     system:
 *                       type: object
 *       401:
 *         description: 用户未认证
 *       403:
 *         description: 需要管理员权限
 */
router.get("/performance", authenticateJwt, isAdmin, getPerformanceMetrics);

/**
 * @swagger
 * /api/monitoring/task-statistics:
 *   get:
 *     summary: 获取任务统计（管理员）
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month]
 *           default: today
 *         description: 统计周期
 *     responses:
 *       200:
 *         description: 任务统计信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     period:
 *                       type: string
 *                     ocrTasks:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         success:
 *                           type: integer
 *                         failed:
 *                           type: integer
 *                         processing:
 *                           type: integer
 *                     batchJobs:
 *                       type: object
 *                     scheduledTasks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           description:
 *                             type: string
 *                           cronExpression:
 *                             type: string
 *                           isRunning:
 *                             type: boolean
 *       401:
 *         description: 用户未认证
 *       403:
 *         description: 需要管理员权限
 */
router.get("/task-statistics", authenticateJwt, isAdmin, getTaskStatistics);

/**
 * @swagger
 * /api/monitoring/restart-service:
 *   post:
 *     summary: 重启服务（管理员）
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               service:
 *                 type: string
 *                 enum: [rabbitmq, notification, scheduler]
 *                 description: 要重启的服务名称
 *             required:
 *               - service
 *     responses:
 *       200:
 *         description: 服务重启成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 用户未认证
 *       403:
 *         description: 需要管理员权限
 *       500:
 *         description: 服务重启失败
 */
router.post("/restart-service", authenticateJwt, isAdmin, restartService);

export default router;
