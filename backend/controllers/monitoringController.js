// backend/controllers/monitoringController.js
import { getLogger } from '../utils/logger.js';
import rabbitmqManager from '../utils/rabbitmqManager.js';
import notificationQueueService from '../services/notificationQueueService.js';
import taskSchedulerService from '../services/taskSchedulerService.js';
import OcrRecord from '../models/OcrRecord.js';
import { Notification } from '../models/Notification.js';

const logger = getLogger('monitoringController');

/**
 * 获取系统总览
 */
export const getSystemOverview = async (req, res) => {
  try {
    // 检查管理员权限
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "需要管理员权限"
      });
    }

    // 获取各个服务的状态
    const rabbitmqStatus = rabbitmqManager.getStatus();
    const notificationStatus = notificationQueueService.getStatus();
    const schedulerStatus = taskSchedulerService.getStatus();

    // 获取数据库统计
    const dbStats = await _getDatabaseStats();

    // 获取队列统计
    const queueStats = await _getQueueStats();

    // 系统资源使用情况
    const systemStats = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform
    };

    const overview = {
      timestamp: new Date(),
      services: {
        rabbitmq: {
          status: rabbitmqStatus.connected ? 'healthy' : 'unhealthy',
          details: rabbitmqStatus
        },
        notification: {
          status: notificationStatus.isInitialized ? 'healthy' : 'unhealthy',
          details: notificationStatus
        },
        scheduler: {
          status: schedulerStatus.isRunning ? 'healthy' : 'unhealthy',
          details: schedulerStatus
        }
      },
      database: dbStats,
      queues: queueStats,
      system: systemStats
    };

    logger.info('系统总览查询成功');
    res.json({
      success: true,
      data: overview
    });

  } catch (error) {
    logger.error('获取系统总览失败', { error: error.message });
    res.status(500).json({
      success: false,
      message: "获取系统总览时出错",
      error: error.message
    });
  }
};

/**
 * 获取队列状态详情
 */
export const getQueueStatus = async (req, res) => {
  try {
    // 检查管理员权限
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "需要管理员权限"
      });
    }

    const queueStats = await _getQueueStats();
    const rabbitmqStatus = rabbitmqManager.getStatus();

    const queueStatus = {
      timestamp: new Date(),
      connection: rabbitmqStatus,
      queues: queueStats,
      services: {
        notification: notificationQueueService.getStatus(),
        scheduler: taskSchedulerService.getStatus()
      }
    };

    logger.info('队列状态查询成功');
    res.json({
      success: true,
      data: queueStatus
    });

  } catch (error) {
    logger.error('获取队列状态失败', { error: error.message });
    res.status(500).json({
      success: false,
      message: "获取队列状态时出错",
      error: error.message
    });
  }
};

/**
 * 获取性能指标
 */
export const getPerformanceMetrics = async (req, res) => {
  try {
    // 检查管理员权限
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "需要管理员权限"
      });
    }

    const { timeRange = '1h' } = req.query;

    // 获取OCR处理统计
    const ocrStats = await _getOcrPerformanceStats(timeRange);

    // 获取通知统计
    const notificationStats = await _getNotificationStats(timeRange);

    // 系统性能指标
    const systemMetrics = {
      timestamp: new Date(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      eventLoopDelay: process.hrtime()
    };

    const metrics = {
      timestamp: new Date(),
      timeRange,
      ocr: ocrStats,
      notifications: notificationStats,
      system: systemMetrics
    };

    logger.info('性能指标查询成功', { timeRange });
    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('获取性能指标失败', { error: error.message });
    res.status(500).json({
      success: false,
      message: "获取性能指标时出错",
      error: error.message
    });
  }
};

/**
 * 获取任务统计
 */
export const getTaskStatistics = async (req, res) => {
  try {
    // 检查管理员权限
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "需要管理员权限"
      });
    }

    const { period = 'today' } = req.query;

    // 获取OCR任务统计
    const ocrTaskStats = await _getOcrTaskStats(period);

    // 获取批处理任务统计
    const batchJobStats = await _getBatchJobStats(period);

    // 获取定时任务统计
    const scheduledTaskStats = taskSchedulerService.getStatus().scheduledTasks;

    const statistics = {
      timestamp: new Date(),
      period,
      ocrTasks: ocrTaskStats,
      batchJobs: batchJobStats,
      scheduledTasks: scheduledTaskStats
    };

    logger.info('任务统计查询成功', { period });
    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    logger.error('获取任务统计失败', { error: error.message });
    res.status(500).json({
      success: false,
      message: "获取任务统计时出错",
      error: error.message
    });
  }
};

/**
 * 重启服务
 */
