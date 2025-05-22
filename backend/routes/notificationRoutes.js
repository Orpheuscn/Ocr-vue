import express from "express";
import { authenticateJwt } from "../middleware/authMiddleware.js";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../controllers/notificationController.js";

const router = express.Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: 获取用户通知列表
 *     tags: [Notifications]
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
 *         description: 每页数量，默认为10
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *         description: 是否只获取未读通知
 *     responses:
 *       200:
 *         description: 成功获取通知列表
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get("/", authenticateJwt, getUserNotifications);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   post:
 *     summary: 标记通知为已读
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 通知ID
 *     responses:
 *       200:
 *         description: 成功标记通知为已读
 *       401:
 *         description: 未授权
 *       404:
 *         description: 未找到指定的通知
 *       500:
 *         description: 服务器错误
 */
router.post("/:id/read", authenticateJwt, markNotificationAsRead);

/**
 * @swagger
 * /api/notifications/read/all:
 *   post:
 *     summary: 标记所有通知为已读
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功标记所有通知为已读
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post("/read/all", authenticateJwt, markAllNotificationsAsRead);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: 删除通知
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 通知ID
 *     responses:
 *       200:
 *         description: 成功删除通知
 *       401:
 *         description: 未授权
 *       404:
 *         description: 未找到指定的通知
 *       500:
 *         description: 服务器错误
 */
router.delete("/:id", authenticateJwt, deleteNotification);

/**
 * @swagger
 * /api/notifications/clear/all:
 *   delete:
 *     summary: 清空所有通知
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功清空所有通知
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.delete("/clear/all", authenticateJwt, clearAllNotifications);

export default router;
