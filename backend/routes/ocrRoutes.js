// api/routes/ocrRoutes.js
import express from "express";
import * as ocrController from "../controllers/ocrController.js";
import multer from "multer";
import { authenticateJwt } from "../middleware/authMiddleware.js";

// 配置multer用于文件上传处理
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 限制50MB
  fileFilter: (req, file, cb) => {
    // 解决文件名中文乱码问题
    file.originalname = Buffer.from(file.originalname, "latin1").toString("utf8");
    cb(null, true);
  },
});

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: OCR
 *   description: OCR 处理相关 API
 */

/**
 * @swagger
 * /api/ocr/apiStatus:
 *   get:
 *     summary: 获取 API 密钥状态
 *     description: 检查 Google Vision API 密钥是否配置
 *     tags: [OCR]
 *     responses:
 *       200:
 *         description: 成功获取 API 状态
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
 *                     apiAvailable:
 *                       type: boolean
 *                       description: API 密钥是否可用
 *                     keyPrefix:
 *                       type: string
 *                       description: API 密钥前缀（如果可用）
 *       500:
 *         description: 服务器错误
 */
router.get("/apiStatus", (req, res) => {
  // 检查环境变量中是否有Google Vision API密钥
  const hasApiKey = !!process.env.GOOGLE_VISION_API_KEY;

  res.json({
    success: true,
    data: {
      apiAvailable: hasApiKey,
      // 如果有API密钥，返回部分密钥作为确认（安全处理）
      keyPrefix: hasApiKey ? process.env.GOOGLE_VISION_API_KEY.substring(0, 8) + "..." : null,
    },
  });
});

/**
 * @swagger
 * /api/ocr/process:
 *   post:
 *     summary: 处理文件并执行 OCR
 *     description: 上传图片或 PDF 文件并执行 OCR 识别
 *     tags: [OCR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 要处理的图片或 PDF 文件
 *               mode:
 *                 type: string
 *                 enum: [text, table, mixed]
 *                 default: text
 *                 description: OCR 识别模式
 *               language:
 *                 type: string
 *                 default: auto
 *                 description: 识别语言
 *     responses:
 *       200:
 *         description: OCR 处理成功
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
 *                     text:
 *                       type: string
 *                       description: 识别的文本
 *                     blocks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: 文本块信息
 *                     processingTime:
 *                       type: number
 *                       format: float
 *                       description: 处理时间（秒）
 *       400:
 *         description: 请求参数错误或文件类型不支持
 *       401:
 *         description: 未授权
 *       413:
 *         description: 文件太大
 *       500:
 *         description: 服务器错误
 */
// 添加认证中间件，确保只有登录用户才能使用OCR功能并保存记录
router.post("/process", authenticateJwt, upload.single("file"), ocrController.processSimple);

/**
 * @swagger
 * /api/ocr/languages:
 *   get:
 *     summary: 获取支持的语言列表
 *     description: 获取 OCR 支持的语言列表
 *     tags: [OCR]
 *     responses:
 *       200:
 *         description: 成功获取语言列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                         description: 语言代码
 *                       name:
 *                         type: string
 *                         description: 语言名称
 *                       nativeName:
 *                         type: string
 *                         description: 语言本地名称
 *       500:
 *         description: 服务器错误
 */
router.get("/languages", ocrController.getSupportedLanguages);

export default router;