export const restartService = async (req, res) => {
  try {
    // 检查管理员权限
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "需要管理员权限"
      });
    }

    const { service } = req.body;

    if (!service) {
      return res.status(400).json({
        success: false,
        message: "缺少服务名称"
      });
    }

    let result = false;

    switch (service) {
      case 'rabbitmq':
        await rabbitmqManager.disconnect();
        result = await rabbitmqManager.connect();
        break;
      case 'notification':
        await notificationQueueService.stopConsuming();
        result = await notificationQueueService.startConsuming();
        break;
      case 'scheduler':
        await taskSchedulerService.stop();
        result = await taskSchedulerService.start();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `不支持的服务: ${service}`
        });
    }

    if (result) {
      logger.info(`服务重启成功: ${service}`);
      res.json({
        success: true,
        message: `服务 ${service} 重启成功`
      });
    } else {
      logger.error(`服务重启失败: ${service}`);
      res.status(500).json({
        success: false,
        message: `服务 ${service} 重启失败`
      });
    }

  } catch (error) {
    logger.error('重启服务失败', { error: error.message });
    res.status(500).json({
      success: false,
      message: "重启服务时出错",
      error: error.message
    });
  }
};

/**
 * 获取数据库统计
 */
async function _getDatabaseStats() {
  try {
    const [ocrRecordCount, notificationCount] = await Promise.all([
      OcrRecord.countDocuments(),
      Notification.countDocuments()
    ]);

    return {
      collections: {
        ocrRecords: ocrRecordCount,
        notifications: notificationCount
      },
      status: 'connected'
    };
  } catch (error) {
    logger.error('获取数据库统计失败', { error: error.message });
    return {
      collections: {},
      status: 'error',
      error: error.message
    };
  }
}

/**
 * 获取队列统计
 */
async function _getQueueStats() {
  try {
    // 这里应该从RabbitMQ管理API获取实际的队列统计
    // 暂时返回模拟数据
    return {
      'ocr.process': {
        messageCount: 0,
        consumerCount: 1,
        publishRate: 0,
        deliverRate: 0
      },
      'user.notification': {
        messageCount: 0,
        consumerCount: 1,
        publishRate: 0,
        deliverRate: 0
      },
      'batch.process': {
        messageCount: 0,
        consumerCount: 0,
        publishRate: 0,
        deliverRate: 0
      }
    };
  } catch (error) {
    logger.error('获取队列统计失败', { error: error.message });
    return {};
  }
}

/**
 * 获取OCR性能统计
 */
async function _getOcrPerformanceStats(timeRange) {
  try {
    const timeFilter = _getTimeFilter(timeRange);
    
    const stats = await OcrRecord.aggregate([
      { $match: { createdAt: timeFilter } },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          avgProcessingTime: { $avg: '$processingTime' },
          successRate: {
            $avg: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          }
        }
      }
    ]);

    return stats[0] || {
      totalTasks: 0,
      avgProcessingTime: 0,
      successRate: 0
    };
  } catch (error) {
    logger.error('获取OCR性能统计失败', { error: error.message });
    return {
      totalTasks: 0,
      avgProcessingTime: 0,
      successRate: 0
    };
  }
}

/**
 * 获取通知统计
 */
async function _getNotificationStats(timeRange) {
  try {
    const timeFilter = _getTimeFilter(timeRange);
    
    const stats = await Notification.aggregate([
      { $match: { createdAt: timeFilter } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0
    };

    stats.forEach(stat => {
      result.total += stat.count;
      result[stat._id] = stat.count;
    });

    return result;
  } catch (error) {
    logger.error('获取通知统计失败', { error: error.message });
    return {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0
    };
  }
}

/**
 * 获取OCR任务统计
 */
async function _getOcrTaskStats(period) {
  try {
    const timeFilter = _getPeriodFilter(period);
    
    const stats = await OcrRecord.aggregate([
      { $match: { createdAt: timeFilter } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: 0,
      success: 0,
      failed: 0,
      processing: 0
    };

    stats.forEach(stat => {
      result.total += stat.count;
      result[stat._id] = stat.count;
    });

    return result;
  } catch (error) {
    logger.error('获取OCR任务统计失败', { error: error.message });
    return {
      total: 0,
      success: 0,
      failed: 0,
      processing: 0
    };
  }
}

/**
 * 获取批处理任务统计
 */
async function _getBatchJobStats(period) {
  // 这里应该从数据库获取批处理任务统计
  // 暂时返回模拟数据
  return {
    total: 0,
    completed: 0,
    running: 0,
    failed: 0
  };
}

/**
 * 获取时间过滤器
 */
function _getTimeFilter(timeRange) {
  const now = new Date();
  let startTime;

  switch (timeRange) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
  }

  return { $gte: startTime };
}

/**
 * 获取周期过滤器
 */
function _getPeriodFilter(period) {
  const now = new Date();
  let startTime;

  switch (period) {
    case 'today':
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startTime = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  return { $gte: startTime };
}
