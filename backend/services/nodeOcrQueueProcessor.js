import { getLogger } from "../utils/logger.js";
import rabbitmqManager from "../utils/rabbitmqManager.js";
import { performOcrSimple } from "./ocrService.js";
import { getDatabase } from "./database.js";

const logger = getLogger("nodeOcrQueueProcessor");

/**
 * Node.js OCR队列处理器
 * 独立处理Node.js的OCR任务
 */
class NodeOcrQueueProcessor {
  constructor() {
    this.rabbitmqManager = rabbitmqManager;
    this.isProcessing = false;
    this.processingCount = 0;
    this.maxConcurrentTasks = 3; // 最大并发任务数
  }

  /**
   * 启动队列处理器
   */
  async start() {
    try {
      logger.info("启动Node.js OCR队列处理器");

      // 确保RabbitMQ连接
      if (!this.rabbitmqManager.isHealthy()) {
        const connected = await this.rabbitmqManager.connect();
        if (!connected) {
          throw new Error("无法连接到RabbitMQ");
        }
      }

      // 设置队列消费者
      await this.rabbitmqManager.consumeQueue("node.ocr", this.processOcrTask.bind(this), {
        prefetch: this.maxConcurrentTasks,
      });

      this.isProcessing = true;
      logger.info("Node.js OCR队列处理器已启动");
    } catch (error) {
      logger.error("启动Node.js OCR队列处理器失败", { error: error.message });
      throw error;
    }
  }

  /**
   * 停止队列处理器
   */
  async stop() {
    try {
      logger.info("停止Node.js OCR队列处理器");
      this.isProcessing = false;

      // 等待当前任务完成
      while (this.processingCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      logger.info("Node.js OCR队列处理器已停止");
    } catch (error) {
      logger.error("停止Node.js OCR队列处理器失败", { error: error.message });
    }
  }

  /**
   * 处理OCR任务
   */
  async processOcrTask(message, ack, nack) {
    const startTime = Date.now();
    this.processingCount++;

    try {
      logger.info("开始处理Node.js OCR任务", {
        taskId: message.taskId,
        userId: message.userId,
        processingCount: this.processingCount,
      });

      // 验证消息格式
      if (!this.validateOcrMessage(message)) {
        logger.error("无效的OCR任务消息", { message });
        nack(false); // 拒绝消息，不重新入队
        return;
      }

      // 更新任务状态为处理中
      await this.updateTaskStatus(message.taskId, message.userId, {
        status: "processing",
        progress: 10,
        message: "开始OCR识别...",
        startedAt: new Date().toISOString(),
      });

      // 执行OCR处理
      const ocrResult = await this.performOcr(message);

      // 保存结果到数据库
      await this.saveOcrResult(message, ocrResult);

      // 更新任务状态为完成
      await this.updateTaskStatus(message.taskId, message.userId, {
        status: "completed",
        progress: 100,
        message: "OCR识别完成",
        completedAt: new Date().toISOString(),
        result: ocrResult,
        processingTime: Date.now() - startTime,
      });

      // 发送通知（如果需要）
      await this.sendNotification(message.userId, {
        type: "ocr_completed",
        taskId: message.taskId,
        message: "OCR识别已完成",
      });

      logger.info("Node.js OCR任务处理完成", {
        taskId: message.taskId,
        processingTime: Date.now() - startTime,
      });

      ack(); // 确认消息处理完成
    } catch (error) {
      logger.error("处理Node.js OCR任务失败", {
        taskId: message.taskId,
        error: error.message,
        stack: error.stack,
      });

      // 更新任务状态为失败
      await this.updateTaskStatus(message.taskId, message.userId, {
        status: "failed",
        message: `OCR处理失败: ${error.message}`,
        failedAt: new Date().toISOString(),
        error: error.message,
      });

      // 检查是否需要重试
      const retryCount = message.retryCount || 0;
      const maxRetries = message.maxRetries || 3;

      if (retryCount < maxRetries) {
        logger.info("重新入队OCR任务", {
          taskId: message.taskId,
          retryCount: retryCount + 1,
          maxRetries,
        });

        // 增加重试计数并重新入队
        message.retryCount = retryCount + 1;
        await this.rabbitmqManager.sendToQueue("node.ocr", message);
        ack(); // 确认原消息
      } else {
        logger.error("OCR任务重试次数已达上限", {
          taskId: message.taskId,
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
   * 验证OCR消息格式
   */
  validateOcrMessage(message) {
    const requiredFields = ["taskId", "userId", "imageId", "imageData"];
    return requiredFields.every((field) => message[field]);
  }

  /**
   * 执行OCR处理
   */
  async performOcr(message) {
    try {
      const { imageData, options } = message;

      // 调用OCR服务
      const result = await performOcrSimple(
        imageData,
        options.languageHints || [],
        options.recognitionDirection || "horizontal",
        options.recognitionMode || "text"
      );

      return {
        success: true,
        text: result.originalFullText,
        detectedLanguage: result.detectedLanguageCode,
        detectedLanguageName: result.detectedLanguageName,
        direction: result.direction,
        mode: result.mode,
        confidence: 0.95, // 简化版OCR的默认置信度
        metadata: {
          imageId: message.imageId,
          originalFilename: message.originalFilename,
          mimeType: message.mimeType,
          fileSize: message.fileSize,
        },
      };
    } catch (error) {
      logger.error("OCR处理失败", { error: error.message });
      throw error;
    }
  }

  /**
   * 保存OCR结果到数据库
   */
  async saveOcrResult(message, ocrResult) {
    try {
      const db = await getDatabase();
      const collection = db.collection("node_ocr_results");

      const document = {
        taskId: message.taskId,
        userId: message.userId,
        imageId: message.imageId,
        originalFilename: message.originalFilename,
        result: ocrResult,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await collection.insertOne(document);
      logger.info("OCR结果已保存到数据库", { taskId: message.taskId });
    } catch (error) {
      logger.error("保存OCR结果失败", { error: error.message });
      throw error;
    }
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId, userId, status) {
    try {
      const db = await getDatabase();
      const collection = db.collection("node_ocr_tasks");

      await collection.updateOne(
        { taskId, userId },
        {
          $set: {
            ...status,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      logger.debug("任务状态已更新", { taskId, status: status.status });
    } catch (error) {
      logger.error("更新任务状态失败", { error: error.message });
    }
  }

  /**
   * 发送通知
   */
  async sendNotification(userId, notification) {
    try {
      // 发送到通知队列
      await this.rabbitmqManager.sendToQueue("notifications", {
        userId,
        ...notification,
        timestamp: new Date().toISOString(),
      });

      logger.debug("通知已发送", { userId, type: notification.type });
    } catch (error) {
      logger.error("发送通知失败", { error: error.message });
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
let nodeOcrQueueProcessor = null;

/**
 * 获取Node.js OCR队列处理器实例
 */
export function getNodeOcrQueueProcessor() {
  if (!nodeOcrQueueProcessor) {
    nodeOcrQueueProcessor = new NodeOcrQueueProcessor();
  }
  return nodeOcrQueueProcessor;
}

export default NodeOcrQueueProcessor;
