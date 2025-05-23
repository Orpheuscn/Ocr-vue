/**
 * 队列管理器
 * 统一管理所有队列服务的生命周期
 */

import { EventEmitter } from 'events';
import { RabbitMQManager } from './managers/RabbitMQManager';
import { OcrQueueService, TaskStatusService } from './services/OcrQueueService';
import { 
  NotificationService, 
  WebSocketNotificationService, 
  EmailNotificationService 
} from './services/NotificationService';
import { getRabbitMQConfig } from './config/queues';
import { getLogger } from '../utils/logger';

const logger = getLogger('QueueManager');

export interface QueueManagerConfig {
  autoStart?: boolean;
  enableOcrQueue?: boolean;
  enableNotifications?: boolean;
  enableWebSocket?: boolean;
  enableEmail?: boolean;
}

export class QueueManager extends EventEmitter {
  private rabbitMQ: RabbitMQManager;
  private config: QueueManagerConfig;
  
  // 队列服务实例
  private ocrQueueService: OcrQueueService | null = null;
  private taskStatusService: TaskStatusService | null = null;
  private notificationService: NotificationService | null = null;
  private websocketService: WebSocketNotificationService | null = null;
  private emailService: EmailNotificationService | null = null;

  private isInitialized = false;
  private isStarted = false;

  constructor(config: QueueManagerConfig = {}) {
    super();
    this.config = {
      autoStart: true,
      enableOcrQueue: true,
      enableNotifications: true,
      enableWebSocket: true,
      enableEmail: false,
      ...config
    };

    this.rabbitMQ = new RabbitMQManager(getRabbitMQConfig());
    this.setupRabbitMQEventHandlers();
  }

