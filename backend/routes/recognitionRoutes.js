// backend/routes/recognitionRoutes.js
import express from "express";
import * as recognitionController from "../controllers/recognitionController.js";
import multer from "multer";
import { csrfProtection } from "../middleware/csrfMiddleware.js";

// 配置multer用于文件上传处理
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 限制50MB
  fileFilter: (req, file, cb) => {
    // 解决文件名中文乱码问题
    file.originalname = Buffer.from(file.originalname, "latin1").toString("utf8");

    // 只允许图像文件
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("只允许上传图像文件"), false);
    }

    cb(null, true);
  },
});

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Recognition
 *   description: 图像识别相关 API
 */

/**
 * @swagger
 * /api/node/recognition/upload:
 *   post:
 *     summary: 上传图像文件
 *     description: 上传图像文件用于后续识别
 *     tags: [Recognition]
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
 *                 description: 要处理的图片文件
 *     responses:
 *       200:
 *         description: 上传成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 image_id:
 *                   type: string
 *                   description: 图像ID
 *       400:
 *         description: 请求参数错误或文件类型不支持
 *       401:
 *         description: 未授权
 *       413:
 *         description: 文件太大
 *       500:
 *         description: 服务器错误
 */
router.post("/upload", upload.single("file"), recognitionController.uploadImage);

/**
 * @swagger
 * /api/node/recognition/process:
 *   post:
 *     summary: 处理图像识别
 *     description: 对已上传的图像进行识别
 *     tags: [Recognition]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - image_id
 *             properties:
 *               image_id:
 *                 type: string
 *                 description: 图像ID
 *     responses:
 *       200:
 *         description: 识别成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       description:
 *                         type: string
 *                         description: 识别的物体描述
 *                       score:
 *                         type: number
 *                         description: 置信度分数
 *                       boundingPoly:
 *                         type: object
 *                         description: 边界多边形
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post("/process", csrfProtection, recognitionController.processImage);

/**
 * @swagger
 * /api/node/recognition/images/{image_id}:
 *   get:
 *     summary: 获取图像
 *     description: 通过图像ID获取图像
 *     tags: [Recognition]
 *     parameters:
 *       - in: path
 *         name: image_id
 *         required: true
 *         schema:
 *           type: string
 *         description: 图像ID
 *     responses:
 *       200:
 *         description: 图像文件
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: 图像未找到
 *       500:
 *         description: 服务器错误
 */
router.get("/images/:image_id", recognitionController.getImage);

/**
 * @swagger
 * /api/node/recognition/processBase64:
 *   post:
 *     summary: 处理Base64编码的图像识别
 *     description: 对Base64编码的图像进行识别
 *     tags: [Recognition]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - base64Image
 *             properties:
 *               base64Image:
 *                 type: string
 *                 description: Base64编码的图像数据
 *     responses:
 *       200:
 *         description: 识别成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: object
 *                   properties:
 *                     labels:
 *                       type: array
 *                       items:
 *                         type: object
 *                     objects:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post("/processBase64", recognitionController.processBase64Image);

/**
 * @swagger
 * /api/node/recognition/test:
 *   get:
 *     summary: 测试接口
 *     description: 简单的测试接口，用于验证API是否正常工作
 *     tags: [Recognition]
 *     responses:
 *       200:
 *         description: 测试成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       500:
 *         description: 服务器错误
 */
router.get("/test", recognitionController.testApi);

export default router;
