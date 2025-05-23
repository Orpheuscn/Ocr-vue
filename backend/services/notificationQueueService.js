// backend/services/notificationQueueService.js
import { getLogger } from '../utils/logger.js';
import rabbitmqManager from '../utils/rabbitmqManager.js';
import { Notification } from '../models/Notification.js';

const logger = getLogger('notificationQueueService');

/**
 * 通知队列服务
 * 处理通知的发送和管理
 */
class NotificationQueueService {
  constructor() {
    this.isInitialized = false;
    this.isConsuming = false;
  }

  /**
   * 初始化通知服务
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return true;
      }

      // 确保RabbitMQ连接
      if (!rabbitmqManager.isHealthy()) {
        const connected = await rabbitmqManager.connect();
        if (!connected) {
          throw new Error('无法连接到RabbitMQ');
        }
      }

      this.isInitialized = true;
      logger.info('通知队列服务初始化成功');
      return true;

    } catch (error) {
      logger.error('通知队列服务初始化失败', { error: error.message });
      return false;
    }
  }

  /**
   * 开始消费通知队列
   */
  async startConsuming() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.isConsuming) {
        logger.warn('通知队列已在消费中');
        return true;
      }

      // 开始消费用户通知队列
      await rabbitmqManager.consumeQueue(
        'user.notification',
        this._handleNotificationMessage.bind(this)
      );

      this.isConsuming = true;
      logger.info('开始消费通知队列');
      return true;

    } catch (error) {
      logger.error('启动通知队列消费失败', { error: error.message });
      return false;
    }
  }

  /**
   * 停止消费通知队列
   */
  async stopConsuming() {
    try {
      this.isConsuming = false;
      logger.info('停止消费通知队列');
    } catch (error) {
      logger.error('停止通知队列消费失败', { error: error.message });
    }
  }

  /**
   * 发送通知到队列
   */
  async sendNotification(notification) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // 构建通知消息
      const message = {
        messageId: `notification_${notification.userId}_${Date.now()}`,
        timestamp: new Date(),
        version: '1.0',
        userId: notification.userId,
        taskId: notification.taskId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority || 'normal',
        channels: notification.channels || ['websocket']
      };

      // 发送到通知队列
      const sent = await rabbitmqManager.sendToQueue(
        'user.notification',
        message
      );

      if (sent) {
        logger.info('通知已发送到队列', {
          userId: notification.userId,
          type: notification.type,
          messageId: message.messageId
        });
        return true;
      } else {
        throw new Error('发送通知到队列失败');
      }

    } catch (error) {
      logger.error('发送通知失败', {
        error: error.message,
        notification: notification
      });
      return false;
    }
  }

  /**
   * 处理通知消息
   */
  async _handleNotificationMessage(message) {
    try {
      logger.debug('处理通知消息', { messageId: message.messageId });

      const {
        userId,
        taskId,
        type,
        title,
        message: content,
        data,
        priority,
        channels
      } = message;

      // 保存通知到数据库
      const notification = new Notification({
        userId,
        taskId,
        type,
        title,
        message: content,
        data,
        priority,
        channels,
        status: 'pending',
        createdAt: new Date()
      });

      await notification.save();

      // 根据通道发送通知
      const results = await Promise.allSettled(
        channels.map(channel => this._sendToChannel(channel, notification))
      );

      // 检查发送结果
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        notification.status = failed > 0 ? 'partial' : 'sent';
        notification.sentAt = new Date();
      } else {
        notification.status = 'failed';
        notification.error = '所有通道发送失败';
      }

      await notification.save();

      logger.info('通知处理完成', {
        notificationId: notification._id,
        userId,
        type,
        successful,
        failed
      });

      return true;

    } catch (error) {
      logger.error('处理通知消息失败', {
        error: error.message,
        messageId: message.messageId
      });
      return false;
    }
  }

  /**
   * 发送通知到指定通道
   */
  async _sendToChannel(channel, notification) {
    try {
      switch (channel) {
        case 'websocket':
          return await this._sendWebSocketNotification(notification);
        case 'email':
          return await this._sendEmailNotification(notification);
        case 'sms':
          return await this._sendSMSNotification(notification);
        default:
          throw new Error(`不支持的通知通道: ${channel}`);
      }
    } catch (error) {
      logger.error(`发送${channel}通知失败`, {
        error: error.message,
        notificationId: notification._id
      });
      throw error;
    }
  }

  /**
   * 发送WebSocket通知
   */
  async _sendWebSocketNotification(notification) {
    try {
      // 这里应该集成WebSocket服务
      // 暂时只记录日志
      logger.info('发送WebSocket通知', {
        userId: notification.userId,
        type: notification.type,
        title: notification.title
      });

      // TODO: 实现WebSocket通知发送
      // 可以通过Socket.IO或其他WebSocket库发送实时通知

      return true;
    } catch (error) {
      logger.error('发送WebSocket通知失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 发送邮件通知
   */
  async _sendEmailNotification(notification) {
    try {
      // 这里应该集成邮件服务
      // 暂时只记录日志
      logger.info('发送邮件通知', {
        userId: notification.userId,
        type: notification.type,
        title: notification.title
      });

      // TODO: 实现邮件通知发送
      // 可以使用nodemailer或其他邮件服务

      return true;
    } catch (error) {
      logger.error('发送邮件通知失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 发送短信通知
   */
  async _sendSMSNotification(notification) {
    try {
      // 这里应该集成短信服务
      // 暂时只记录日志
      logger.info('发送短信通知', {
        userId: notification.userId,
        type: notification.type,
        title: notification.title
      });

      // TODO: 实现短信通知发送
      // 可以使用阿里云短信、腾讯云短信等服务

      return true;
    } catch (error) {
      logger.error('发送短信通知失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isConsuming: this.isConsuming,
      rabbitmqConnected: rabbitmqManager.isHealthy()
    };
  }

  /**
   * 发送OCR完成通知
   */
  async sendOcrCompletedNotification(userId, taskId, result) {
    return await this.sendNotification({
      userId,
      taskId,
      type: 'ocr_completed',
      title: 'OCR处理完成',
      message: `您的OCR任务已完成处理`,
      data: result,
      priority: 'normal',
      channels: ['websocket']
    });
  }

  /**
   * 发送OCR失败通知
   */
  async sendOcrFailedNotification(userId, taskId, error) {
    return await this.sendNotification({
      userId,
      taskId,
      type: 'ocr_failed',
      title: 'OCR处理失败',
      message: `您的OCR任务处理失败: ${error.message}`,
      data: { error },
      priority: 'high',
      channels: ['websocket']
    });
  }
}

// 创建单例实例
const notificationQueueService = new NotificationQueueService();

export default notificationQueueService;
