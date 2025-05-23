// backend/routes/ocrQueueRoutes.js
import express from "express";
import multer from "multer";
import { authenticateJwt } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/adminMiddleware.js";
import {
  submitDocumentAnalysisTask,
  getTaskStatus,
  getUserTasks,
  cancelTask,
  getQueueStats,
} from "../controllers/ocrQueueController.js";

const router = express.Router();

// 配置multer用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("只支持图像文件"), false);
    }
  },
});

/**
 * @swagger
 * /api/ocr-queue/submit:
 *   post:
 *     summary: 提交文档解析任务到队列
 *     tags: [Document Analysis Queue]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 要处理的图像文件
 *               languageHints:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 语言提示
 *               recognitionDirection:
 *                 type: string
 *                 enum: [horizontal, vertical]
 *                 default: horizontal
 *                 description: 识别方向
 *               recognitionMode:
 *                 type: string
 *                 enum: [text, document]
 *                 default: text
 *                 description: 识别模式
 *               rectangles:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     class:
 *                       type: string
 *                     x:
 *                       type: number
 *                     y:
 *                       type: number
 *                     width:
 *                       type: number
 *                     height:
 *                       type: number
 *                 description: 识别区域矩形
 *     responses:
 *       200:
 *         description: 任务提交成功
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
 *                     taskId:
 *                       type: string
 *                     imageId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     message:
 *                       type: string
 *                     estimatedTime:
 *                       type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 用户未认证
 *       503:
 *         description: 服务暂时不可用
 */
router.post("/submit", authenticateJwt, upload.single("file"), submitDocumentAnalysisTask);

/**
 * @swagger
 * /api/ocr-queue/task/{taskId}/status:
 *   get:
 *     summary: 获取OCR任务状态
 *     tags: [OCR Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: 任务ID
 *     responses:
 *       200:
 *         description: 任务状态
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
 *                     taskId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [queued, processing, completed, failed, cancelled]
 *                     progress:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *                     message:
 *                       type: string
 *                     result:
 *                       type: object
 *                     error:
 *                       type: object
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 用户未认证
 *       404:
 *         description: 任务不存在
 */
router.get("/task/:taskId/status", authenticateJwt, getTaskStatus);

/**
 * @swagger
 * /api/ocr-queue/tasks:
 *   get:
 *     summary: 获取用户的OCR任务列表
 *     tags: [OCR Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [queued, processing, completed, failed, cancelled]
 *         description: 任务状态过滤
 *     responses:
 *       200:
 *         description: 任务列表
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
 *                     tasks:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: 用户未认证
 */
router.get("/tasks", authenticateJwt, getUserTasks);

/**
 * @swagger
 * /api/ocr-queue/task/{taskId}/cancel:
 *   post:
 *     summary: 取消OCR任务
 *     tags: [OCR Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: 任务ID
 *     responses:
 *       200:
 *         description: 任务取消成功
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
 *                     taskId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     message:
 *                       type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 用户未认证
 *       404:
 *         description: 任务不存在
 *       409:
 *         description: 任务无法取消
 */
router.post("/task/:taskId/cancel", authenticateJwt, cancelTask);

/**
 * @swagger
 * /api/ocr-queue/stats:
 *   get:
 *     summary: 获取队列状态统计（管理员）
 *     tags: [OCR Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 队列统计信息
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
 *                     rabbitmq:
 *                       type: object
 *                     queues:
 *                       type: object
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalTasks:
 *                           type: integer
 *                         completedTasks:
 *                           type: integer
 *                         failedTasks:
 *                           type: integer
 *                         averageProcessingTime:
 *                           type: number
 *       401:
 *         description: 用户未认证
 *       403:
 *         description: 需要管理员权限
 */
router.get("/stats", authenticateJwt, isAdmin, getQueueStats);

export default router;