  /**
   * 初始化队列管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('队列管理器已经初始化');
      return;
    }

    try {
      logger.info('正在初始化队列管理器...');

      // 连接RabbitMQ
      await this.rabbitMQ.connect();

      // 创建队列服务实例
      await this.createQueueServices();

      // 设置服务事件处理器
      this.setupServiceEventHandlers();

      this.isInitialized = true;
      logger.info('队列管理器初始化完成');
      this.emit('initialized');

      // 自动启动
      if (this.config.autoStart) {
        await this.start();
      }
    } catch (error) {
      logger.error('队列管理器初始化失败', { error: error instanceof Error ? error.message : String(error) });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 启动所有队列服务
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('队列管理器未初始化，请先调用 initialize()');
    }

    if (this.isStarted) {
      logger.warn('队列服务已经启动');
      return;
    }

    try {
      logger.info('正在启动队列服务...');

      // 启动OCR队列服务
      if (this.config.enableOcrQueue && this.ocrQueueService) {
        await this.ocrQueueService.startConsuming();
        logger.info('OCR队列服务已启动');
      }

      // 启动任务状态服务
      if (this.taskStatusService) {
        await this.taskStatusService.startConsuming();
        logger.info('任务状态服务已启动');
      }

      // 启动通知服务
      if (this.config.enableNotifications && this.notificationService) {
        await this.notificationService.startConsuming();
        logger.info('通知服务已启动');
      }

      // 启动WebSocket通知服务
      if (this.config.enableWebSocket && this.websocketService) {
        await this.websocketService.startConsuming();
        logger.info('WebSocket通知服务已启动');
      }

      // 启动邮件通知服务
      if (this.config.enableEmail && this.emailService) {
        await this.emailService.startConsuming();
        logger.info('邮件通知服务已启动');
      }

      this.isStarted = true;
      logger.info('所有队列服务启动完成');
      this.emit('started');
    } catch (error) {
      logger.error('启动队列服务失败', { error: error instanceof Error ? error.message : String(error) });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 停止所有队列服务
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      logger.warn('队列服务未启动');
      return;
    }

    try {
      logger.info('正在停止队列服务...');

      // 停止所有服务
      const stopPromises: Promise<void>[] = [];

      if (this.ocrQueueService) {
        stopPromises.push(this.ocrQueueService.stopConsuming());
      }
      if (this.taskStatusService) {
        stopPromises.push(this.taskStatusService.stopConsuming());
      }
      if (this.notificationService) {
        stopPromises.push(this.notificationService.stopConsuming());
      }
      if (this.websocketService) {
        stopPromises.push(this.websocketService.stopConsuming());
      }
      if (this.emailService) {
        stopPromises.push(this.emailService.stopConsuming());
      }

      await Promise.all(stopPromises);

      this.isStarted = false;
      logger.info('所有队列服务已停止');
      this.emit('stopped');
    } catch (error) {
      logger.error('停止队列服务失败', { error: error instanceof Error ? error.message : String(error) });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 关闭队列管理器
   */
  async close(): Promise<void> {
    try {
      logger.info('正在关闭队列管理器...');

      // 停止服务
      if (this.isStarted) {
        await this.stop();
      }

      // 关闭RabbitMQ连接
      await this.rabbitMQ.close();

      this.isInitialized = false;
      logger.info('队列管理器已关闭');
      this.emit('closed');
    } catch (error) {
      logger.error('关闭队列管理器失败', { error: error instanceof Error ? error.message : String(error) });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 获取OCR队列服务
   */
  getOcrQueueService(): OcrQueueService {
    if (!this.ocrQueueService) {
      throw new Error('OCR队列服务未启用或未初始化');
    }
    return this.ocrQueueService;
  }

  /**
   * 获取通知服务
   */
  getNotificationService(): NotificationService {
    if (!this.notificationService) {
      throw new Error('通知服务未启用或未初始化');
    }
    return this.notificationService;
  }

  /**
   * 获取任务状态服务
   */
  getTaskStatusService(): TaskStatusService {
    if (!this.taskStatusService) {
      throw new Error('任务状态服务未初始化');
    }
    return this.taskStatusService;
  }

  /**
   * 获取WebSocket通知服务
   */
  getWebSocketService(): WebSocketNotificationService {
    if (!this.websocketService) {
      throw new Error('WebSocket通知服务未启用或未初始化');
    }
    return this.websocketService;
  }

  /**
   * 获取邮件通知服务
   */
  getEmailService(): EmailNotificationService {
    if (!this.emailService) {
      throw new Error('邮件通知服务未启用或未初始化');
    }
    return this.emailService;
  }

  /**
   * 获取RabbitMQ管理器
   */
  getRabbitMQManager(): RabbitMQManager {
    return this.rabbitMQ;
  }

  /**
   * 获取队列管理器状态
   */
  getStatus(): {
    isInitialized: boolean;
    isStarted: boolean;
    rabbitMQConnected: boolean;
    services: {
      ocr: boolean;
      taskStatus: boolean;
      notification: boolean;
      websocket: boolean;
      email: boolean;
    };
  } {
    return {
      isInitialized: this.isInitialized,
      isStarted: this.isStarted,
      rabbitMQConnected: this.rabbitMQ.isConnected(),
      services: {
        ocr: this.ocrQueueService?.getStatus().isConsuming || false,
        taskStatus: this.taskStatusService?.getStatus().isConsuming || false,
        notification: this.notificationService?.getStatus().isConsuming || false,
        websocket: this.websocketService?.getStatus().isConsuming || false,
        email: this.emailService?.getStatus().isConsuming || false
      }
    };
  }

  /**
   * 获取队列统计信息
   */
  async getQueueStats(): Promise<any> {
    try {
      const stats: any = {};

      if (this.ocrQueueService) {
        stats.ocr = await this.ocrQueueService.getQueueStats();
      }

      if (this.notificationService) {
        stats.notification = await this.notificationService.getQueueInfo();
      }

      if (this.websocketService) {
        stats.websocket = await this.websocketService.getQueueInfo();
      }

      if (this.emailService) {
        stats.email = await this.emailService.getQueueInfo();
      }

      return stats;
    } catch (error) {
      logger.error('获取队列统计信息失败', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    services: Record<string, boolean>;
    errors: string[];
  }> {
    const errors: string[] = [];
    const services: Record<string, boolean> = {};

    try {
      // 检查RabbitMQ连接
      services.rabbitmq = this.rabbitMQ.isConnected();
      if (!services.rabbitmq) {
        errors.push('RabbitMQ连接断开');
      }

      // 检查各个服务状态
      if (this.ocrQueueService) {
        services.ocr = this.ocrQueueService.getStatus().isConsuming;
        if (!services.ocr) {
          errors.push('OCR队列服务未运行');
        }
      }

      if (this.notificationService) {
        services.notification = this.notificationService.getStatus().isConsuming;
        if (!services.notification) {
          errors.push('通知服务未运行');
        }
      }

      const healthy = errors.length === 0;

      return { healthy, services, errors };
    } catch (error) {
      errors.push(`健康检查失败: ${error instanceof Error ? error.message : String(error)}`);
      return { healthy: false, services, errors };
    }
  }

  /**
   * 创建队列服务实例
   */
  private async createQueueServices(): Promise<void> {
    try {
      // 创建OCR队列服务
      if (this.config.enableOcrQueue) {
        this.ocrQueueService = new OcrQueueService(this.rabbitMQ);
        logger.debug('OCR队列服务实例已创建');
      }

      // 创建任务状态服务
      this.taskStatusService = new TaskStatusService(this.rabbitMQ);
      logger.debug('任务状态服务实例已创建');

      // 创建通知服务
      if (this.config.enableNotifications) {
        this.notificationService = new NotificationService(this.rabbitMQ);
        logger.debug('通知服务实例已创建');
      }

      // 创建WebSocket通知服务
      if (this.config.enableWebSocket) {
        this.websocketService = new WebSocketNotificationService(this.rabbitMQ);
        logger.debug('WebSocket通知服务实例已创建');
      }

      // 创建邮件通知服务
      if (this.config.enableEmail) {
        this.emailService = new EmailNotificationService(this.rabbitMQ);
        logger.debug('邮件通知服务实例已创建');
      }
    } catch (error) {
      logger.error('创建队列服务实例失败', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * 设置RabbitMQ事件处理器
   */
  private setupRabbitMQEventHandlers(): void {
    this.rabbitMQ.on('connected', () => {
      logger.info('RabbitMQ连接已建立');
      this.emit('rabbitmqConnected');
    });

    this.rabbitMQ.on('disconnected', () => {
      logger.warn('RabbitMQ连接已断开');
      this.emit('rabbitmqDisconnected');
    });

    this.rabbitMQ.on('error', (error) => {
      logger.error('RabbitMQ连接错误', { error: error instanceof Error ? error.message : String(error) });
      this.emit('rabbitmqError', error);
    });

    this.rabbitMQ.on('maxReconnectAttemptsReached', () => {
      logger.error('RabbitMQ重连次数已达上限');
      this.emit('rabbitmqReconnectFailed');
    });
  }

  /**
   * 设置服务事件处理器
   */
  private setupServiceEventHandlers(): void {
    // OCR服务事件
    if (this.ocrQueueService) {
      this.ocrQueueService.on('messageProcessed', (data) => {
        this.emit('ocrMessageProcessed', data);
      });
    }

    // 通知服务事件
    if (this.notificationService) {
      this.notificationService.on('messageProcessed', (data) => {
        this.emit('notificationProcessed', data);
      });
    }

    // 可以添加更多服务事件处理器...
  }
}
