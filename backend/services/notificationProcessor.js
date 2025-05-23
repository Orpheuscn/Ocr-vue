import { getLogger } from "../utils/logger.js";
import rabbitmqManager from "../utils/rabbitmqManager.js";
import { getDatabase } from "./database.js";

const logger = getLogger("notificationProcessor");

/**
 * 通知处理器
 * 处理系统通知消息
 */
class NotificationProcessor {
  constructor() {
    this.rabbitmqManager = rabbitmqManager;
    this.isProcessing = false;
    this.processingCount = 0;
    this.maxConcurrentTasks = 5; // 最大并发任务数
  }

  /**
   * 启动通知处理器
   */
  async start() {
    try {
      logger.info("启动通知处理器");

      // 确保RabbitMQ连接
      if (!this.rabbitmqManager.isHealthy()) {
        const connected = await this.rabbitmqManager.connect();
        if (!connected) {
          throw new Error("无法连接到RabbitMQ");
        }
      }

      // 设置队列消费者
      await this.rabbitmqManager.consumeQueue(
        "notifications",
        this.processNotification.bind(this),
        {
          prefetch: this.maxConcurrentTasks,
        }
      );

      this.isProcessing = true;
      logger.info("通知处理器已启动");
    } catch (error) {
      logger.error("启动通知处理器失败", { error: error.message });
      throw error;
    }
  }

  /**
   * 停止通知处理器
   */
  async stop() {
    try {
      logger.info("停止通知处理器");
      this.isProcessing = false;

      // 等待当前任务完成
      while (this.processingCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      logger.info("通知处理器已停止");
    } catch (error) {
      logger.error("停止通知处理器失败", { error: error.message });
    }
  }

  /**
   * 处理通知消息
   */
  async processNotification(message, ack, nack) {
    this.processingCount++;

    try {
      logger.info("开始处理通知", {
        type: message.type,
        userId: message.userId || message.user_id,
        processingCount: this.processingCount,
      });

      // 验证消息格式
      if (!this.validateNotificationMessage(message)) {
        logger.error("无效的通知消息", { message });
        nack(false); // 拒绝消息，不重新入队
        return;
      }

      // 根据通知类型处理
      await this.handleNotificationByType(message);

      // 保存通知到数据库
      await this.saveNotification(message);

      logger.info("通知处理完成", {
        type: message.type,
        userId: message.userId || message.user_id,
      });

      ack(); // 确认消息处理完成
    } catch (error) {
      logger.error("处理通知失败", {
        type: message.type,
        error: error.message,
        stack: error.stack,
      });

      // 检查是否需要重试
      const retryCount = message.retryCount || 0;
      const maxRetries = message.maxRetries || 3;

      if (retryCount < maxRetries) {
        logger.info("重新入队通知", {
          type: message.type,
          retryCount: retryCount + 1,
          maxRetries,
        });

        // 增加重试计数并重新入队
        message.retryCount = retryCount + 1;
        await this.rabbitmqManager.sendToQueue("notifications", message);
        ack(); // 确认原消息
      } else {
        logger.error("通知重试次数已达上限", {
          type: message.type,
          retryCount,
          maxRetries,
        });
        nack(false); // 拒绝消息，不重新入队
      }
    } finally {
      this.processingCount--;
    }
  }

  /**
   * 验证通知消息格式
   */
  validateNotificationMessage(message) {
    const requiredFields = ["type"];
    return requiredFields.every((field) => message[field]);
  }

  /**
   * 根据通知类型处理
   */
  async handleNotificationByType(message) {
    const { type } = message;

    switch (type) {
      case "ocr_completed":
        await this.handleOcrCompletedNotification(message);
        break;

      case "document_detection_completed":
        await this.handleDocumentDetectionCompletedNotification(message);
        break;

      case "task_failed":
        await this.handleTaskFailedNotification(message);
        break;

      case "user_message":
        await this.handleUserMessageNotification(message);
        break;

      default:
        logger.warn("未知的通知类型", { type });
        await this.handleGenericNotification(message);
        break;
    }
  }

  /**
   * 处理OCR完成通知
   */
  async handleOcrCompletedNotification(message) {
    logger.info("处理OCR完成通知", {
      taskId: message.taskId || message.task_id,
      userId: message.userId || message.user_id,
    });

    // 这里可以添加具体的处理逻辑，比如：
    // - 发送邮件通知
    // - 推送到前端
    // - 更新用户状态等
  }

  /**
   * 处理文档检测完成通知
   */
  async handleDocumentDetectionCompletedNotification(message) {
    logger.info("处理文档检测完成通知", {
      taskId: message.taskId || message.task_id,
      userId: message.userId || message.user_id,
    });

    // 这里可以添加具体的处理逻辑
  }

  /**
   * 处理任务失败通知
   */
  async handleTaskFailedNotification(message) {
    logger.info("处理任务失败通知", {
      taskId: message.taskId || message.task_id,
      userId: message.userId || message.user_id,
      error: message.error,
    });

    // 这里可以添加具体的处理逻辑
  }

  /**
   * 处理用户消息通知
   */
  async handleUserMessageNotification(message) {
    logger.info("处理用户消息通知", {
      userId: message.userId || message.user_id,
      message: message.message,
    });

    // 这里可以添加具体的处理逻辑
  }

  /**
   * 处理通用通知
   */
  async handleGenericNotification(message) {
    logger.info("处理通用通知", { message });

    // 这里可以添加通用的处理逻辑
  }

  /**
   * 保存通知到数据库
   */
  async saveNotification(message) {
    try {
      const db = await getDatabase();
      const collection = db.collection("notifications");

      const document = {
        type: message.type,
        userId: message.userId || message.user_id,
        taskId: message.taskId || message.task_id,
        message: message.message,
        data: message.data || {},
        processed: true,
        createdAt: new Date(message.timestamp || Date.now()),
        processedAt: new Date(),
      };

      await collection.insertOne(document);
      logger.debug("通知已保存到数据库", { type: message.type });
    } catch (error) {
      logger.error("保存通知失败", { error: error.message });
      throw error;
    }
  }

  /**
   * 获取处理器状态
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      processingCount: this.processingCount,
      maxConcurrentTasks: this.maxConcurrentTasks,
      isHealthy: this.rabbitmqManager.isHealthy(),
    };
  }
}

// 创建全局实例
let notificationProcessor = null;

/**
 * 获取通知处理器实例
 */
export function getNotificationProcessor() {
  if (!notificationProcessor) {
    notificationProcessor = new NotificationProcessor();
  }
  return notificationProcessor;
}

export default NotificationProcessor;
