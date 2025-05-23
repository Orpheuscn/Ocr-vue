/**
 * OCR服务 - TypeScript版本
 * 提供OCR处理功能的接口
 */

import { getLogger } from '../utils/logger';

const logger = getLogger('OcrService');

export interface OcrRequest {
  taskId: string;
  userId: string;
  imageData: string; // base64编码的图片数据
  language?: string;
  options?: {
    detectOrientation?: boolean;
    preprocessImage?: boolean;
    outputFormat?: 'text' | 'json' | 'hocr';
  };
}

export interface OcrResult {
  taskId: string;
  success: boolean;
  text?: string;
  confidence?: number;
  language?: string;
  processingTime?: number;
  error?: string;
  metadata?: {
    imageSize?: { width: number; height: number };
    orientation?: number;
    blocks?: any[];
  };
}

export interface BatchOcrRequest {
  batchId: string;
  userId: string;
  tasks: OcrRequest[];
  options?: {
    parallel?: boolean;
    maxConcurrency?: number;
  };
}

export interface BatchOcrResult {
  batchId: string;
  success: boolean;
  results: OcrResult[];
  totalTasks: number;
  successCount: number;
  failureCount: number;
  processingTime: number;
}

/**
 * 处理单个OCR请求
 */
export async function processOcrRequest(request: OcrRequest): Promise<OcrResult> {
  const startTime = Date.now();
  
  try {
    logger.info(`开始处理OCR任务: ${request.taskId}`);
    
    // 这里应该调用实际的OCR服务
    // 目前返回模拟结果
    const result: OcrResult = {
      taskId: request.taskId,
      success: true,
      text: `模拟OCR结果 - 任务ID: ${request.taskId}`,
      confidence: 0.95,
      language: request.language || 'zh-CN',
      processingTime: Date.now() - startTime,
      metadata: {
        imageSize: { width: 800, height: 600 },
        orientation: 0
      }
    };
    
    logger.info(`OCR任务完成: ${request.taskId}`, {
      processingTime: result.processingTime,
      confidence: result.confidence
    });
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`OCR任务失败: ${request.taskId}`, { error: errorMessage });
    
    return {
      taskId: request.taskId,
      success: false,
      error: errorMessage,
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * 处理批量OCR请求
 */
export async function processBatchOcrRequest(request: BatchOcrRequest): Promise<BatchOcrResult> {
  const startTime = Date.now();
  
  try {
    logger.info(`开始处理批量OCR任务: ${request.batchId}`, {
      taskCount: request.tasks.length
    });
    
    const results: OcrResult[] = [];
    const maxConcurrency = request.options?.maxConcurrency || 3;
    
    if (request.options?.parallel) {
      // 并行处理
      const chunks = chunkArray(request.tasks, maxConcurrency);
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(task => processOcrRequest(task))
        );
        results.push(...chunkResults);
      }
    } else {
      // 串行处理
      for (const task of request.tasks) {
        const result = await processOcrRequest(task);
        results.push(result);
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    const batchResult: BatchOcrResult = {
      batchId: request.batchId,
      success: failureCount === 0,
      results,
      totalTasks: request.tasks.length,
      successCount,
      failureCount,
      processingTime: Date.now() - startTime
    };
    
    logger.info(`批量OCR任务完成: ${request.batchId}`, {
      totalTasks: batchResult.totalTasks,
      successCount: batchResult.successCount,
      failureCount: batchResult.failureCount,
      processingTime: batchResult.processingTime
    });
    
    return batchResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`批量OCR任务失败: ${request.batchId}`, { error: errorMessage });
    
    return {
      batchId: request.batchId,
      success: false,
      results: [],
      totalTasks: request.tasks.length,
      successCount: 0,
      failureCount: request.tasks.length,
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * 将数组分块
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * 验证OCR请求
 */
export function validateOcrRequest(request: Partial<OcrRequest>): string[] {
  const errors: string[] = [];
  
  if (!request.taskId) {
    errors.push('taskId is required');
  }
  
  if (!request.userId) {
    errors.push('userId is required');
  }
  
  if (!request.imageData) {
    errors.push('imageData is required');
  }
  
  return errors;
}

/**
 * 验证批量OCR请求
 */
export function validateBatchOcrRequest(request: Partial<BatchOcrRequest>): string[] {
  const errors: string[] = [];
  
  if (!request.batchId) {
    errors.push('batchId is required');
  }
  
  if (!request.userId) {
    errors.push('userId is required');
  }
  
  if (!request.tasks || !Array.isArray(request.tasks) || request.tasks.length === 0) {
    errors.push('tasks array is required and must not be empty');
  } else {
    request.tasks.forEach((task, index) => {
      const taskErrors = validateOcrRequest(task);
      if (taskErrors.length > 0) {
        errors.push(`Task ${index}: ${taskErrors.join(', ')}`);
      }
    });
  }
  
  return errors;
}
