/**
 * RabbitMQ消息类型定义
 * 定义了系统中所有消息的TypeScript接口
 */

// 基础消息接口
export interface BaseMessage {
  messageId: string;
  timestamp: Date;
  version: string;
  correlationId?: string;
}

// OCR任务选项
export interface OcrOptions {
  languageHints: string[];
  recognitionMode: "text" | "table";
  imageFormat?: string;
  dpi?: number;
}

// OCR结果数据
export interface OcrResult {
  text: string;
  language: string;
  confidence: number;
  symbolsData?: any[];
  fullTextAnnotation?: any;
  textAnnotations?: any[];
  processingTime?: number;
}

// OCR任务消息
export interface OcrTaskMessage extends BaseMessage {
  taskId: string;
  userId: string;
  imageId: string;
  imageData: string; // base64编码的图像数据
  originalFilename?: string;
  options: OcrOptions;
  priority: number;
  retryCount?: number;
  maxRetries?: number;
  createdAt: Date;
}

// 任务状态枚举
export enum TaskStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

// 任务状态消息
export interface TaskStatusMessage extends BaseMessage {
  taskId: string;
  userId: string;
  status: TaskStatus;
  progress: number; // 0-100
  result?: OcrResult;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  processingStartTime?: Date;
  processingEndTime?: Date;
}

// 通知类型枚举
export enum NotificationType {
  OCR_COMPLETED = "ocr_completed",
  OCR_FAILED = "ocr_failed",
  OCR_PROGRESS = "ocr_progress",
  SYSTEM_MAINTENANCE = "system_maintenance",
  QUOTA_WARNING = "quota_warning",
}

// 用户通知消息
export interface UserNotificationMessage extends BaseMessage {
  userId: string;
  taskId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  priority: "low" | "normal" | "high" | "urgent";
  channels: ("websocket" | "email" | "sms")[];
  expiresAt?: Date;
}

// 图像处理消息（用于文档检测等）
export interface ImageProcessingMessage extends BaseMessage {
  taskId: string;
  userId: string;
  imageId: string;
  imageData: string;
  processingType: "detection" | "cropping" | "enhancement";
  options: {
    detectRectangles?: boolean;
    cropRegions?: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    enhancementLevel?: "low" | "medium" | "high";
  };
}

// 批量处理消息
export interface BatchProcessingMessage extends BaseMessage {
  batchId: string;
  userId: string;
  tasks: OcrTaskMessage[];
  batchOptions: {
    parallelLimit: number;
    failureThreshold: number; // 失败任务数量阈值
    notifyOnCompletion: boolean;
  };
}

// 系统监控消息
export interface SystemMonitoringMessage extends BaseMessage {
  metric: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  threshold?: {
    warning: number;
    critical: number;
  };
}

// 错误报告消息
export interface ErrorReportMessage extends BaseMessage {
  errorId: string;
  service: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  context: {
    userId?: string;
    taskId?: string;
    requestId?: string;
    userAgent?: string;
    ip?: string;
  };
  severity: "low" | "medium" | "high" | "critical";
}

// 消息处理结果
export interface MessageProcessingResult {
  success: boolean;
  error?: string;
  retryable?: boolean;
  data?: any;
}

// 队列统计信息
export interface QueueStats {
  queueName: string;
  messageCount: number;
  consumerCount: number;
  messageRate: number;
  deliveryRate: number;
  ackRate: number;
  rejectRate: number;
}

// 消息确认选项
export interface MessageAckOptions {
  multiple?: boolean;
  requeue?: boolean;
}

// 消息发布选项
export interface PublishOptions {
  persistent?: boolean;
  priority?: number;
  expiration?: string;
  mandatory?: boolean;
  immediate?: boolean;
  headers?: Record<string, any>;
}

// 消费者选项
export interface ConsumerOptions {
  noAck?: boolean;
  exclusive?: boolean;
  priority?: number;
  arguments?: Record<string, any>;
}

// 重试策略配置
export interface RetryStrategy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

// 死信队列配置
export interface DeadLetterConfig {
  exchange: string;
  routingKey: string;
  ttl?: number;
  maxLength?: number;
}

