/**
 * OCR队列服务
 * 处理OCR任务的队列操作
 */

import { BaseQueueService, QueueServiceConfig } from "./BaseQueueService";
import { RabbitMQManager } from "../managers/RabbitMQManager";
import {
  OcrTaskMessage,
  TaskStatusMessage,
  TaskStatus,
  MessageContext,
  MessageProcessingResult,
  createOcrTaskMessage,
  createTaskStatusMessage,
  isOcrTaskMessage,
  validateOcrTaskMessage,
} from "../types/messages";
import {
  EXCHANGES,
  QUEUES,
  ROUTING_KEYS,
  RETRY_STRATEGIES,
  QUEUE_PRIORITIES,
} from "../config/queues";
import { getLogger } from "../../utils/logger";

const logger = getLogger("OcrQueueService");

export interface OcrTaskRequest {
  taskId: string;
  userId: string;
  imageId: string;
  imageData: string;
  originalFilename?: string;
  options: {
    imageFormat?: string;
    dpi?: number;
  };
  priority?: number;
}

export class OcrQueueService extends BaseQueueService {
  private taskStatusService: TaskStatusService;

  constructor(rabbitMQ: RabbitMQManager) {
    const config: QueueServiceConfig = {
      queueName: QUEUES.OCR_PROCESS.name,
      exchangeName: EXCHANGES.OCR_DIRECT.name,
      routingKey: ROUTING_KEYS.OCR_PROCESS,
      retryStrategy: RETRY_STRATEGIES.OCR_PROCESSING,
      deadLetterExchange: EXCHANGES.DEAD_LETTER.name,
      deadLetterRoutingKey: ROUTING_KEYS.OCR_FAILED,
    };

    super(rabbitMQ, config);
    this.taskStatusService = new TaskStatusService(rabbitMQ);
  }

  /**
   * 提交OCR任务
   */
  async submitOcrTask(request: OcrTaskRequest): Promise<{ taskId: string; success: boolean }> {
    try {
      // 验证请求参数
      this.validateOcrRequest(request);

      // 创建OCR任务消息
      const message = createOcrTaskMessage({
        taskId: request.taskId,
        userId: request.userId,
        imageId: request.imageId,
        imageData: request.imageData,
        options: request.options,
        priority: request.priority || QUEUE_PRIORITIES.NORMAL,
      });

      // 添加原始文件名
      if (request.originalFilename) {
        (message as any).originalFilename = request.originalFilename;
      }

      // 根据优先级选择队列
      const routingKey = this.getRoutingKeyByPriority(request.priority);

      // 发布消息
      const success = await this.publishMessage(message, {
        priority: request.priority || QUEUE_PRIORITIES.NORMAL,
      });

      if (success) {
        // 更新任务状态为pending
        await this.taskStatusService.updateTaskStatus({
          taskId: request.taskId,
          userId: request.userId,
          status: TaskStatus.PENDING,
          progress: 0,
        });

        logger.info("OCR任务提交成功", {
          taskId: request.taskId,
          userId: request.userId,
          priority: request.priority,
        });
      }

      return { taskId: request.taskId, success };
    } catch (error) {
      logger.error("OCR任务提交失败", {
        taskId: request.taskId,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      });
      throw error;
    }
  }

  /**
   * 批量提交OCR任务
   */
  async submitBatchOcrTasks(requests: OcrTaskRequest[]): Promise<{
    successful: string[];
    failed: Array<{ taskId: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ taskId: string; error: string }> = [];

    for (const request of requests) {
      try {
        const result = await this.submitOcrTask(request);
        if (result.success) {
          successful.push(request.taskId);
        } else {
          failed.push({ taskId: request.taskId, error: "提交失败" });
        }
      } catch (error) {
        failed.push({
          taskId: request.taskId,
          error:
            error instanceof Error
              ? error instanceof Error
                ? error.message
                : String(error)
              : String(error),
        });
      }
    }

    logger.info("批量OCR任务提交完成", {
      total: requests.length,
      successful: successful.length,
      failed: failed.length,
    });

    return { successful, failed };
  }

  /**
   * 取消OCR任务
   */
  async cancelOcrTask(taskId: string, userId: string): Promise<boolean> {
    try {
      // 更新任务状态为已取消
      await this.taskStatusService.updateTaskStatus({
        taskId,
        userId,
        status: TaskStatus.CANCELLED,
        progress: 0,
      });

      logger.info("OCR任务已取消", { taskId, userId });
      return true;
    } catch (error) {
      logger.error("取消OCR任务失败", {
        taskId,
        userId,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      });
      return false;
    }
  }

