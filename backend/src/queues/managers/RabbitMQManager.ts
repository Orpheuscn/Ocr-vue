/**
 * RabbitMQ连接管理器
 * 负责管理RabbitMQ连接、通道和重连逻辑
 */

import * as amqp from "amqplib";
import { EventEmitter } from "events";
import { RabbitMQConfig, EXCHANGES, QUEUES, BINDINGS, getRabbitMQConfig } from "../config/queues";
import { getLogger } from "../../utils/logger";

const logger = getLogger("RabbitMQManager");

export interface ChannelWrapper {
  channel: amqp.Channel;
  isReady: boolean;
  lastUsed: Date;
}

export class RabbitMQManager extends EventEmitter {
  private connection: amqp.Connection | null = null;
  private channels: Map<string, ChannelWrapper> = new Map();
  private config: RabbitMQConfig;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private isShuttingDown = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(config?: RabbitMQConfig) {
    super();
    this.config = config || getRabbitMQConfig();
    this.setupProcessHandlers();
  }

  /**
   * 建立RabbitMQ连接
   */
  async connect(): Promise<void> {
    if (this.isConnecting || this.connection) {
      return;
    }

    this.isConnecting = true;

    try {
      logger.info("正在连接RabbitMQ...", {
        host: this.config.host,
        port: this.config.port,
        vhost: this.config.vhost,
      });

      const connectionUrl = this.buildConnectionUrl();

      this.connection = (await amqp.connect(connectionUrl, {
        heartbeat: this.config.heartbeat,
        timeout: this.config.connectionTimeout,
      })) as unknown as amqp.Connection;

      this.setupConnectionHandlers();
      await this.setupInfrastructure();

      this.reconnectAttempts = 0;
      this.isConnecting = false;

      logger.info("RabbitMQ连接成功建立");
      this.emit("connected");

      this.startHealthCheck();
    } catch (error) {
      this.isConnecting = false;
      const errorMessage =
        error instanceof Error
          ? error instanceof Error
            ? error.message
            : String(error)
          : String(error);
      logger.error("RabbitMQ连接失败", { error: errorMessage });
      this.emit("error", error);
      await this.handleReconnect();
    }
  }

  /**
   * 获取或创建通道
   */
  async getChannel(channelId: string = "default"): Promise<amqp.Channel> {
    if (!this.connection) {
      throw new Error("RabbitMQ连接未建立");
    }

    let channelWrapper = this.channels.get(channelId);

    if (!channelWrapper || !channelWrapper.isReady) {
      try {
        const channel = (await (this.connection as any).createChannel()) as amqp.Channel;

        // 设置预取数量
        await channel.prefetch(this.config.prefetchCount);

        // 设置通道事件处理器
        channel.on("error", (error: any) => {
          const errorMessage =
            error instanceof Error
              ? error instanceof Error
                ? error.message
                : String(error)
              : String(error);
          logger.error(`通道 ${channelId} 发生错误`, { error: errorMessage });
          this.channels.delete(channelId);
          this.emit("channelError", { channelId, error });
        });

        channel.on("close", () => {
          logger.warn(`通道 ${channelId} 已关闭`);
          this.channels.delete(channelId);
          this.emit("channelClosed", { channelId });
        });

        channelWrapper = {
          channel,
          isReady: true,
          lastUsed: new Date(),
        };

        this.channels.set(channelId, channelWrapper);
        logger.debug(`通道 ${channelId} 创建成功`);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error);
        logger.error(`创建通道 ${channelId} 失败`, { error: errorMessage });
        throw error;
      }
    }

