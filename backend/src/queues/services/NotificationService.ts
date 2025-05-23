/**
 * 通知服务
 * 处理用户通知的队列操作
 */

import { BaseQueueService, QueueServiceConfig } from './BaseQueueService';
import { RabbitMQManager } from '../managers/RabbitMQManager';
import { 
  UserNotificationMessage,
  NotificationType,
  MessageContext,
  MessageProcessingResult,
  createUserNotificationMessage
} from '../types/messages';
import { 
  EXCHANGES, 
  QUEUES, 
  ROUTING_KEYS, 
  RETRY_STRATEGIES 
} from '../config/queues';
import { getLogger } from '../../utils/logger';

const logger = getLogger('NotificationService');

export interface NotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  data?: any;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  channels?: ('websocket' | 'email' | 'sms')[];
  expiresAt?: Date;
}

export class NotificationService extends BaseQueueService {
  private websocketService: WebSocketNotificationService;
  private emailService: EmailNotificationService;

  constructor(rabbitMQ: RabbitMQManager) {
    const config: QueueServiceConfig = {
      queueName: QUEUES.USER_NOTIFICATION.name,
      exchangeName: EXCHANGES.NOTIFICATION.name,
      routingKey: '', // fanout交换机不需要路由键
      retryStrategy: RETRY_STRATEGIES.NOTIFICATION,
      deadLetterExchange: EXCHANGES.DEAD_LETTER.name,
      deadLetterRoutingKey: ROUTING_KEYS.DEAD_LETTER
    };

    super(rabbitMQ, config);
    this.websocketService = new WebSocketNotificationService(rabbitMQ);
    this.emailService = new EmailNotificationService(rabbitMQ);
  }

