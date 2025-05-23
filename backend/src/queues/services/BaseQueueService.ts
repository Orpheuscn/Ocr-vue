/**
 * 基础队列服务类
 * 提供队列操作的通用功能
 */

import { Channel, ConsumeMessage } from "amqplib";
import { EventEmitter } from "events";
import { RabbitMQManager } from "../managers/RabbitMQManager";
import {
  BaseMessage,
  MessageProcessingResult,
  PublishOptions,
  ConsumerOptions,
  MessageContext,
  RetryStrategy,
} from "../types/messages";
import { getLogger } from "../../utils/logger";

const logger = getLogger("BaseQueueService");

export interface QueueServiceConfig {
  queueName: string;
  exchangeName: string;
  routingKey: string;
  retryStrategy?: RetryStrategy;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
}

export abstract class BaseQueueService extends EventEmitter {
  protected rabbitMQ: RabbitMQManager;
  protected config: QueueServiceConfig;
  protected isConsuming = false;
  protected consumerTag: string | null = null;

  constructor(rabbitMQ: RabbitMQManager, config: QueueServiceConfig) {
    super();
    this.rabbitMQ = rabbitMQ;
    this.config = config;
  }

  /**
   * 发布消息到交换机
   */
  async publishMessage<T extends BaseMessage>(
    message: T,
    options: PublishOptions = {}
  ): Promise<boolean> {
    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));

      const publishOptions = {
        persistent: true,
        messageId: message.messageId,
        timestamp: message.timestamp.getTime(),
        correlationId: message.correlationId,
        ...options,
      };

      const success = await this.rabbitMQ.publish(
        this.config.exchangeName,
        this.config.routingKey,
        messageBuffer,
        publishOptions
      );

      if (success) {
        logger.debug("消息发布成功", {
          messageId: message.messageId,
          exchange: this.config.exchangeName,
          routingKey: this.config.routingKey,
        });
        this.emit("messagePublished", { message, success: true });
      }

      return success;
    } catch (error) {
      logger.error("消息发布失败", {
        messageId: message.messageId,
        error: error instanceof Error ? error.message : String(error),
        exchange: this.config.exchangeName,
        routingKey: this.config.routingKey,
      });
      this.emit("messagePublished", { message, success: false, error });
      throw error;
    }
  }

  /**
   * 发送消息到队列
   */
  async sendToQueue<T extends BaseMessage>(
    message: T,
    options: PublishOptions = {}
  ): Promise<boolean> {
    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));

      const sendOptions = {
        persistent: true,
        messageId: message.messageId,
        timestamp: message.timestamp.getTime(),
        correlationId: message.correlationId,
        ...options,
      };

      const success = await this.rabbitMQ.sendToQueue(
        this.config.queueName,
        messageBuffer,
        sendOptions
      );

      if (success) {
        logger.debug("消息发送成功", {
          messageId: message.messageId,
          queue: this.config.queueName,
        });
        this.emit("messageSent", { message, success: true });
      }

      return success;
    } catch (error) {
      logger.error("消息发送失败", {
        messageId: message.messageId,
        error: error instanceof Error ? error.message : String(error),
        queue: this.config.queueName,
      });
      this.emit("messageSent", { message, success: false, error });
      throw error;
    }
  }

  /**
   * 开始消费队列
   */
  async startConsuming(options: ConsumerOptions = {}): Promise<void> {
    if (this.isConsuming) {
      logger.warn("队列已在消费中", { queue: this.config.queueName });
      return;
    }

    try {
      const consumeOptions = {
        noAck: false,
        ...options,
      };

      const result = await this.rabbitMQ.consume(
        this.config.queueName,
        this.handleMessage.bind(this),
        consumeOptions
      );

      this.consumerTag = result.consumerTag;
      this.isConsuming = true;

      logger.info("开始消费队列", {
        queue: this.config.queueName,
        consumerTag: this.consumerTag,
      });

      this.emit("consumingStarted", {
        queue: this.config.queueName,
        consumerTag: this.consumerTag,
      });
    } catch (error) {
      logger.error("开始消费队列失败", {
        queue: this.config.queueName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 停止消费队列
   */
  async stopConsuming(): Promise<void> {
    if (!this.isConsuming || !this.consumerTag) {
      return;
    }

    try {
      await this.rabbitMQ.cancel(this.consumerTag);
      this.isConsuming = false;
      this.consumerTag = null;

      logger.info("停止消费队列", { queue: this.config.queueName });
      this.emit("consumingStopped", { queue: this.config.queueName });
    } catch (error) {
      logger.error("停止消费队列失败", {
        queue: this.config.queueName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 处理接收到的消息
   */
  private async handleMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg) {
      logger.warn("收到空消息", { queue: this.config.queueName });
      return;
    }

    const startTime = Date.now();
    let message: any;
    let messageId: string = "unknown";

    try {
      // 解析消息
      message = JSON.parse(msg.content.toString());
      messageId = message.messageId || "unknown";

      logger.debug("收到消息", {
        messageId,
        queue: this.config.queueName,
        deliveryTag: msg.fields.deliveryTag,
      });

      // 创建消息上下文
      const context: MessageContext = {
        message,
        metadata: {
          deliveryTag: msg.fields.deliveryTag,
          redelivered: msg.fields.redelivered,
          exchange: msg.fields.exchange,
          routingKey: msg.fields.routingKey,
          messageCount: (msg.fields as any).messageCount || 0,
          properties: msg.properties,
        },
        ack: (options) => this.ackMessage(msg, options),
        nack: (options) => this.nackMessage(msg, options),
        reject: (requeue) => this.rejectMessage(msg, requeue),
      };

      // 处理消息
      const result = await this.processMessage(context);

      if (result.success) {
        context.ack();

        const processingTime = Date.now() - startTime;
        logger.debug("消息处理成功", {
          messageId,
          processingTime,
          queue: this.config.queueName,
        });

        this.emit("messageProcessed", {
          messageId,
          success: true,
          processingTime,
          result: result.data,
        });
      } else {
        // 处理失败，根据策略决定是否重试
        await this.handleProcessingFailure(context, result);
      }
    } catch (error) {
      logger.error("消息处理异常", {
        messageId: messageId || "unknown",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        queue: this.config.queueName,
      });

      // 异常情况下拒绝消息
      const channel = await this.rabbitMQ.getChannel();
      channel.nack(msg, false, false); // 不重新入队

      this.emit("messageProcessed", {
        messageId: messageId || "unknown",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime,
      });
    }
  }

  /**
   * 处理消息失败的情况
   */
  private async handleProcessingFailure(
    context: MessageContext,
    result: MessageProcessingResult
  ): Promise<void> {
    const { message, metadata } = context;
    const messageId = message.messageId || "unknown";

    // 检查是否可以重试
    if (result.retryable && this.shouldRetry(message)) {
      logger.info("消息处理失败，准备重试", {
        messageId,
        retryCount: message.retryCount || 0,
        maxRetries: this.config.retryStrategy?.maxRetries || 3,
      });

      // 增加重试计数
      message.retryCount = (message.retryCount || 0) + 1;

      // 发送到重试队列或延迟重新发布
      await this.scheduleRetry(message);
      context.ack(); // 确认原消息
    } else {
      logger.warn("消息处理失败，不再重试", {
        messageId,
        retryCount: message.retryCount || 0,
        error: result.error,
      });

      // 发送到死信队列
      await this.sendToDeadLetter(message, result.error);
      context.ack(); // 确认原消息
    }

    this.emit("messageProcessed", {
      messageId,
      success: false,
      error: result.error,
      retryable: result.retryable,
    });
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(message: any): boolean {
    if (!this.config.retryStrategy) {
      return false;
    }

    const retryCount = message.retryCount || 0;
    return retryCount < this.config.retryStrategy.maxRetries;
  }

  /**
   * 安排重试
   */
  private async scheduleRetry(message: any): Promise<void> {
    if (!this.config.retryStrategy) {
      return;
    }

    const retryCount = message.retryCount || 0;
    const delay = this.calculateRetryDelay(retryCount);

    // 更新消息时间戳
    message.timestamp = new Date();

    // 发布到延迟队列或使用TTL实现延迟
    await this.publishMessage(message, {
      expiration: delay.toString(),
    });

    logger.info("消息已安排重试", {
      messageId: message.messageId,
      retryCount,
      delay,
    });
  }

  /**
   * 计算重试延迟
   */
  private calculateRetryDelay(retryCount: number): number {
    if (!this.config.retryStrategy) {
      return 5000; // 默认5秒
    }

    const { initialDelay, maxDelay, backoffMultiplier, jitter } = this.config.retryStrategy;

    let delay = initialDelay * Math.pow(backoffMultiplier, retryCount);
    delay = Math.min(delay, maxDelay);

    // 添加抖动
    if (jitter) {
      const jitterAmount = delay * 0.1; // 10%的抖动
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }

    return Math.floor(delay);
  }

  /**
   * 发送到死信队列
   */
  private async sendToDeadLetter(message: any, error?: string): Promise<void> {
    if (!this.config.deadLetterExchange || !this.config.deadLetterRoutingKey) {
      logger.warn("未配置死信队列，丢弃消息", {
        messageId: message.messageId,
      });
      return;
    }

    try {
      // 添加错误信息到消息
      const deadLetterMessage = {
        ...message,
        deadLetterInfo: {
          originalQueue: this.config.queueName,
          error,
          timestamp: new Date(),
          retryCount: message.retryCount || 0,
        },
      };

      const messageBuffer = Buffer.from(JSON.stringify(deadLetterMessage));

      await this.rabbitMQ.publish(
        this.config.deadLetterExchange,
        this.config.deadLetterRoutingKey,
        messageBuffer,
        { persistent: true }
      );

      logger.info("消息已发送到死信队列", {
        messageId: message.messageId,
        deadLetterExchange: this.config.deadLetterExchange,
        deadLetterRoutingKey: this.config.deadLetterRoutingKey,
      });
    } catch (deadLetterError) {
      logger.error("发送到死信队列失败", {
        messageId: message.messageId,
        error: deadLetterError instanceof Error ? deadLetterError.message : String(deadLetterError),
      });
    }
  }

  /**
   * 确认消息
   */
  private async ackMessage(msg: ConsumeMessage, options: any = {}): Promise<void> {
    try {
      const channel = await this.rabbitMQ.getChannel();
      channel.ack(msg, options.multiple || false);
    } catch (error) {
      logger.error("确认消息失败", {
        deliveryTag: msg.fields.deliveryTag,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 否定确认消息
   */
  private async nackMessage(msg: ConsumeMessage, options: any = {}): Promise<void> {
    try {
      const channel = await this.rabbitMQ.getChannel();
      channel.nack(msg, options.multiple || false, options.requeue !== false);
    } catch (error) {
      logger.error("否定确认消息失败", {
        deliveryTag: msg.fields.deliveryTag,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 拒绝消息
   */
  private async rejectMessage(msg: ConsumeMessage, requeue = false): Promise<void> {
    try {
      const channel = await this.rabbitMQ.getChannel();
      channel.reject(msg, requeue);
    } catch (error) {
      logger.error("拒绝消息失败", {
        deliveryTag: msg.fields.deliveryTag,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 获取队列信息
   */
  async getQueueInfo(): Promise<any> {
    try {
      return await this.rabbitMQ.checkQueue(this.config.queueName);
    } catch (error) {
      logger.error("获取队列信息失败", {
        queue: this.config.queueName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 清空队列
   */
  async purgeQueue(): Promise<any> {
    try {
      return await this.rabbitMQ.purgeQueue(this.config.queueName);
    } catch (error) {
      logger.error("清空队列失败", {
        queue: this.config.queueName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 抽象方法：处理消息
   * 子类必须实现此方法
   */
  protected abstract processMessage(context: MessageContext): Promise<MessageProcessingResult>;

  /**
   * 获取服务状态
   */
  getStatus(): {
    isConsuming: boolean;
    consumerTag: string | null;
    queueName: string;
    exchangeName: string;
    routingKey: string;
  } {
    return {
      isConsuming: this.isConsuming,
      consumerTag: this.consumerTag,
      queueName: this.config.queueName,
      exchangeName: this.config.exchangeName,
      routingKey: this.config.routingKey,
    };
  }
}