    channelWrapper.lastUsed = new Date();
    return channelWrapper.channel;
  }

  /**
   * 发布消息到交换机
   */
  async publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options: amqp.Options.Publish = {}
  ): Promise<boolean> {
    try {
      const channel = await this.getChannel("publisher");

      const publishOptions = {
        persistent: true,
        timestamp: Date.now(),
        ...options,
      };

      const result = channel.publish(exchange, routingKey, content, publishOptions);

      if (!result) {
        logger.warn("消息发布被阻塞", { exchange, routingKey });
        // 等待drain事件
        await new Promise((resolve) => {
          channel.once("drain", resolve);
        });
      }

      logger.debug("消息发布成功", {
        exchange,
        routingKey,
        messageSize: content.length,
      });

      return true;
    } catch (error) {
      logger.error("消息发布失败", {
        exchange,
        routingKey,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 发送消息到队列
   */
  async sendToQueue(
    queue: string,
    content: Buffer,
    options: amqp.Options.Publish = {}
  ): Promise<boolean> {
    try {
      const channel = await this.getChannel("sender");

      const sendOptions = {
        persistent: true,
        timestamp: Date.now(),
        ...options,
      };

      const result = channel.sendToQueue(queue, content, sendOptions);

      if (!result) {
        logger.warn("消息发送被阻塞", { queue });
        await new Promise((resolve) => {
          channel.once("drain", resolve);
        });
      }

      logger.debug("消息发送成功", {
        queue,
        messageSize: content.length,
      });

      return true;
    } catch (error) {
      logger.error("消息发送失败", {
        queue,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 消费队列消息
   */
  async consume(
    queue: string,
    onMessage: (msg: amqp.ConsumeMessage | null) => Promise<void>,
    options: amqp.Options.Consume = {}
  ): Promise<{ consumerTag: string }> {
    try {
      const channel = await this.getChannel(`consumer_${queue}`);

      const consumeOptions = {
        noAck: false,
        ...options,
      };

      const result = await channel.consume(queue, onMessage, consumeOptions);

      logger.info("开始消费队列", {
        queue,
        consumerTag: result.consumerTag,
      });

      return result;
    } catch (error) {
      logger.error("消费队列失败", {
        queue,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 取消消费
   */
  async cancel(consumerTag: string): Promise<void> {
    try {
      // 查找包含该消费者的通道
      for (const [channelId, wrapper] of this.channels) {
        if (channelId.startsWith("consumer_")) {
          await wrapper.channel.cancel(consumerTag);
          logger.info("取消消费者", { consumerTag, channelId });
          break;
        }
      }
    } catch (error) {
      logger.error("取消消费者失败", {
        consumerTag,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 获取队列信息
   */
  async checkQueue(queue: string): Promise<amqp.Replies.AssertQueue> {
    try {
      const channel = await this.getChannel("checker");
      return await channel.checkQueue(queue);
    } catch (error) {
      logger.error("检查队列失败", {
        queue,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 清空队列
   */
  async purgeQueue(queue: string): Promise<amqp.Replies.PurgeQueue> {
    try {
      const channel = await this.getChannel("purger");
      const result = await channel.purgeQueue(queue);

      logger.info("队列已清空", {
        queue,
        messageCount: result.messageCount,
      });

      return result;
    } catch (error) {
      logger.error("清空队列失败", {
        queue,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    logger.info("正在关闭RabbitMQ连接...");

    // 停止健康检查
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // 停止重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // 关闭所有通道
    for (const [channelId, wrapper] of this.channels) {
      try {
        if (wrapper.channel) {
          await wrapper.channel.close();
          logger.debug(`通道 ${channelId} 已关闭`);
        }
      } catch (error) {
        logger.warn(`关闭通道 ${channelId} 失败`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    this.channels.clear();

    // 关闭连接
    if (this.connection) {
      try {
        await (this.connection as any).close();
        logger.info("RabbitMQ连接已关闭");
      } catch (error) {
        logger.warn("关闭RabbitMQ连接失败", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.connection = null;
    this.emit("disconnected");
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.connection !== null;
  }

  /**
   * 获取连接统计信息
   */
  getStats(): {
    isConnected: boolean;
    channelCount: number;
    reconnectAttempts: number;
    channels: Array<{ id: string; lastUsed: Date }>;
  } {
    return {
      isConnected: this.isConnected(),
      channelCount: this.channels.size,
      reconnectAttempts: this.reconnectAttempts,
      channels: Array.from(this.channels.entries()).map(([id, wrapper]) => ({
        id,
        lastUsed: wrapper.lastUsed,
      })),
    };
  }

  /**
   * 构建连接URL
   */
  private buildConnectionUrl(): string {
    const { username, password, host, port, vhost } = this.config;
    const encodedVhost = encodeURIComponent(vhost);
    return `amqp://${username}:${password}@${host}:${port}${encodedVhost}`;
  }

  /**
   * 设置连接事件处理器
   */
  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.on("error", (error) => {
      logger.error("RabbitMQ连接错误", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.emit("error", error);
    });

    this.connection.on("close", () => {
      logger.warn("RabbitMQ连接已关闭");
      this.connection = null;
      this.channels.clear();
      this.emit("disconnected");

      if (!this.isShuttingDown) {
        this.handleReconnect();
      }
    });

    this.connection.on("blocked", (reason) => {
      logger.warn("RabbitMQ连接被阻塞", { reason });
      this.emit("blocked", reason);
    });

    this.connection.on("unblocked", () => {
      logger.info("RabbitMQ连接解除阻塞");
      this.emit("unblocked");
    });
  }

  /**
   * 设置基础设施（交换机、队列、绑定）
   */
  private async setupInfrastructure(): Promise<void> {
    const channel = await this.getChannel("setup");

    try {
      // 创建交换机
      for (const exchange of Object.values(EXCHANGES)) {
        await channel.assertExchange(exchange.name, exchange.type, {
          durable: exchange.durable,
          autoDelete: exchange.autoDelete,
          arguments: exchange.arguments,
        });
        logger.debug("交换机创建成功", { name: exchange.name, type: exchange.type });
      }

      // 创建队列
      for (const queue of Object.values(QUEUES)) {
        await channel.assertQueue(queue.name, {
          durable: queue.durable,
          exclusive: queue.exclusive,
          autoDelete: queue.autoDelete,
          arguments: queue.arguments,
        });
        logger.debug("队列创建成功", { name: queue.name });
      }

      // 创建绑定
      for (const binding of BINDINGS) {
        await channel.bindQueue(
          binding.queue,
          binding.exchange,
          binding.routingKey,
          binding.arguments
        );
        logger.debug("绑定创建成功", {
          queue: binding.queue,
          exchange: binding.exchange,
          routingKey: binding.routingKey,
        });
      }

      logger.info("RabbitMQ基础设施设置完成");
    } catch (error) {
      logger.error("设置RabbitMQ基础设施失败", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 处理重连逻辑
   */
  private async handleReconnect(): Promise<void> {
    if (this.isShuttingDown || this.isConnecting) {
      return;
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error("已达到最大重连次数，停止重连");
      this.emit("maxReconnectAttemptsReached");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      60000 // 最大延迟1分钟
    );

    logger.info(`${delay}ms后尝试重连RabbitMQ`, {
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        logger.error("重连失败", { error: error instanceof Error ? error.message : String(error) });
      });
    }, delay);
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        if (this.isConnected()) {
          // 简单的健康检查：检查默认通道是否可用
          await this.getChannel("health");
          this.emit("healthCheck", { status: "healthy" });
        }
      } catch (error) {
        logger.warn("健康检查失败", {
          error: error instanceof Error ? error.message : String(error),
        });
        this.emit("healthCheck", {
          status: "unhealthy",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 30000); // 每30秒检查一次
  }

  /**
   * 设置进程处理器
   */
  private setupProcessHandlers(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`收到 ${signal} 信号，正在优雅关闭RabbitMQ连接...`);
      await this.close();
      process.exit(0);
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

    process.on("uncaughtException", (error) => {
      logger.error("未捕获的异常", {
        error: error instanceof Error ? error.message : String(error),
        stack: error.stack,
      });
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("未处理的Promise拒绝", { reason, promise });
    });
  }
}
