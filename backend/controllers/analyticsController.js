// controllers/analyticsController.js
import UserActivity from "../models/UserActivity.js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("analytics");

/**
 * 记录用户活动事件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const recordEvents = async (req, res) => {
  try {
    const { events } = req.body;
    
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: "无效的事件数据"
      });
    }
    
    // 获取请求IP和用户代理
    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"];
    
    // 处理每个事件
    const processedEvents = events.map(event => ({
      ...event,
      ipAddress: event.ipAddress || ipAddress,
      userAgent: event.userAgent || userAgent
    }));
    
    // 批量插入事件
    await UserActivity.insertMany(processedEvents);
    
    logger.info(`成功记录 ${events.length} 个用户活动事件`);
    
    res.status(200).json({
      success: true,
      message: `成功记录 ${events.length} 个事件`
    });
  } catch (error) {
    logger.error("记录用户活动事件失败", { error });
    
    res.status(500).json({
      success: false,
      message: "记录事件失败",
      error: process.env.NODE_ENV === "production" ? "服务器错误" : error.message
    });
  }
};

/**
 * 获取用户活动统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const getUserActivityStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, category, type } = req.query;
    
    // 构建查询条件
    const query = { userId };
    
    // 添加日期范围
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    // 添加类别和类型过滤
    if (category) {
      query.category = category;
    }
    if (type) {
      query.type = type;
    }
    
    // 执行聚合查询
    const activityStats = await UserActivity.aggregate([
      { $match: query },
      { $group: {
        _id: {
          type: "$type",
          category: "$category",
          day: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }
        },
        count: { $sum: 1 }
      }},
      { $sort: { "_id.day": 1, "_id.category": 1, "_id.type": 1 } }
    ]);
    
    // 获取最近的活动
    const recentActivities = await UserActivity.find(query)
      .sort({ timestamp: -1 })
      .limit(20);
    
    res.status(200).json({
      success: true,
      data: {
        stats: activityStats,
        recent: recentActivities
      }
    });
  } catch (error) {
    logger.error("获取用户活动统计失败", { error, userId: req.params.userId });
    
    res.status(500).json({
      success: false,
      message: "获取活动统计失败",
      error: process.env.NODE_ENV === "production" ? "服务器错误" : error.message
    });
  }
};

/**
 * 获取应用整体使用统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const getAppUsageStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // 构建日期范围查询
    const dateQuery = {};
    if (startDate || endDate) {
      dateQuery.timestamp = {};
      if (startDate) {
        dateQuery.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        dateQuery.timestamp.$lte = new Date(endDate);
      }
    }
    
    // 获取活跃用户数
    const activeUsers = await UserActivity.aggregate([
      { $match: dateQuery },
      { $group: { _id: "$userId" } },
      { $count: "count" }
    ]);
    
    // 获取每日活动统计
    const dailyActivity = await UserActivity.aggregate([
      { $match: dateQuery },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: "$userId" }
      }},
      { $project: {
        date: "$_id",
        count: 1,
        uniqueUsers: { $size: "$uniqueUsers" },
        _id: 0
      }},
      { $sort: { date: 1 } }
    ]);
    
    // 获取功能使用统计
    const featureUsage = await UserActivity.aggregate([
      { $match: { ...dateQuery, category: "feature" } },
      { $group: {
        _id: "$data.featureName",
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: "$userId" }
      }},
      { $project: {
        feature: "$_id",
        count: 1,
        uniqueUsers: { $size: "$uniqueUsers" },
        _id: 0
      }},
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        activeUsers: activeUsers[0]?.count || 0,
        dailyActivity,
        featureUsage
      }
    });
  } catch (error) {
    logger.error("获取应用使用统计失败", { error });
    
    res.status(500).json({
      success: false,
      message: "获取应用统计失败",
      error: process.env.NODE_ENV === "production" ? "服务器错误" : error.message
    });
  }
};
