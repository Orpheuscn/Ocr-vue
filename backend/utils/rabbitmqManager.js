// backend/utils/rabbitmqManager.js
import amqp from "amqplib";
import { getLogger } from "./logger.js";
import config from "./envConfig.js";

const logger = getLogger("rabbitmq");

class RabbitMQManager {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = parseInt(config.rabbitmqMaxReconnectAttempts) || 5;
    this.reconnectDelay = parseInt(config.rabbitmqReconnectDelay) || 5000;
  }

  /**
   * 获取RabbitMQ连接URL
   */
  getConnectionUrl() {
    const host = config.rabbitmqHost || "localhost";
    const port = config.rabbitmqPort || 5672;
    const username = config.rabbitmqUsername || "guest";
    const password = config.rabbitmqPassword || "guest";
    const vhost = config.rabbitmqVhost || "/";

    // 确保vhost以/开头，如果是URL编码的，直接使用
    const formattedVhost = vhost.startsWith("%2F")
      ? vhost
      : vhost.startsWith("/")
      ? vhost
      : `/${vhost}`;

    return `amqp://${username}:${password}@${host}:${port}/${formattedVhost}`;
  }

  /**
   * 连接到RabbitMQ
   */
  async connect() {
    if (this.isConnected) {
      return true;
    }

    try {
      const url = this.getConnectionUrl();
      logger.info("正在连接RabbitMQ...", { url: url.replace(/\/\/[^:]+:[^@]+@/, "//***:***@") });

      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      // 设置预取数量
      const prefetchCount = parseInt(config.rabbitmqPrefetchCount) || 10;
      await this.channel.prefetch(prefetchCount);

      this.isConnected = true;
      this.reconnectAttempts = 0;

      // 设置连接事件监听器
      this.connection.on("error", (err) => {
        logger.error("RabbitMQ连接错误", { error: err.message });
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.connection.on("close", () => {
        logger.warn("RabbitMQ连接已关闭");
        this.isConnected = false;
        this.scheduleReconnect();
      });

      logger.info("RabbitMQ连接成功");
      return true;
    } catch (error) {
      logger.error("RabbitMQ连接失败", { error: error.message });
      this.isConnected = false;
      this.scheduleReconnect();
      return false;
    }
  }

  /**
   * 安排重连
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error("RabbitMQ重连次数已达上限，停止重连");
      return;
    }

    this.reconnectAttempts++;
    logger.info(`${this.reconnectDelay}ms后尝试第${this.reconnectAttempts}次重连RabbitMQ`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  /**
   * 断开连接
   */
  async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      this.isConnected = false;
      logger.info("RabbitMQ连接已断开");
    } catch (error) {
      logger.error("断开RabbitMQ连接时出错", { error: error.message });
    }
  }

  /**
   * 检查连接状态
   */
  isHealthy() {
    return this.isConnected && this.connection && this.channel;
  }

  /**
   * 获取连接状态信息
   */
  getStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      hasConnection: !!this.connection,
      hasChannel: !!this.channel,
      // 避免循环引用，只返回基本状态信息
      connectionState: this.connection ? "established" : "none",
      channelState: this.channel ? "open" : "none",
    };
  }

  /**
   * 发送消息到队列（简化版本）
   */
  async sendToQueue(queueName, message, options = {}) {
    if (!this.isHealthy()) {
      throw new Error("RabbitMQ连接不可用");
    }

    try {
      // 确保队列存在
      await this.channel.assertQueue(queueName, { durable: true });

      // 发送消息
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const result = this.channel.sendToQueue(queueName, messageBuffer, {
        persistent: true,
        ...options,
      });

      if (result) {
        logger.debug("消息已发送到队列", { queue: queueName, messageId: message.id });
        return true;
      } else {
        logger.warn("消息发送失败，队列可能已满", { queue: queueName });
        return false;
      }
    } catch (error) {
      logger.error("发送消息到队列失败", {
        queue: queueName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 消费队列消息（简化版本）
   */
  async consumeQueue(queueName, handler, options = {}) {
    if (!this.isHealthy()) {
      throw new Error("RabbitMQ连接不可用");
    }

    try {
      // 确保队列存在
      await this.channel.assertQueue(queueName, { durable: true });

      // 开始消费
      await this.channel.consume(
        queueName,
        async (msg) => {
          if (msg) {
            try {
              const content = JSON.parse(msg.content.toString());
              await handler(content, msg);
              this.channel.ack(msg);
            } catch (error) {
              logger.error("处理消息时出错", {
                queue: queueName,
                error: error.message,
              });
              this.channel.nack(msg, false, false); // 拒绝消息，不重新入队
            }
          }
        },
        {
          noAck: false,
          ...options,
        }
      );

      logger.info("开始消费队列", { queue: queueName });
    } catch (error) {
      logger.error("消费队列失败", {
        queue: queueName,
        error: error.message,
      });
      throw error;
    }
  }
}

// 创建单例实例
const rabbitmqManager = new RabbitMQManager();

export default rabbitmqManager;
