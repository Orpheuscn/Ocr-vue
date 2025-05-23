/**
 * OCR控制器 - 集成RabbitMQ异步处理
 * 展示如何在现有API中使用队列系统
 */

import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { QueueManager } from "../queues/QueueManager";
import { getLogger } from "../utils/logger";

const logger = getLogger("OcrController");

// 全局队列管理器实例
let queueManager: QueueManager | null = null;

/**
 * 初始化队列管理器
 */
export async function initializeQueueManager(): Promise<void> {
  if (!queueManager) {
    queueManager = new QueueManager({
      autoStart: true,
      enableOcrQueue: true,
      enableNotifications: true,
      enableWebSocket: true,
      enableEmail: false,
    });

    await queueManager.initialize();
    logger.info("队列管理器初始化完成");
  }
}

/**
 * 获取队列管理器实例
 */
function getQueueManager(): QueueManager {
  if (!queueManager) {
    throw new Error("队列管理器未初始化，请先调用 initializeQueueManager()");
  }
  return queueManager;
}

/**
 * 异步OCR处理接口
 * POST /api/ocr/async
 */
export async function processOcrAsync(req: Request, res: Response): Promise<void> {
  try {
    const { imageData, options, priority } = req.body;
    const userId = req.user?.id; // 假设从认证中间件获取用户ID

    if (!userId) {
      res.status(401).json({ error: "用户未认证" });
      return;
    }

    if (!imageData) {
      res.status(400).json({ error: "缺少图像数据" });
      return;
    }

    // 生成任务ID
    const taskId = uuidv4();
    const imageId = uuidv4();

    // 获取OCR队列服务
    const queueManager = getQueueManager();
    const ocrService = queueManager.getOcrQueueService();

    // 提交OCR任务到队列
    const result = await ocrService.submitOcrTask({
      taskId,
      userId,
      imageId,
      imageData,
      options: {
        languageHints: options?.languageHints || ["zh", "en"],
        recognitionDirection: options?.recognitionDirection || "horizontal",
        recognitionMode: options?.recognitionMode || "text",
        imageFormat: options?.imageFormat,
        dpi: options?.dpi,
      },
      priority: priority || 5,
    });

    if (result.success) {
      // 返回任务ID，客户端可以用来查询状态
      res.status(202).json({
        success: true,
        taskId,
        message: "OCR任务已提交，正在处理中",
        statusUrl: `/api/ocr/status/${taskId}`,
      });

      logger.info("OCR任务提交成功", { taskId, userId });
    } else {
      res.status(500).json({
        success: false,
        error: "OCR任务提交失败",
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("OCR异步处理失败", { error: errorMessage });
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
    });
  }
}

/**
 * 批量OCR处理接口
 * POST /api/ocr/batch
 */
export async function processBatchOcr(req: Request, res: Response): Promise<void> {
  try {
    const { images, options } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "用户未认证" });
      return;
    }

    if (!Array.isArray(images) || images.length === 0) {
      res.status(400).json({ error: "缺少图像数据或格式错误" });
      return;
    }

    // 创建批量任务
    const batchId = uuidv4();
    const tasks = images.map((imageData, index) => ({
      taskId: uuidv4(),
      userId,
      imageId: uuidv4(),
      imageData,
      options: {
        languageHints: options?.languageHints || ["zh", "en"],
        recognitionDirection: options?.recognitionDirection || "horizontal",
        recognitionMode: options?.recognitionMode || "text",
      },
      priority: 3, // 批量任务使用较低优先级
    }));

    // 获取OCR队列服务
    const queueManager = getQueueManager();
    const ocrService = queueManager.getOcrQueueService();

    // 提交批量任务
    const result = await ocrService.submitBatchOcrTasks(tasks);

    res.status(202).json({
      success: true,
      batchId,
      totalTasks: tasks.length,
      successful: result.successful.length,
      failed: result.failed.length,
      taskIds: result.successful,
      errors: result.failed,
      message: "批量OCR任务已提交",
      statusUrl: `/api/ocr/batch/status/${batchId}`,
    });

    logger.info("批量OCR任务提交完成", {
      batchId,
      userId,
      total: tasks.length,
      successful: result.successful.length,
      failed: result.failed.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("批量OCR处理失败", { error: errorMessage });
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
    });
  }
}

