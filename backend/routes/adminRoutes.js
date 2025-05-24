import express from "express";
import * as adminController from "../controllers/adminController.js";
import { isAdmin } from "../middleware/passportConfig.js";
import { authenticateJwt } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: 管理员功能 API
 */

/**
 * @swagger
 * /api/admin/promote/{userId}:
 *   put:
 *     summary: 提升用户为管理员
 *     description: 将用户提升为管理员（仅开发环境可用）
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 用户成功提升为管理员
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器错误
 */
// 初始管理员设置路由 - 这个路由不受管理员中间件保护
// 这是一个仅在开发环境中使用的端点，用于初始设置管理员
// 在生产环境中应该被禁用或需要某种额外的安全措施
if (process.env.NODE_ENV === "development") {
  router.put("/promote/:userId", adminController.promoteUserToAdmin);
}

/**
 * @swagger
 * /api/admin/check-admin-status/{userId}:
 *   get:
 *     summary: 检查用户管理员状态
 *     description: 检查指定用户是否具有管理员权限
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 成功获取用户管理员状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 userId:
 *                   type: integer
 *                 username:
 *                   type: string
 *                 isAdmin:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器错误
 */
// 添加一个调试端点，用于测试用户的管理员状态
router.get("/check-admin-status/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // 导入User模型
    const User = (await import("../models/User.js")).default;

    // 查找用户
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    // 返回用户的管理员状态
    return res.json({
      success: true,
      userId,
      username: user.username,
      isAdmin: user.isAdmin === true,
      message: user.isAdmin === true ? "该用户是管理员" : "该用户不是管理员",
    });
  } catch (error) {
    console.error("检查管理员状态失败:", error);
    return res.status(500).json({
      success: false,
      message: "检查管理员状态失败",
      error: error.message,
    });
  }
});

// 应用认证和管理员权限中间件到所有其他管理路由
router.use(authenticateJwt);
router.use(isAdmin);

/**
 * @swagger
 * /api/admin/status:
 *   get:
 *     summary: 获取服务器状态
 *     description: 获取服务器运行状态信息
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取服务器状态
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
 *                     uptime:
 *                       type: number
 *                     memory:
 *                       type: object
 *                     cpu:
 *                       type: object
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问（非管理员）
 *       500:
 *         description: 服务器错误
 */
router.get("/status", adminController.getServerStatus);

/**
 * @swagger
 * /api/admin/db-status:
 *   get:
 *     summary: 获取数据库状态
 *     description: 获取数据库连接和使用状态
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取数据库状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问（非管理员）
 *       500:
 *         description: 服务器错误
 */
router.get("/db-status", adminController.getDbStatus);

/**
 * @swagger
 * /api/admin/api-status:
 *   get:
 *     summary: 获取API状态
 *     description: 获取外部API连接状态
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取API状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问（非管理员）
 *       500:
 *         description: 服务器错误
 */
router.get("/api-status", adminController.getApiStatus);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: 获取所有用户
 *     description: 获取系统中所有用户的列表
 *     tags: [Admin]
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
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问（非管理员）
 *       500:
 *         description: 服务器错误
 */
router.get("/users", adminController.getUsers);

/**
 * @swagger
 * /api/admin/ocr-records:
 *   get:
 *     summary: 获取OCR记录
 *     description: 获取系统中所有OCR处理记录
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取OCR记录
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
 *                     $ref: '#/components/schemas/OcrRecord'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问（非管理员）
 *       500:
 *         description: 服务器错误
 */
router.get("/ocr-records", adminController.getOcrRecords);

/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     summary: 获取API日志
 *     description: 获取系统API调用日志
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取API日志
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
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问（非管理员）
 *       500:
 *         description: 服务器错误
 *   delete:
 *     summary: 清除API日志
 *     description: 清除系统API调用日志
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功清除API日志
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
 *         description: 禁止访问（非管理员）
 *       500:
 *         description: 服务器错误
 */
router.get("/logs", adminController.getLogs);
router.delete("/logs", adminController.clearLogs);

/**
 * @swagger
 * /api/admin/execute-query:
 *   post:
 *     summary: 执行SQL查询
 *     description: 执行自定义SQL查询语句（仅限管理员使用，谨慎操作）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: SQL查询语句
 *     responses:
 *       200:
 *         description: 成功执行SQL查询
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
 *       400:
 *         description: 无效的SQL查询
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问（非管理员）
 *       500:
 *         description: 服务器错误
 */
router.post("/execute-query", adminController.executeQuery);

export default router;
