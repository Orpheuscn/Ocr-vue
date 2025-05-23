// backend/controllers/ocrQueueController.js
import { getLogger } from "../utils/logger.js";
import rabbitmqManager from "../utils/rabbitmqManager.js";
import { v4 as uuidv4 } from "uuid";

const logger = getLogger("ocrQueueController");

/**
 * 提交文档解析任务到队列进行异步处理
 * 这是原有的文档解析任务提交函数
 */
export const submitDocumentAnalysisTask = async (req, res) => {
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
      rectangles = [],
      enableLayoutDetection = true,
      enableImageCropping = true,
    } = req.body;

    // 将图像转换为base64
    const base64Data = req.file.buffer.toString("base64");

    // 构建文档解析任务消息
    const documentTaskMessage = {
      messageId: `document_task_${taskId}`,
      timestamp: new Date(),
      version: "1.0",
      taskId,
      userId: userId.toString(),
      imageId,
      imageData: base64Data,
      originalFilename: req.file.originalname || "未命名图片",
      options: {
        languageHints,
        recognitionDirection,
        recognitionMode,
        rectangles,
        enableLayoutDetection,
        enableImageCropping,
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

    // 发送任务到文档解析处理队列
    const sent = await rabbitmqManager.sendToQueue("document.analysis", documentTaskMessage);

    if (!sent) {
      return res.status(503).json({
        success: false,
        message: "任务提交失败，请稍后重试",
      });
    }

    logger.info("文档解析任务已提交到队列", {
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
        message: "文档解析任务已提交，正在处理中...",
        estimatedTime: "预计2-5分钟完成",
        stages: ["文档布局检测", "图像预处理", "OCR文字识别", "结果整合"],
      },
    });
  } catch (error) {
    logger.error("提交文档解析任务失败", { error: error.message });
    res.status(500).json({
      success: false,
      message: "提交任务时出错",
      error: error.message,
    });
  }
};

/**
 * 获取OCR任务状态
 */
export const getTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user ? req.user.id || req.user._id : null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "用户未认证",
      });
    }

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "缺少任务ID",
      });
    }

    // 这里应该从数据库或缓存中查询任务状态
    // 暂时返回一个模拟的状态
    // TODO: 实现真正的任务状态查询

    logger.info("查询任务状态", { taskId, userId });

    res.json({
      success: true,
      data: {
        taskId,
        status: "processing",
        progress: 50,
        message: "正在处理中...",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error("查询任务状态失败", { error: error.message });
    res.status(500).json({
      success: false,
      message: "查询任务状态时出错",
      error: error.message,
    });
  }
};

/**
 * 获取用户的OCR任务列表
 */
export const getUserTasks = async (req, res) => {
  try {
    const userId = req.user ? req.user.id || req.user._id : null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "用户未认证",
      });
    }

    const { page = 1, limit = 10, status } = req.query;

    // TODO: 从数据库查询用户的任务列表
    // 暂时返回模拟数据

    logger.info("查询用户任务列表", { userId, page, limit, status });

    res.json({
      success: true,
      data: {
        tasks: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
      },
    });
  } catch (error) {
    logger.error("查询用户任务列表失败", { error: error.message });
    res.status(500).json({
      success: false,
      message: "查询任务列表时出错",
      error: error.message,
    });
  }
};

/**
 * 取消OCR任务
 */
export const cancelTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user ? req.user.id || req.user._id : null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "用户未认证",
      });
    }

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "缺少任务ID",
      });
    }

    // TODO: 实现任务取消逻辑
    // 1. 检查任务是否属于当前用户
    // 2. 检查任务是否可以取消（未开始或正在处理中）
    // 3. 发送取消消息到队列
    // 4. 更新任务状态

    logger.info("取消OCR任务", { taskId, userId });

    res.json({
      success: true,
      data: {
        taskId,
        status: "cancelled",
        message: "任务已取消",
      },
    });
  } catch (error) {
    logger.error("取消任务失败", { error: error.message });
    res.status(500).json({
      success: false,
      message: "取消任务时出错",
      error: error.message,
    });
  }
};

/**
 * 获取队列状态统计
 */
export const getQueueStats = async (req, res) => {
  try {
    // 检查管理员权限
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "需要管理员权限",
      });
    }

    // 获取RabbitMQ状态
    const rabbitmqStatus = rabbitmqManager.getStatus();

    // TODO: 获取更详细的队列统计信息
    // 1. 队列中的消息数量
    // 2. 处理中的任务数量
    // 3. 完成的任务数量
    // 4. 失败的任务数量
    // 5. 平均处理时间

    logger.info("查询队列统计信息");

    res.json({
      success: true,
      data: {
        rabbitmq: rabbitmqStatus,
        queues: {
          "ocr.process": {
            messageCount: 0,
            consumerCount: 1,
            processingRate: 0,
          },
        },
        stats: {
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          averageProcessingTime: 0,
        },
      },
    });
  } catch (error) {
    logger.error("查询队列统计失败", { error: error.message });
    res.status(500).json({
      success: false,
      message: "查询队列统计时出错",
      error: error.message,
    });
  }
};
