import express from "express";
import { authenticateJwt } from "../middleware/authMiddleware.js";
import {
  getSavedResults,
  saveResult,
  getResultById,
  deleteResult,
  clearAllResults,
} from "../controllers/savedOcrResultController.js";

const router = express.Router();

/**
 * @swagger
 * /api/saved-results:
 *   get:
 *     summary: 获取用户保存的OCR结果列表
 *     tags: [SavedOcrResults]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取结果列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SavedOcrResult'
 *                 count:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get("/", authenticateJwt, getSavedResults);

/**
 * @swagger
 * /api/saved-results:
 *   post:
 *     summary: 保存新的OCR结果
 *     tags: [SavedOcrResults]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: OCR识别的文本内容
 *               language:
 *                 type: string
 *                 description: 识别的语言代码
 *               languageName:
 *                 type: string
 *                 description: 识别的语言名称
 *     responses:
 *       201:
 *         description: 成功保存OCR结果
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post("/", authenticateJwt, saveResult);

/**
 * @swagger
 * /api/saved-results/{id}:
 *   get:
 *     summary: 获取单个保存的OCR结果
 *     tags: [SavedOcrResults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: OCR结果ID
 *     responses:
 *       200:
 *         description: 成功获取OCR结果
 *       401:
 *         description: 未授权
 *       404:
 *         description: 未找到指定的OCR结果
 *       500:
 *         description: 服务器错误
 */
router.get("/:id", authenticateJwt, getResultById);

/**
 * @swagger
 * /api/saved-results/{id}:
 *   delete:
 *     summary: 删除保存的OCR结果
 *     tags: [SavedOcrResults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: OCR结果ID
 *     responses:
 *       200:
 *         description: 成功删除OCR结果
 *       401:
 *         description: 未授权
 *       404:
 *         description: 未找到指定的OCR结果
 *       500:
 *         description: 服务器错误
 */
router.delete("/:id", authenticateJwt, deleteResult);

/**
 * @swagger
 * /api/saved-results/clear/all:
 *   delete:
 *     summary: 清除用户所有保存的OCR结果
 *     tags: [SavedOcrResults]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功清除所有OCR结果
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.delete("/clear/all", authenticateJwt, clearAllResults);

export default router;
