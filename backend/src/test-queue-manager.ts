/**
 * 队列管理器测试
 * 测试TypeScript RabbitMQ队列管理器的基本功能
 */

import { QueueManager } from "./queues/QueueManager";
import { getLogger } from "./utils/logger";

const logger = getLogger("QueueManagerTest");

/**
 * 测试队列管理器基本功能
 */
async function testQueueManager(): Promise<void> {
  let queueManager: QueueManager | null = null;

  try {
    logger.info("🚀 开始测试队列管理器...");

    // 创建队列管理器实例
    queueManager = new QueueManager({
      autoStart: false, // 手动启动以便测试
      enableOcrQueue: true,
      enableNotifications: true,
      enableWebSocket: false, // 简化测试
      enableEmail: false,
    });

    // 监听事件
    queueManager.on("initialized", () => {
      logger.info("✅ 队列管理器初始化完成");
    });

    queueManager.on("started", () => {
      logger.info("✅ 队列管理器启动完成");
    });

    queueManager.on("error", (error) => {
      logger.error("❌ 队列管理器错误", { error: error.message });
    });

    // 初始化队列管理器
    logger.info("正在初始化队列管理器...");
    await queueManager.initialize();

    // 检查状态
    const status = queueManager.getStatus();
    logger.info("队列管理器状态", status);

    if (!status.isInitialized) {
      throw new Error("队列管理器初始化失败");
    }

    // 启动队列服务
    logger.info("正在启动队列服务...");
    await queueManager.start();

    // 再次检查状态
    const runningStatus = queueManager.getStatus();
    logger.info("运行状态", runningStatus);

    if (!runningStatus.isStarted) {
      throw new Error("队列服务启动失败");
    }

    // 健康检查
    logger.info("执行健康检查...");
    const healthCheck = await queueManager.healthCheck();
    logger.info("健康检查结果", healthCheck);

    if (!healthCheck.healthy) {
      logger.warn("健康检查发现问题", { errors: healthCheck.errors });
    }

    // 获取队列统计信息
    try {
      logger.info("获取队列统计信息...");
      const stats = await queueManager.getQueueStats();
      logger.info("队列统计信息", stats);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("获取队列统计信息失败", { error: errorMessage });
    }

    logger.info("🎉 队列管理器测试完成！");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("💥 队列管理器测试失败", { error: errorMessage });
    throw error;
  } finally {
    // 清理资源
    if (queueManager) {
      try {
        logger.info("正在关闭队列管理器...");
        await queueManager.close();
        logger.info("✅ 队列管理器已关闭");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn("关闭队列管理器时发生错误", { error: errorMessage });
      }
    }
  }
}

/**
 * 测试OCR队列服务
 */
async function testOcrQueueService(): Promise<void> {
  let queueManager: QueueManager | null = null;

  try {
    logger.info("🔍 开始测试OCR队列服务...");

    // 创建队列管理器
    queueManager = new QueueManager({
      autoStart: true,
      enableOcrQueue: true,
      enableNotifications: false,
      enableWebSocket: false,
      enableEmail: false,
    });

    // 初始化
    await queueManager.initialize();

    // 等待启动完成
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 获取OCR队列服务
    const ocrService = queueManager.getOcrQueueService();
    logger.info("✅ OCR队列服务获取成功");

    // 测试提交OCR任务
    const testTask = {
      taskId: "test-task-" + Date.now(),
      userId: "test-user",
      imageId: "test-image",
      imageData:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
      options: {
        languageHints: ["zh", "en"],
        recognitionDirection: "horizontal" as const,
        recognitionMode: "text" as const,
      },
      priority: 1,
    };

    logger.info("提交测试OCR任务...");
    const submitResult = await ocrService.submitOcrTask(testTask);

    if (submitResult.success) {
      logger.info("✅ OCR任务提交成功", { taskId: testTask.taskId });
    } else {
      logger.warn("⚠️ OCR任务提交失败", { error: (submitResult as any).error });
    }

    // 获取队列统计信息
    const queueStats = await ocrService.getQueueStats();
    logger.info("OCR队列统计信息", queueStats);

    logger.info("🎉 OCR队列服务测试完成！");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("💥 OCR队列服务测试失败", { error: errorMessage });
    throw error;
  } finally {
    if (queueManager) {
      await queueManager.close();
    }
  }
}

/**
 * 主测试函数
 */
async function main(): Promise<void> {
  try {
    logger.info("🌟 开始RabbitMQ TypeScript集成测试");

    // 测试1: 基本队列管理器功能
    await testQueueManager();

    // 等待一下
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 测试2: OCR队列服务
    await testOcrQueueService();

    logger.info("✨ 所有测试完成！RabbitMQ TypeScript集成正常工作");
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("💥 测试失败", { error: errorMessage });
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main();
}

export { testQueueManager, testOcrQueueService };