// 队列健康检查结果
export interface QueueHealthCheck {
  queueName: string;
  isHealthy: boolean;
  messageCount: number;
  consumerCount: number;
  lastMessageTime?: Date;
  errors: string[];
}

// 消息路由信息
export interface MessageRouting {
  exchange: string;
  routingKey: string;
  queue: string;
}

// 消息元数据
export interface MessageMetadata {
  deliveryTag: number;
  redelivered: boolean;
  exchange: string;
  routingKey: string;
  messageCount?: number;
  properties: {
    contentType?: string;
    contentEncoding?: string;
    headers?: Record<string, any>;
    deliveryMode?: number;
    priority?: number;
    correlationId?: string;
    replyTo?: string;
    expiration?: string;
    messageId?: string;
    timestamp?: number;
    type?: string;
    userId?: string;
    appId?: string;
    clusterId?: string;
  };
}

// 消息处理上下文
export interface MessageContext {
  message: any;
  metadata: MessageMetadata;
  ack: (options?: MessageAckOptions) => void;
  nack: (options?: MessageAckOptions) => void;
  reject: (requeue?: boolean) => void;
}

// 类型守卫函数
export function isOcrTaskMessage(message: any): message is OcrTaskMessage {
  return (
    message &&
    typeof message.taskId === "string" &&
    typeof message.userId === "string" &&
    typeof message.imageData === "string" &&
    message.options &&
    Array.isArray(message.options.languageHints)
  );
}

export function isTaskStatusMessage(message: any): message is TaskStatusMessage {
  return (
    message &&
    typeof message.taskId === "string" &&
    typeof message.status === "string" &&
    typeof message.progress === "number"
  );
}

export function isUserNotificationMessage(message: any): message is UserNotificationMessage {
  return (
    message &&
    typeof message.userId === "string" &&
    typeof message.type === "string" &&
    typeof message.title === "string" &&
    typeof message.message === "string"
  );
}

// 消息验证函数
export function validateOcrTaskMessage(message: any): string[] {
  const errors: string[] = [];

  if (!message.taskId) errors.push("taskId is required");
  if (!message.userId) errors.push("userId is required");
  if (!message.imageData) errors.push("imageData is required");
  if (!message.options) errors.push("options is required");
  if (message.options && !Array.isArray(message.options.languageHints)) {
    errors.push("options.languageHints must be an array");
  }
  if (typeof message.priority !== "number") errors.push("priority must be a number");

  return errors;
}

// 消息工厂函数
export function createOcrTaskMessage(params: {
  taskId: string;
  userId: string;
  imageId: string;
  imageData: string;
  options: OcrOptions;
  priority?: number;
}): OcrTaskMessage {
  return {
    messageId: `ocr_${params.taskId}_${Date.now()}`,
    timestamp: new Date(),
    version: "1.0",
    taskId: params.taskId,
    userId: params.userId,
    imageId: params.imageId,
    imageData: params.imageData,
    options: params.options,
    priority: params.priority || 1,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
  };
}

export function createTaskStatusMessage(params: {
  taskId: string;
  userId: string;
  status: TaskStatus;
  progress: number;
  result?: OcrResult;
  error?: { code: string; message: string; details?: any };
}): TaskStatusMessage {
  return {
    messageId: `status_${params.taskId}_${Date.now()}`,
    timestamp: new Date(),
    version: "1.0",
    taskId: params.taskId,
    userId: params.userId,
    status: params.status,
    progress: params.progress,
    result: params.result,
    error: params.error,
  };
}

export function createUserNotificationMessage(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  data?: any;
  priority?: "low" | "normal" | "high" | "urgent";
  channels?: ("websocket" | "email" | "sms")[];
}): UserNotificationMessage {
  return {
    messageId: `notification_${params.userId}_${Date.now()}`,
    timestamp: new Date(),
    version: "1.0",
    userId: params.userId,
    taskId: params.taskId,
    type: params.type,
    title: params.title,
    message: params.message,
    data: params.data,
    priority: params.priority || "normal",
    channels: params.channels || ["websocket"],
  };
}
