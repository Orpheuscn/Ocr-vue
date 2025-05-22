import express from "express";
import { authenticateJwt } from "../middleware/authMiddleware.js";
import {
  getSavedResults,
  saveResult,
  getResultById,
  deleteResult,
  clearAllResults,
  publishResult,
  getPublishedResults,
  getFlaggedResults,
  getRemovedResults,
  reviewResult,
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
// 公开发布的OCR结果路由 - 必须放在/:id路由之前，避免被误解为ID
router.get("/published", getPublishedResults);

// 被标记的OCR结果路由 - 必须放在/:id路由之前
router.get("/flagged", authenticateJwt, getFlaggedResults);

// 已移除的OCR结果路由 - 必须放在/:id路由之前
router.get("/removed", authenticateJwt, getRemovedResults);

// 获取单个OCR结果 - 放在特定路径后面，避免将特定路径解释为ID
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

/**
 * @swagger
 * /api/saved-results/{id}/publish:
 *   post:
 *     summary: 发布OCR结果
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
 *         description: 成功发布OCR结果
 *       400:
 *         description: 请求参数错误或已发布
 *       401:
 *         description: 未授权
 *       404:
 *         description: 未找到指定的OCR结果
 *       500:
 *         description: 服务器错误
 */
router.post("/:id/publish", authenticateJwt, publishResult);

/**
 * @swagger
 * /api/published-results:
 *   get:
 *     summary: 获取已发布的OCR结果列表（公开访问）
 *     tags: [PublishedResults]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码，默认为1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 每页数量，默认为12
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 成功获取已发布结果列表
 *       500:
 *         description: 服务器错误
 */
// 这个路由已经移到前面，避免被误解为ID参数

/**
 * @swagger
 * /api/saved-results/flagged:
 *   get:
 *     summary: 获取被标记的OCR结果列表（仅管理员）
 *     tags: [SavedOcrResults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码，默认为1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 每页数量，默认为12
 *     responses:
 *       200:
 *         description: 成功获取被标记结果列表
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
// 这个路由已经移到前面，避免被误解为ID参数

/**
 * @swagger
 * /api/saved-results/removed:
 *   get:
 *     summary: 获取已移除的OCR结果列表（仅管理员）
 *     tags: [SavedOcrResults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码，默认为1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 每页数量，默认为12
 *     responses:
 *       200:
 *         description: 成功获取已移除结果列表
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
// 这个路由已经移到前面，避免被误解为ID参数

/**
 * @swagger
 * /api/saved-results/{id}/review:
 *   post:
 *     summary: 审核OCR结果（仅管理员）
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [keep, flag, remove]
 *                 description: 审核操作 - keep(保留), flag(标记), remove(移除)
 *               note:
 *                 type: string
 *                 description: 审核备注
 *     responses:
 *       200:
 *         description: 成功审核OCR结果
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 未找到指定的OCR结果
 *       500:
 *         description: 服务器错误
 */
router.post("/:id/review", authenticateJwt, reviewResult);

export default router;
