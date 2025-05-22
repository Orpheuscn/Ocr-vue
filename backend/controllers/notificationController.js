import { Notification, User } from "../models/index.js";

/**
 * 创建通知
 * @param {Object} notificationData - 通知数据
 * @returns {Promise<Object>} 创建的通知对象
 */
export const createNotification = async (notificationData) => {
  try {
    const notification = new Notification(notificationData);
    await notification.save();
    return notification;
  } catch (error) {
    console.error("创建通知失败:", error);
    throw error;
  }
};

/**
 * 获取用户通知列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unreadOnly === "true";

    // 构建查询条件
    const query = {
      userId,
      isDeleted: false,
    };

    // 如果只查询未读通知
    if (unreadOnly) {
      query.isRead = false;
    }

    // 查询通知
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // 获取未读通知数量
    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
      isDeleted: false,
    });

    // 获取总通知数量
    const total = await Notification.countDocuments({
      userId,
      isDeleted: false,
    });

    // 计算总页数
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      total,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("获取用户通知失败:", error);
    return res.status(500).json({
      success: false,
      message: "获取用户通知失败",
      error: error.message,
    });
  }
};

/**
 * 标记通知为已读
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    // 查找通知并确保它属于当前用户
    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "未找到指定的通知",
      });
    }

    // 标记为已读
    notification.isRead = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: "通知已标记为已读",
      data: notification,
    });
  } catch (error) {
    console.error("标记通知为已读失败:", error);
    return res.status(500).json({
      success: false,
      message: "标记通知为已读失败",
      error: error.message,
    });
  }
};

/**
 * 标记所有通知为已读
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    // 更新所有未读通知
    const result = await Notification.updateMany(
      {
        userId,
        isRead: false,
        isDeleted: false,
      },
      {
        $set: { isRead: true },
      }
    );

    return res.status(200).json({
      success: true,
      message: "所有通知已标记为已读",
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error("标记所有通知为已读失败:", error);
    return res.status(500).json({
      success: false,
      message: "标记所有通知为已读失败",
      error: error.message,
    });
  }
};

/**
 * 删除通知
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    // 查找通知并确保它属于当前用户
    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "未找到指定的通知",
      });
    }

    // 标记为已删除
    notification.isDeleted = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: "通知已删除",
    });
  } catch (error) {
    console.error("删除通知失败:", error);
    return res.status(500).json({
      success: false,
      message: "删除通知失败",
      error: error.message,
    });
  }
};

/**
 * 清空所有通知
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    // 更新所有通知为已删除
    const result = await Notification.updateMany(
      {
        userId,
        isDeleted: false,
      },
      {
        $set: { isDeleted: true },
      }
    );

    return res.status(200).json({
      success: true,
      message: "所有通知已清空",
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error("清空所有通知失败:", error);
    return res.status(500).json({
      success: false,
      message: "清空所有通知失败",
      error: error.message,
    });
  }
};