  /**
   * 处理OCR消息
   */
  protected async processMessage(context: MessageContext): Promise<MessageProcessingResult> {
    const { message } = context;

    try {
      // 验证消息格式
      if (!isOcrTaskMessage(message)) {
        const errors = validateOcrTaskMessage(message);
        throw new Error(`无效的OCR任务消息: ${errors.join(", ")}`);
      }

      const ocrMessage = message as OcrTaskMessage;

      logger.info("开始处理OCR任务", {
        taskId: ocrMessage.taskId,
        userId: ocrMessage.userId,
        retryCount: ocrMessage.retryCount || 0,
      });

      // 更新任务状态为处理中
      await this.taskStatusService.updateTaskStatus({
        taskId: ocrMessage.taskId,
        userId: ocrMessage.userId,
        status: TaskStatus.PROCESSING,
        progress: 10,
      });

      // 调用Python服务进行OCR处理
      const result = await this.callPythonOcrService(ocrMessage);

      // 更新任务状态为完成
      await this.taskStatusService.updateTaskStatus({
        taskId: ocrMessage.taskId,
        userId: ocrMessage.userId,
        status: TaskStatus.COMPLETED,
        progress: 100,
        result,
      });

      logger.info("OCR任务处理完成", {
        taskId: ocrMessage.taskId,
        textLength: result.text?.length || 0,
        confidence: result.confidence,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error("OCR任务处理失败", {
        taskId: message.taskId,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      });

      // 更新任务状态为失败
      if (message.taskId && message.userId) {
        await this.taskStatusService.updateTaskStatus({
          taskId: message.taskId,
          userId: message.userId,
          status: TaskStatus.FAILED,
          progress: 0,
          error: {
            code: "OCR_PROCESSING_ERROR",
            message:
              error instanceof Error
                ? error instanceof Error
                  ? error.message
                  : String(error)
                : String(error),
          },
        });
      }

      return {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
        retryable: this.isRetryableError(error as Error),
      };
    }
  }

  /**
   * 调用Python OCR服务
   */
  private async callPythonOcrService(message: OcrTaskMessage): Promise<any> {
    // 这里应该调用您现有的OCR服务
    // 可以通过HTTP请求或者直接调用服务模块

    // 示例实现（您需要根据实际情况调整）
    const ocrService = await import("../../services/ocrService");

    const ocrRequest = {
      taskId: message.taskId,
      userId: message.userId,
      imageData: message.imageData,
      options: {
        outputFormat: "text" as const,
      },
    };

    return await ocrService.processOcrRequest(ocrRequest);
  }

  /**
   * 验证OCR请求
   */
  private validateOcrRequest(request: OcrTaskRequest): void {
    if (!request.taskId) {
      throw new Error("taskId is required");
    }
    if (!request.userId) {
      throw new Error("userId is required");
    }
    if (!request.imageData) {
      throw new Error("imageData is required");
    }
    if (!request.options) {
      throw new Error("options is required");
    }
  }

  /**
   * 根据优先级获取路由键
   */
  private getRoutingKeyByPriority(priority?: number): string {
    if (priority && priority >= QUEUE_PRIORITIES.HIGH) {
      return ROUTING_KEYS.OCR_PROCESS_HIGH;
    }
    return ROUTING_KEYS.OCR_PROCESS;
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error: Error): boolean {
    // 定义可重试的错误类型
    const retryableErrors = [
      "NETWORK_ERROR",
      "TIMEOUT_ERROR",
      "TEMPORARY_SERVICE_UNAVAILABLE",
      "RATE_LIMIT_EXCEEDED",
    ];

    return retryableErrors.some(
      (errorType) =>
        (error instanceof Error ? error.message : String(error)).includes(errorType) ||
        (error instanceof Error && error.name === errorType)
    );
  }

  /**
   * 获取队列统计信息
   */
  async getQueueStats(): Promise<{
    queueName: string;
    messageCount: number;
    consumerCount: number;
    isConsuming: boolean;
  }> {
    try {
      const queueInfo = await this.getQueueInfo();
      const status = this.getStatus();

      return {
        queueName: this.config.queueName,
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount,
        isConsuming: status.isConsuming,
      };
    } catch (error) {
      logger.error("获取队列统计信息失败", {
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      });
      throw error;
    }
  }
}

/**
 * 任务状态服务
 * 专门处理任务状态更新
 */
export class TaskStatusService extends BaseQueueService {
  constructor(rabbitMQ: RabbitMQManager) {
    const config: QueueServiceConfig = {
      queueName: QUEUES.TASK_STATUS.name,
      exchangeName: EXCHANGES.OCR_DIRECT.name,
      routingKey: ROUTING_KEYS.TASK_STATUS_UPDATE,
      retryStrategy: RETRY_STRATEGIES.NOTIFICATION,
      deadLetterExchange: EXCHANGES.DEAD_LETTER.name,
      deadLetterRoutingKey: ROUTING_KEYS.DEAD_LETTER,
    };

    super(rabbitMQ, config);
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(params: {
    taskId: string;
    userId: string;
    status: TaskStatus;
    progress: number;
    result?: any;
    error?: { code: string; message: string; details?: any };
  }): Promise<boolean> {
    try {
      const message = createTaskStatusMessage(params);

      const success = await this.publishMessage(message);

      if (success) {
        logger.debug("任务状态更新消息发送成功", {
          taskId: params.taskId,
          status: params.status,
          progress: params.progress,
        });
      }

      return success;
    } catch (error) {
      logger.error("任务状态更新失败", {
        taskId: params.taskId,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      });
      throw error;
    }
  }

  /**
   * 处理任务状态消息
   */
  protected async processMessage(context: MessageContext): Promise<MessageProcessingResult> {
    const { message } = context;

    try {
      // 这里可以将状态更新保存到数据库
      // 或者发送WebSocket通知给前端

      logger.info("处理任务状态更新", {
        taskId: message.taskId,
        status: message.status,
        progress: message.progress,
      });

      // 示例：保存到数据库
      // await this.saveTaskStatusToDatabase(message);

      // 示例：发送WebSocket通知
      // await this.sendWebSocketNotification(message);

      return { success: true };
    } catch (error) {
      logger.error("处理任务状态更新失败", {
        taskId: message.taskId,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
        retryable: true,
      };
    }
  }
}