/**
 * 查询OCR任务状态
 * GET /api/ocr/status/:taskId
 */
export async function getOcrTaskStatus(req: Request, res: Response): Promise<void> {
  try {
    const { taskId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "用户未认证" });
      return;
    }

    // 这里应该从数据库查询任务状态
    // 示例实现
    const taskStatus = await getTaskStatusFromDatabase(taskId, userId);

    if (!taskStatus) {
      res.status(404).json({
        success: false,
        error: "任务不存在或无权访问",
      });
      return;
    }

    res.json({
      success: true,
      taskId,
      status: taskStatus.status,
      progress: taskStatus.progress,
      result: taskStatus.result,
      error: taskStatus.error,
      createdAt: taskStatus.createdAt,
      updatedAt: taskStatus.updatedAt,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("查询任务状态失败", { error: errorMessage });
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
    });
  }
}

/**
 * 取消OCR任务
 * DELETE /api/ocr/task/:taskId
 */
export async function cancelOcrTask(req: Request, res: Response): Promise<void> {
  try {
    const { taskId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "用户未认证" });
      return;
    }

    // 获取OCR队列服务
    const queueManager = getQueueManager();
    const ocrService = queueManager.getOcrQueueService();

    // 取消任务
    const success = await ocrService.cancelOcrTask(taskId, userId);

    if (success) {
      res.json({
        success: true,
        message: "任务已取消",
      });

      logger.info("OCR任务已取消", { taskId, userId });
    } else {
      res.status(400).json({
        success: false,
        error: "任务取消失败",
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("取消OCR任务失败", { error: errorMessage });
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
    });
  }
}

/**
 * 获取队列状态（管理员接口）
 * GET /api/admin/queue/status
 */
export async function getQueueStatus(req: Request, res: Response): Promise<void> {
  try {
    // 检查管理员权限
    if (!req.user?.isAdmin) {
      res.status(403).json({ error: "权限不足" });
      return;
    }

    const queueManager = getQueueManager();

    // 获取队列状态
    const status = queueManager.getStatus();
    const stats = await queueManager.getQueueStats();
    const healthCheck = await queueManager.healthCheck();

    res.json({
      success: true,
      status,
      stats,
      healthCheck,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("获取队列状态失败", { error: errorMessage });
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
    });
  }
}

/**
 * 同步OCR处理接口（保持向后兼容）
 * POST /api/ocr/sync
 */
export async function processOcrSync(req: Request, res: Response): Promise<void> {
  try {
    const { imageData, options } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "用户未认证" });
      return;
    }

    if (!imageData) {
      res.status(400).json({ error: "缺少图像数据" });
      return;
    }

    // 直接调用OCR服务（同步处理）
    const ocrService = await import("../services/ocrService");

    const ocrRequest = {
      taskId: uuidv4(),
      userId,
      imageData,
      language: options?.languageHints?.[0] || "zh-CN",
      options: {
        detectOrientation: true,
        preprocessImage: true,
        outputFormat: "text" as const,
      },
    };

    const result = await ocrService.processOcrRequest(ocrRequest);

    res.json({
      success: true,
      result,
      processingTime: result.processingTime,
    });

    logger.info("同步OCR处理完成", {
      userId,
      textLength: result.text?.length || 0,
      processingTime: result.processingTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("同步OCR处理失败", { error: errorMessage });
    res.status(500).json({
      success: false,
      error: "OCR处理失败",
    });
  }
}

/**
 * 从数据库获取任务状态（示例实现）
 */
async function getTaskStatusFromDatabase(taskId: string, userId: string): Promise<any> {
  // 这里应该实现实际的数据库查询逻辑
  // 示例返回
  return {
    taskId,
    userId,
    status: "completed",
    progress: 100,
    result: {
      text: "示例识别结果",
      language: "zh",
      confidence: 0.95,
    },
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * 优雅关闭队列管理器
 */
export async function shutdownQueueManager(): Promise<void> {
  if (queueManager) {
    await queueManager.close();
    queueManager = null;
    logger.info("队列管理器已关闭");
  }
}
