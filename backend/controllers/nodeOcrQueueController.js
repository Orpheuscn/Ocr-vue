import { getLogger } from "../utils/logger.js";
import rabbitmqManager from "../utils/rabbitmqManager.js";
import { v4 as uuidv4 } from "uuid";

const logger = getLogger("nodeOcrQueueController");

/**
 * 提交Node.js OCR任务到队列进行异步处理
 * Node.js服务独立处理OCR任务
 */
export const submitNodeOcrTask = async (req, res) => {
  try {
    logger.info("收到Node.js OCR队列处理请求", {
      hasFile: !!req.file,
      body: req.body,
      userId: req.user?.id,
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "请上传图像文件",
      });
    }

    // 获取用户ID
    const userId = req.user ? req.user.id || req.user._id : null;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "用户未认证",
      });
    }

    // 生成任务ID和图像ID
    const taskId = uuidv4();
    const imageId = uuidv4();

    // 获取参数
    const {
      languageHints = [],
      recognitionDirection = "horizontal",
      recognitionMode = "text",
    } = req.body;

    // 将图像转换为base64
    const base64Data = req.file.buffer.toString("base64");

    // 构建Node.js OCR任务消息
    const nodeOcrTaskMessage = {
      messageId: `node_ocr_task_${taskId}`,
      timestamp: new Date(),
      version: "1.0",
      taskId,
      userId: userId.toString(),
      imageId,
      imageData: base64Data,
      originalFilename: req.file.originalname || "未命名图片",
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      options: {
        languageHints,
        recognitionDirection,
        recognitionMode,
      },
      priority: 1,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
    };

    // 连接RabbitMQ（如果尚未连接）
    if (!rabbitmqManager.isHealthy()) {
      const connected = await rabbitmqManager.connect();
      if (!connected) {
        return res.status(503).json({
          success: false,
          message: "消息队列服务暂时不可用，请稍后重试",
        });
      }
    }

    logger.info("准备发送Node.js OCR任务到队列", {
      taskId,
      imageId,
      filename: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });

    // 发送任务到Node.js OCR处理队列
    const sent = await rabbitmqManager.sendToQueue("node.ocr", nodeOcrTaskMessage);

    if (!sent) {
      return res.status(503).json({
        success: false,
        message: "任务提交失败，请稍后重试",
      });
    }

    logger.info("Node.js OCR任务已提交到队列", {
      taskId,
      userId,
      imageId,
      filename: req.file.originalname,
    });

    // 返回任务ID给客户端
    res.json({
      success: true,
      data: {
        taskId,
        imageId,
        status: "queued",
        message: "OCR任务已提交，正在处理中...",
        estimatedTime: "预计1-3分钟完成",
        stages: ["图像预处理", "OCR文字识别", "结果存储"],
      },
    });
  } catch (error) {
    logger.error("提交Node.js OCR任务失败", { error: error.message });
    res.status(500).json({
      success: false,
      message: "提交任务时出错",
      error: error.message,
    });
  }
};

/**
 * 获取Node.js OCR任务状态
 */
export const getNodeOcrTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user ? req.user.id || req.user._id : null;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "任务ID不能为空",
      });
    }

    logger.info("查询Node.js OCR任务状态", { taskId, userId });

    // 这里应该从数据库或缓存中查询任务状态
    // 暂时返回模拟状态
    const taskStatus = {
      taskId,
      status: "processing", // queued, processing, completed, failed
      progress: 50,
      message: "正在进行OCR识别...",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: taskStatus,
    });
  } catch (error) {
    logger.error("查询Node.js OCR任务状态失败", { error: error.message });
    res.status(500).json({
      success: false,
      message: "查询任务状态时出错",
      error: error.message,
    });
  }
};

/**
 * 取消Node.js OCR任务
 */
export const cancelNodeOcrTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user ? req.user.id || req.user._id : null;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "任务ID不能为空",
      });
    }

    logger.info("取消Node.js OCR任务", { taskId, userId });

    // 这里应该实现任务取消逻辑
    // 暂时返回成功响应
    res.json({
      success: true,
      message: "任务已取消",
      data: {
        taskId,
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("取消Node.js OCR任务失败", { error: error.message });
    res.status(500).json({
      success: false,
      message: "取消任务时出错",
      error: error.message,
    });
  }
};

/**
 * 获取Node.js OCR队列状态（管理员功能）
 */
export const getNodeOcrQueueStatus = async (req, res) => {
  try {
    logger.info("查询Node.js OCR队列状态");

    // 这里应该查询队列的实际状态
    const queueStatus = {
      queueName: "node.ocr",
      messageCount: 0,
      consumerCount: 1,
      isHealthy: rabbitmqManager.isHealthy(),
      lastUpdated: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: queueStatus,
    });
  } catch (error) {
    logger.error("查询Node.js OCR队列状态失败", { error: error.message });
    res.status(500).json({
      success: false,
      message: "查询队列状态时出错",
      error: error.message,
    });
  }
};