  /**
   * 发送通知
   */
  async sendNotification(request: NotificationRequest): Promise<boolean> {
    try {
      // 验证请求参数
      this.validateNotificationRequest(request);

      // 创建通知消息
      const message = createUserNotificationMessage({
        userId: request.userId,
        type: request.type,
        title: request.title,
        message: request.message,
        taskId: request.taskId,
        data: request.data,
        priority: request.priority || 'normal',
        channels: request.channels || ['websocket']
      });

      // 设置过期时间
      if (request.expiresAt) {
        (message as any).expiresAt = request.expiresAt;
      }

      // 发布通知消息
      const success = await this.publishMessage(message, {
        priority: this.getPriorityValue(request.priority)
      });

      if (success) {
        logger.info('通知发送成功', {
          userId: request.userId,
          type: request.type,
          channels: request.channels
        });
      }

      return success;
    } catch (error) {
      logger.error('通知发送失败', {
        userId: request.userId,
        type: request.type,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * 批量发送通知
   */
  async sendBatchNotifications(requests: NotificationRequest[]): Promise<{
    successful: number;
    failed: Array<{ userId: string; error: string }>;
  }> {
    let successful = 0;
    const failed: Array<{ userId: string; error: string }> = [];

    for (const request of requests) {
      try {
        const result = await this.sendNotification(request);
        if (result) {
          successful++;
        } else {
          failed.push({ userId: request.userId, error: '发送失败' });
        }
      } catch (error) {
        failed.push({ userId: request.userId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    logger.info('批量通知发送完成', {
      total: requests.length,
      successful,
      failed: failed.length
    });

    return { successful, failed };
  }

  /**
   * 发送OCR完成通知
   */
  async sendOcrCompletedNotification(params: {
    userId: string;
    taskId: string;
    result: any;
    channels?: ('websocket' | 'email' | 'sms')[];
  }): Promise<boolean> {
    return this.sendNotification({
      userId: params.userId,
      type: NotificationType.OCR_COMPLETED,
      title: 'OCR处理完成',
      message: `您的OCR任务已成功完成，识别出 ${params.result.text?.length || 0} 个字符`,
      taskId: params.taskId,
      data: {
        taskId: params.taskId,
        textLength: params.result.text?.length || 0,
        confidence: params.result.confidence,
        language: params.result.language
      },
      priority: 'normal',
      channels: params.channels || ['websocket']
    });
  }

  /**
   * 发送OCR失败通知
   */
  async sendOcrFailedNotification(params: {
    userId: string;
    taskId: string;
    error: string;
    channels?: ('websocket' | 'email' | 'sms')[];
  }): Promise<boolean> {
    return this.sendNotification({
      userId: params.userId,
      type: NotificationType.OCR_FAILED,
      title: 'OCR处理失败',
      message: `您的OCR任务处理失败：${params.error}`,
      taskId: params.taskId,
      data: {
        taskId: params.taskId,
        error: params.error
      },
      priority: 'high',
      channels: params.channels || ['websocket']
    });
  }

  /**
   * 发送系统维护通知
   */
  async sendSystemMaintenanceNotification(params: {
    userIds: string[];
    title: string;
    message: string;
    maintenanceTime: Date;
    channels?: ('websocket' | 'email' | 'sms')[];
  }): Promise<{ successful: number; failed: number }> {
    const requests: NotificationRequest[] = params.userIds.map(userId => ({
      userId,
      type: NotificationType.SYSTEM_MAINTENANCE,
      title: params.title,
      message: params.message,
      data: {
        maintenanceTime: params.maintenanceTime
      },
      priority: 'urgent',
      channels: params.channels || ['websocket', 'email']
    }));

    const result = await this.sendBatchNotifications(requests);
    return {
      successful: result.successful,
      failed: result.failed.length
    };
  }

  /**
   * 处理通知消息
   */
  protected async processMessage(context: MessageContext): Promise<MessageProcessingResult> {
    const { message } = context;

    try {
      const notification = message as UserNotificationMessage;
      
      logger.info('处理通知消息', {
        userId: notification.userId,
        type: notification.type,
        channels: notification.channels
      });

      // 根据通道分发通知
      const results = await Promise.allSettled(
        notification.channels.map(channel => this.sendToChannel(notification, channel))
      );

      // 检查是否有失败的通道
      const failures = results.filter(result => result.status === 'rejected');
      
      if (failures.length > 0) {
        logger.warn('部分通道发送失败', {
          userId: notification.userId,
          failedChannels: failures.length,
          totalChannels: notification.channels.length
        });
      }

      // 如果所有通道都失败，则认为处理失败
      if (failures.length === notification.channels.length) {
        throw new Error('所有通知通道都发送失败');
      }

      return { success: true };
    } catch (error) {
      logger.error('处理通知消息失败', {
        userId: message.userId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        retryable: true
      };
    }
  }

  /**
   * 发送到指定通道
   */
  private async sendToChannel(
    notification: UserNotificationMessage, 
    channel: 'websocket' | 'email' | 'sms'
  ): Promise<void> {
    switch (channel) {
      case 'websocket':
        await this.websocketService.sendWebSocketNotification(notification);
        break;
      case 'email':
        await this.emailService.sendEmailNotification(notification);
        break;
      case 'sms':
        // TODO: 实现SMS通知
        logger.warn('SMS通知暂未实现', { userId: notification.userId });
        break;
      default:
        throw new Error(`不支持的通知通道: ${channel}`);
    }
  }

  /**
   * 验证通知请求
   */
  private validateNotificationRequest(request: NotificationRequest): void {
    if (!request.userId) {
      throw new Error('userId is required');
    }
    if (!request.type) {
      throw new Error('type is required');
    }
    if (!request.title) {
      throw new Error('title is required');
    }
    if (!request.message) {
      throw new Error('message is required');
    }
  }

  /**
   * 获取优先级数值
   */
  private getPriorityValue(priority?: string): number {
    switch (priority) {
      case 'urgent': return 10;
      case 'high': return 7;
      case 'normal': return 5;
      case 'low': return 1;
      default: return 5;
    }
  }
}

/**
 * WebSocket通知服务
 */
export class WebSocketNotificationService extends BaseQueueService {
  constructor(rabbitMQ: RabbitMQManager) {
    const config: QueueServiceConfig = {
      queueName: QUEUES.WEBSOCKET_NOTIFICATION.name,
      exchangeName: EXCHANGES.OCR_DIRECT.name,
      routingKey: ROUTING_KEYS.WEBSOCKET_NOTIFICATION,
      retryStrategy: RETRY_STRATEGIES.NOTIFICATION,
      deadLetterExchange: EXCHANGES.DEAD_LETTER.name,
      deadLetterRoutingKey: ROUTING_KEYS.DEAD_LETTER
    };

    super(rabbitMQ, config);
  }

  /**
   * 发送WebSocket通知
   */
  async sendWebSocketNotification(notification: UserNotificationMessage): Promise<boolean> {
    try {
      const success = await this.sendToQueue(notification);
      
      if (success) {
        logger.debug('WebSocket通知消息发送成功', {
          userId: notification.userId,
          type: notification.type
        });
      }

      return success;
    } catch (error) {
      logger.error('WebSocket通知发送失败', {
        userId: notification.userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * 处理WebSocket通知消息
   */
  protected async processMessage(context: MessageContext): Promise<MessageProcessingResult> {
    const { message } = context;

    try {
      const notification = message as UserNotificationMessage;
      
      // 这里应该通过WebSocket发送通知给前端
      // 您需要根据实际的WebSocket实现来调整
      
      logger.info('发送WebSocket通知', {
        userId: notification.userId,
        type: notification.type,
        title: notification.title
      });

      // 示例实现
      // await this.webSocketManager.sendToUser(notification.userId, {
      //   type: 'notification',
      //   data: notification
      // });

      return { success: true };
    } catch (error) {
      logger.error('WebSocket通知处理失败', {
        userId: message.userId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        retryable: true
      };
    }
  }
}

/**
 * 邮件通知服务
 */
export class EmailNotificationService extends BaseQueueService {
  constructor(rabbitMQ: RabbitMQManager) {
    const config: QueueServiceConfig = {
      queueName: QUEUES.EMAIL_NOTIFICATION.name,
      exchangeName: EXCHANGES.OCR_DIRECT.name,
      routingKey: ROUTING_KEYS.EMAIL_NOTIFICATION,
      retryStrategy: RETRY_STRATEGIES.NOTIFICATION,
      deadLetterExchange: EXCHANGES.DEAD_LETTER.name,
      deadLetterRoutingKey: ROUTING_KEYS.DEAD_LETTER
    };

    super(rabbitMQ, config);
  }

  /**
   * 发送邮件通知
   */
  async sendEmailNotification(notification: UserNotificationMessage): Promise<boolean> {
    try {
      const success = await this.sendToQueue(notification);
      
      if (success) {
        logger.debug('邮件通知消息发送成功', {
          userId: notification.userId,
          type: notification.type
        });
      }

      return success;
    } catch (error) {
      logger.error('邮件通知发送失败', {
        userId: notification.userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * 处理邮件通知消息
   */
  protected async processMessage(context: MessageContext): Promise<MessageProcessingResult> {
    const { message } = context;

    try {
      const notification = message as UserNotificationMessage;
      
      // 这里应该发送邮件
      // 您需要根据实际的邮件服务来实现
      
      logger.info('发送邮件通知', {
        userId: notification.userId,
        type: notification.type,
        title: notification.title
      });

      // 示例实现
      // await this.emailService.sendEmail({
      //   to: await this.getUserEmail(notification.userId),
      //   subject: notification.title,
      //   body: notification.message,
      //   data: notification.data
      // });

      return { success: true };
    } catch (error) {
      logger.error('邮件通知处理失败', {
        userId: message.userId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        retryable: true
      };
    }
  }
}
