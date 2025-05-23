#!/usr/bin/env node

/**
 * 启动队列处理器脚本
 * 启动Node.js OCR队列处理器和通知处理器
 */

import { getLogger } from "../utils/logger.js";
import { getNodeOcrQueueProcessor } from "../services/nodeOcrQueueProcessor.js";
import { getNotificationProcessor } from "../services/notificationProcessor.js";

const logger = getLogger("queueProcessors");

/**
 * 启动所有队列处理器
 */
async function startQueueProcessors() {
  try {
    logger.info("开始启动队列处理器...");

    // 启动Node.js OCR队列处理器
    const nodeOcrProcessor = getNodeOcrQueueProcessor();
    await nodeOcrProcessor.start();
    logger.info("Node.js OCR队列处理器已启动");

    // 启动通知处理器
    const notificationProcessor = getNotificationProcessor();
    await notificationProcessor.start();
    logger.info("通知处理器已启动");

    logger.info("所有队列处理器已成功启动");

    // 监听进程退出信号
    process.on("SIGINT", async () => {
      logger.info("收到SIGINT信号，正在关闭队列处理器...");
      await shutdown();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("收到SIGTERM信号，正在关闭队列处理器...");
      await shutdown();
      process.exit(0);
    });

    // 监听未捕获的异常
    process.on("uncaughtException", (error) => {
      logger.error("未捕获的异常", { error: error.message, stack: error.stack });
      shutdown().then(() => process.exit(1));
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("未处理的Promise拒绝", { reason, promise });
      shutdown().then(() => process.exit(1));
    });

    // 保持进程运行
    logger.info("队列处理器正在运行，按Ctrl+C退出");
  } catch (error) {
    logger.error("启动队列处理器失败", { error: error.message });
    process.exit(1);
  }
}

/**
 * 关闭所有队列处理器
 */
async function shutdown() {
  try {
    logger.info("正在关闭队列处理器...");

    // 关闭Node.js OCR队列处理器
    const nodeOcrProcessor = getNodeOcrQueueProcessor();
    await nodeOcrProcessor.stop();
    logger.info("Node.js OCR队列处理器已关闭");

    // 关闭通知处理器
    const notificationProcessor = getNotificationProcessor();
    await notificationProcessor.stop();
    logger.info("通知处理器已关闭");

    logger.info("所有队列处理器已关闭");
  } catch (error) {
    logger.error("关闭队列处理器时出错", { error: error.message });
  }
}

/**
 * 获取队列处理器状态
 */
function getProcessorStatus() {
  try {
    const nodeOcrProcessor = getNodeOcrQueueProcessor();
    const notificationProcessor = getNotificationProcessor();

    return {
      nodeOcr: nodeOcrProcessor.getStatus(),
      notification: notificationProcessor.getStatus(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("获取处理器状态失败", { error: error.message });
    return {
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// 如果直接运行此脚本，启动队列处理器
if (import.meta.url === `file://${process.argv[1]}`) {
  startQueueProcessors();
}

export { startQueueProcessors, shutdown, getProcessorStatus };
