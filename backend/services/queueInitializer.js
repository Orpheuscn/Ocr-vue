// backend/services/queueInitializer.js
import { getLogger } from "../utils/logger.js";
import rabbitmqManager from "../utils/rabbitmqManager.js";
import notificationQueueService from "./notificationQueueService.js";
import taskSchedulerService from "./taskSchedulerService.js";
import PythonOcrQueueProcessor from "./pythonOcrQueueProcessor.js";

const logger = getLogger("queueInitializer");

/**
 * 队列初始化器
 * 负责启动和初始化所有队列相关的服务
 */
class QueueInitializer {
  constructor() {
    this.isInitialized = false;
    this.services = {
      rabbitmq: false,
      notification: false,
      scheduler: false,
      pythonOcr: false,
    };
    this.pythonOcrProcessor = null;
  }

  /**
   * 初始化所有队列服务
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        logger.info("队列服务已经初始化");
        return true;
      }

      logger.info("开始初始化队列服务...");

      // 1. 初始化RabbitMQ连接
      logger.info("初始化RabbitMQ连接...");
      const rabbitmqConnected = await rabbitmqManager.connect();
      if (!rabbitmqConnected) {
        throw new Error("RabbitMQ连接失败");
      }
      this.services.rabbitmq = true;
      logger.info("✓ RabbitMQ连接成功");

      // 2. 初始化通知队列服务
      logger.info("初始化通知队列服务...");
      const notificationInitialized = await notificationQueueService.initialize();
      if (!notificationInitialized) {
        throw new Error("通知队列服务初始化失败");
      }
      this.services.notification = true;
      logger.info("✓ 通知队列服务初始化成功");

      // 3. 初始化任务调度服务
      logger.info("初始化任务调度服务...");
      const schedulerInitialized = await taskSchedulerService.initialize();
      if (!schedulerInitialized) {
        throw new Error("任务调度服务初始化失败");
      }
      this.services.scheduler = true;
      logger.info("✓ 任务调度服务初始化成功");

      // 4. 初始化Python OCR队列处理器
      logger.info("初始化Python OCR队列处理器...");
      this.pythonOcrProcessor = new PythonOcrQueueProcessor(rabbitmqManager);
      this.services.pythonOcr = true;
      logger.info("✓ Python OCR队列处理器初始化成功");

      this.isInitialized = true;
      logger.info("🎉 所有队列服务初始化完成");

      return true;
    } catch (error) {
      logger.error("队列服务初始化失败", { error: error.message });
      await this.cleanup();
      return false;
    }
  }

  /**
   * 启动所有队列服务
   */
  async start() {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error("队列服务初始化失败");
        }
      }

      logger.info("启动队列服务...");

      // 1. 启动通知队列消费
      logger.info("启动通知队列消费...");
      const notificationStarted = await notificationQueueService.startConsuming();
      if (!notificationStarted) {
        logger.warn("通知队列消费启动失败");
      } else {
        logger.info("✓ 通知队列消费已启动");
      }

      // 2. 启动任务调度器
      logger.info("启动任务调度器...");
      const schedulerStarted = await taskSchedulerService.start();
      if (!schedulerStarted) {
        logger.warn("任务调度器启动失败");
      } else {
        logger.info("✓ 任务调度器已启动");
      }

      // 3. 启动Python OCR队列处理器
      if (this.pythonOcrProcessor) {
        logger.info("启动Python OCR队列处理器...");
        try {
          await this.pythonOcrProcessor.start();
          logger.info("✓ Python OCR队列处理器已启动");
        } catch (error) {
          logger.warn("Python OCR队列处理器启动失败", { error: error.message });
        }
      }

      logger.info("🚀 队列服务启动完成");
      return true;
    } catch (error) {
      logger.error("启动队列服务失败", { error: error.message });
      return false;
    }
  }

  /**
   * 停止所有队列服务
   */
  async stop() {
    try {
      logger.info("停止队列服务...");

      // 1. 停止Python OCR队列处理器
      if (this.pythonOcrProcessor) {
        logger.info("停止Python OCR队列处理器...");
        try {
          await this.pythonOcrProcessor.stop();
          logger.info("✓ Python OCR队列处理器已停止");
        } catch (error) {
          logger.warn("停止Python OCR队列处理器失败", { error: error.message });
        }
      }

      // 2. 停止任务调度器
      logger.info("停止任务调度器...");
      await taskSchedulerService.stop();
      logger.info("✓ 任务调度器已停止");

      // 3. 停止通知队列消费
      logger.info("停止通知队列消费...");
      await notificationQueueService.stopConsuming();
      logger.info("✓ 通知队列消费已停止");

      // 3. 断开RabbitMQ连接
      logger.info("断开RabbitMQ连接...");
      await rabbitmqManager.disconnect();
      logger.info("✓ RabbitMQ连接已断开");

      logger.info("🛑 队列服务已停止");
    } catch (error) {
      logger.error("停止队列服务失败", { error: error.message });
    }
  }

  /**
   * 清理资源
   */
  async cleanup() {
    try {
      logger.info("清理队列服务资源...");

      // 重置服务状态
      this.services = {
        rabbitmq: false,
        notification: false,
        scheduler: false,
        pythonOcr: false,
      };

      this.isInitialized = false;
      this.pythonOcrProcessor = null;

      // 断开所有连接
      await this.stop();

      logger.info("✓ 队列服务资源清理完成");
    } catch (error) {
      logger.error("清理队列服务资源失败", { error: error.message });
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const health = {
        overall: "healthy",
        services: {},
        timestamp: new Date(),
      };

      // 检查RabbitMQ
      health.services.rabbitmq = {
        status: rabbitmqManager.isHealthy() ? "healthy" : "unhealthy",
        details: rabbitmqManager.getStatus(),
      };

      // 检查通知服务
      const notificationStatus = notificationQueueService.getStatus();
      health.services.notification = {
        status: notificationStatus.isInitialized ? "healthy" : "unhealthy",
        details: notificationStatus,
      };

      // 检查调度服务
      const schedulerStatus = taskSchedulerService.getStatus();
      health.services.scheduler = {
        status: schedulerStatus.isRunning ? "healthy" : "unhealthy",
        details: schedulerStatus,
      };

      // 检查Python OCR处理器
      if (this.pythonOcrProcessor) {
        const pythonOcrStatus = this.pythonOcrProcessor.getStatus();
        health.services.pythonOcr = {
          status: pythonOcrStatus.isProcessing ? "healthy" : "unhealthy",
          details: pythonOcrStatus,
        };
      } else {
        health.services.pythonOcr = {
          status: "not_initialized",
          details: { message: "Python OCR处理器未初始化" },
        };
      }

      // 确定整体健康状态
      const unhealthyServices = Object.values(health.services).filter(
        (service) => service.status === "unhealthy"
      );

      if (unhealthyServices.length > 0) {
        health.overall = "unhealthy";
      }

      return health;
    } catch (error) {
      logger.error("队列服务健康检查失败", { error: error.message });
      return {
        overall: "error",
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    const status = {
      isInitialized: this.isInitialized,
      services: this.services,
      rabbitmq: rabbitmqManager.getStatus(),
      notification: notificationQueueService.getStatus(),
      scheduler: taskSchedulerService.getStatus(),
    };

    // 添加Python OCR处理器状态
    if (this.pythonOcrProcessor) {
      status.pythonOcr = this.pythonOcrProcessor.getStatus();
    } else {
      status.pythonOcr = { isProcessing: false, message: "未初始化" };
    }

    return status;
  }

  /**
   * 重启所有服务
   */
  async restart() {
    try {
      logger.info("重启队列服务...");

      await this.stop();
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待2秒
      const started = await this.start();

      if (started) {
        logger.info("✓ 队列服务重启成功");
        return true;
      } else {
        logger.error("队列服务重启失败");
        return false;
      }
    } catch (error) {
      logger.error("重启队列服务失败", { error: error.message });
      return false;
    }
  }

  /**
   * 发送测试消息
   */
  async sendTestMessage() {
    try {
      if (!this.isInitialized) {
        throw new Error("队列服务未初始化");
      }

      // 发送测试通知
      const testNotification = await notificationQueueService.sendNotification({
        userId: "test-user",
        type: "system_test",
        title: "系统测试",
        message: "这是一条测试消息",
        data: { timestamp: new Date() },
        priority: "low",
        channels: ["websocket"],
      });

      if (testNotification) {
        logger.info("✓ 测试消息发送成功");
        return true;
      } else {
        logger.error("测试消息发送失败");
        return false;
      }
    } catch (error) {
      logger.error("发送测试消息失败", { error: error.message });
      return false;
    }
  }
}

// 创建单例实例
const queueInitializer = new QueueInitializer();

export default queueInitializer;
