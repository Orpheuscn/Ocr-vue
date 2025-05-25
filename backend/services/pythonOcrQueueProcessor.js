/**
 * Python OCR队列处理器
 * 处理来自Python服务器的OCR请求，使用Google Cloud Vision API
 */

import { getLogger } from "../utils/logger.js";
import { performOcr, performOcrSimple } from "./ocrService.js";

const logger = getLogger("PythonOcrQueueProcessor");

class PythonOcrQueueProcessor {
  constructor(rabbitmqManager) {
    this.rabbitmqManager = rabbitmqManager;
    this.isProcessing = false;
    this.maxConcurrentTasks = 5;
    this.processingCount = 0;
  }

  /**
   * 启动队列处理器
   */
  async start() {
    try {
      logger.info("启动Python OCR队列处理器");

      // 确保RabbitMQ连接
      if (!this.rabbitmqManager.isHealthy()) {
        const connected = await this.rabbitmqManager.connect();
        if (!connected) {
          throw new Error("无法连接到RabbitMQ");
        }
      }

      // 设置队列消费者 - 监听来自Python的OCR请求
      await this.rabbitmqManager.consumeQueue(
        "python.to.node.ocr",
        this.processOcrRequest.bind(this),
        {
          prefetch: this.maxConcurrentTasks,
        }
      );

      this.isProcessing = true;
      logger.info("Python OCR队列处理器已启动");
    } catch (error) {
      logger.error("启动Python OCR队列处理器失败", { error: error.message });
      throw error;
    }
  }

  /**
   * 停止队列处理器
   */
  async stop() {
    try {
      this.isProcessing = false;
      logger.info("Python OCR队列处理器已停止");
    } catch (error) {
      logger.error("停止Python OCR队列处理器失败", { error: error.message });
    }
  }

  /**
   * 处理OCR请求
   */
  async processOcrRequest(message, ack, nack) {
    const startTime = Date.now();
    this.processingCount++;

    try {
      const { requestId, imageId, cropsData, options } = message;

      if (!requestId || !imageId || !cropsData) {
        throw new Error("OCR请求消息格式无效");
      }

      logger.info("开始处理Python OCR请求", {
        requestId,
        imageId,
        cropsCount: cropsData.length,
      });

      // 处理每个裁剪图片的OCR
      const ocrResults = [];
      for (const cropData of cropsData) {
        try {
          const result = await this.performSingleOcr(cropData, options);
          ocrResults.push(result);
        } catch (error) {
          logger.error("单个裁剪图片OCR处理失败", {
            requestId,
            rectangleId: cropData.rectangleId,
            error: error.message,
          });

          // 添加失败结果
          ocrResults.push({
            rectangleId: cropData.rectangleId,
            success: false,
            error: error.message,
            text: null,
          });
        }
      }

      // 构建响应消息
      const responseMessage = {
        requestId,
        imageId,
        success: true,
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
        results: ocrResults,
        totalRectangles: cropsData.length,
        successfulRectangles: ocrResults.filter((r) => r.success).length,
      };

      // 发送结果回Python服务器
      const sent = await this.rabbitmqManager.sendToQueue(
        "node.to.python.ocr.result",
        responseMessage
      );

      if (!sent) {
        throw new Error("发送OCR结果失败");
      }

      logger.info("Python OCR请求处理完成", {
        requestId,
        imageId,
        processingTime: Date.now() - startTime,
        totalRectangles: cropsData.length,
        successfulRectangles: ocrResults.filter((r) => r.success).length,
      });

      ack(); // 确认消息处理完成
    } catch (error) {
      logger.error("处理Python OCR请求失败", {
        requestId: message.requestId,
        error: error.message,
        stack: error.stack,
      });

      // 发送错误响应
      try {
        const errorResponse = {
          requestId: message.requestId,
          imageId: message.imageId,
          success: false,
          error: error.message,
          timestamp: Date.now(),
          processingTime: Date.now() - startTime,
        };

        await this.rabbitmqManager.sendToQueue("node.to.python.ocr.result", errorResponse);
      } catch (sendError) {
        logger.error("发送错误响应失败", { error: sendError.message });
      }

      // 检查是否需要重试
      const retryCount = message.retryCount || 0;
      const maxRetries = message.maxRetries || 3;

      if (retryCount < maxRetries) {
        logger.info("重新入队Python OCR请求", {
          requestId: message.requestId,
          retryCount: retryCount + 1,
          maxRetries,
        });

        // 增加重试计数并重新入队
        message.retryCount = retryCount + 1;
        await this.rabbitmqManager.sendToQueue("python.to.node.ocr", message);
        ack(); // 确认原消息
      } else {
        logger.error("Python OCR请求重试次数已达上限", {
          requestId: message.requestId,
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
   * 执行单个裁剪图片的OCR
   */
  async performSingleOcr(cropData, options) {
    try {
      const { rectangleId, rectangleClass, imageData, rectangleInfo } = cropData;

      logger.debug("开始处理单个裁剪图片OCR", {
        rectangleId,
        rectangleClass,
      });

      // 使用Google Cloud Vision API进行OCR
      let ocrResult;

      // 检查是否有API密钥配置，如果有则使用完整版OCR，否则使用简化版
      const apiKey = process.env.GOOGLE_VISION_API_KEY;

      if (apiKey && apiKey.trim() !== "") {
        // 使用完整版Google Cloud Vision API
        ocrResult = await performOcr(imageData, apiKey);
      } else {
        // 使用简化版OCR
        ocrResult = await performOcrSimple(imageData);
      }

      return {
        rectangleId,
        rectangleClass,
        success: true,
        text: ocrResult.originalFullText || "",
        detectedLanguage: ocrResult.detectedLanguageCode || "und",
        detectedLanguageName: ocrResult.detectedLanguageName || "Unknown",
        confidence: ocrResult.confidence || 0.95,
        rectangleInfo,
      };
    } catch (error) {
      logger.error("单个OCR处理失败", {
        rectangleId: cropData.rectangleId,
        error: error.message,
      });

      return {
        rectangleId: cropData.rectangleId,
        rectangleClass: cropData.rectangleClass,
        success: false,
        error: error.message,
        text: null,
      };
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
    };
  }
}

export default PythonOcrQueueProcessor;
