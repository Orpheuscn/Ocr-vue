// backend/services/taskSchedulerService.js
import { getLogger } from '../utils/logger.js';
import rabbitmqManager from '../utils/rabbitmqManager.js';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';

const logger = getLogger('taskSchedulerService');

/**
 * 任务调度服务
 * 处理定时任务和批处理任务
 */
class TaskSchedulerService {
  constructor() {
    this.isInitialized = false;
    this.scheduledTasks = new Map();
    this.batchJobs = new Map();
    this.isRunning = false;
  }

  /**
   * 初始化任务调度服务
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return true;
      }

      // 确保RabbitMQ连接
      if (!rabbitmqManager.isHealthy()) {
        const connected = await rabbitmqManager.connect();
        if (!connected) {
          throw new Error('无法连接到RabbitMQ');
        }
      }

      // 设置默认的定时任务
      await this._setupDefaultScheduledTasks();

      this.isInitialized = true;
      logger.info('任务调度服务初始化成功');
      return true;

    } catch (error) {
      logger.error('任务调度服务初始化失败', { error: error.message });
      return false;
    }
  }

  /**
   * 启动任务调度服务
   */
  async start() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.isRunning) {
        logger.warn('任务调度服务已在运行中');
        return true;
      }

      // 启动所有定时任务
      for (const [taskId, task] of this.scheduledTasks) {
        if (task.cronJob && !task.cronJob.running) {
          task.cronJob.start();
          logger.info(`定时任务已启动: ${taskId}`);
        }
      }

      this.isRunning = true;
      logger.info('任务调度服务已启动');
      return true;

    } catch (error) {
      logger.error('启动任务调度服务失败', { error: error.message });
      return false;
    }
  }

  /**
   * 停止任务调度服务
   */
  async stop() {
    try {
      // 停止所有定时任务
      for (const [taskId, task] of this.scheduledTasks) {
        if (task.cronJob && task.cronJob.running) {
          task.cronJob.stop();
          logger.info(`定时任务已停止: ${taskId}`);
        }
      }

      // 停止所有批处理任务
      for (const [jobId, job] of this.batchJobs) {
        if (job.status === 'running') {
          job.status = 'cancelled';
          logger.info(`批处理任务已取消: ${jobId}`);
        }
      }

      this.isRunning = false;
      logger.info('任务调度服务已停止');

    } catch (error) {
      logger.error('停止任务调度服务失败', { error: error.message });
    }
  }

  /**
   * 设置默认的定时任务
   */
  async _setupDefaultScheduledTasks() {
    try {
      // 每小时清理临时文件
      this.scheduleTask('cleanup-temp-files', '0 * * * *', async () => {
        await this._cleanupTempFiles();
      }, '清理临时文件');

      // 每天凌晨2点清理过期的OCR记录
      this.scheduleTask('cleanup-expired-records', '0 2 * * *', async () => {
        await this._cleanupExpiredRecords();
      }, '清理过期记录');

      // 每5分钟检查队列健康状态
      this.scheduleTask('health-check', '*/5 * * * *', async () => {
        await this._performHealthCheck();
      }, '健康检查');

      // 每天生成统计报告
      this.scheduleTask('daily-stats', '0 1 * * *', async () => {
        await this._generateDailyStats();
      }, '生成日统计报告');

      logger.info('默认定时任务设置完成');

    } catch (error) {
      logger.error('设置默认定时任务失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 调度定时任务
   */
  scheduleTask(taskId, cronExpression, taskFunction, description = '') {
    try {
      // 如果任务已存在，先停止它
      if (this.scheduledTasks.has(taskId)) {
        const existingTask = this.scheduledTasks.get(taskId);
        if (existingTask.cronJob) {
          existingTask.cronJob.stop();
        }
      }

      // 创建新的定时任务
      const cronJob = cron.schedule(cronExpression, async () => {
        try {
          logger.info(`执行定时任务: ${taskId} - ${description}`);
          await taskFunction();
          logger.info(`定时任务执行完成: ${taskId}`);
        } catch (error) {
          logger.error(`定时任务执行失败: ${taskId}`, { error: error.message });
        }
      }, {
        scheduled: false,
        timezone: 'Asia/Shanghai'
      });

      // 保存任务信息
      this.scheduledTasks.set(taskId, {
        id: taskId,
        cronExpression,
        description,
        cronJob,
        createdAt: new Date(),
        lastRun: null,
        nextRun: null
      });

      logger.info(`定时任务已调度: ${taskId} - ${cronExpression} - ${description}`);
      return true;

    } catch (error) {
      logger.error(`调度定时任务失败: ${taskId}`, { error: error.message });
      return false;
    }
  }

  /**
   * 创建批处理任务
   */
  async createBatchJob(jobType, data, options = {}) {
    try {
      const jobId = uuidv4();
      const batchJob = {
        id: jobId,
        type: jobType,
        data,
        options,
        status: 'pending',
        progress: 0,
        totalItems: 0,
        processedItems: 0,
        failedItems: 0,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        error: null
      };

      this.batchJobs.set(jobId, batchJob);

      // 发送批处理任务到队列
      const message = {
        messageId: `batch_job_${jobId}`,
        timestamp: new Date(),
        version: '1.0',
        jobId,
        type: jobType,
        data,
        options
      };

      const sent = await rabbitmqManager.sendToQueue('batch.process', message);

      if (sent) {
        logger.info(`批处理任务已创建: ${jobId} - ${jobType}`);
        return jobId;
      } else {
        throw new Error('发送批处理任务到队列失败');
      }

    } catch (error) {
      logger.error('创建批处理任务失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 更新批处理任务状态
   */
  updateBatchJobStatus(jobId, status, progress = null, error = null) {
    try {
      const job = this.batchJobs.get(jobId);
      if (!job) {
        throw new Error(`批处理任务不存在: ${jobId}`);
      }

      job.status = status;
      if (progress !== null) {
        job.progress = progress;
      }
      if (error) {
        job.error = error;
      }

      if (status === 'running' && !job.startedAt) {
        job.startedAt = new Date();
      }
      if (status === 'completed' || status === 'failed') {
        job.completedAt = new Date();
      }

      this.batchJobs.set(jobId, job);

      logger.info(`批处理任务状态已更新: ${jobId} - ${status}`);
      return true;

    } catch (error) {
      logger.error('更新批处理任务状态失败', { error: error.message });
      return false;
    }
  }

  /**
   * 清理临时文件
   */
  async _cleanupTempFiles() {
    try {
      logger.info('开始清理临时文件');
      
      // 发送清理任务到队列
      const message = {
        messageId: `cleanup_${Date.now()}`,
        timestamp: new Date(),
        version: '1.0',
        type: 'cleanup_temp_files',
        data: {
          maxAge: 24 * 60 * 60 * 1000, // 24小时
          directories: ['temp', 'uploads/temp']
        }
      };

      await rabbitmqManager.sendToQueue('system.maintenance', message);
      logger.info('临时文件清理任务已发送到队列');

    } catch (error) {
      logger.error('清理临时文件失败', { error: error.message });
    }
  }

  /**
   * 清理过期记录
   */
  async _cleanupExpiredRecords() {
    try {
      logger.info('开始清理过期记录');
      
      // 发送清理任务到队列
      const message = {
        messageId: `cleanup_records_${Date.now()}`,
        timestamp: new Date(),
        version: '1.0',
        type: 'cleanup_expired_records',
        data: {
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
          collections: ['ocrrecords', 'notifications']
        }
      };

      await rabbitmqManager.sendToQueue('system.maintenance', message);
      logger.info('过期记录清理任务已发送到队列');

    } catch (error) {
      logger.error('清理过期记录失败', { error: error.message });
    }
  }

  /**
   * 执行健康检查
   */
  async _performHealthCheck() {
    try {
      const healthStatus = {
        timestamp: new Date(),
        rabbitmq: rabbitmqManager.getStatus(),
        scheduler: this.getStatus()
      };

      // 发送健康检查结果到队列
      const message = {
        messageId: `health_check_${Date.now()}`,
        timestamp: new Date(),
        version: '1.0',
        type: 'health_check',
        data: healthStatus
      };

      await rabbitmqManager.sendToQueue('system.metrics', message);

    } catch (error) {
      logger.error('健康检查失败', { error: error.message });
    }
  }

  /**
   * 生成日统计报告
   */
  async _generateDailyStats() {
    try {
      logger.info('开始生成日统计报告');
      
      // 发送统计任务到队列
      const message = {
        messageId: `daily_stats_${Date.now()}`,
        timestamp: new Date(),
        version: '1.0',
        type: 'generate_daily_stats',
        data: {
          date: new Date().toISOString().split('T')[0]
        }
      };

      await rabbitmqManager.sendToQueue('system.analytics', message);
      logger.info('日统计报告生成任务已发送到队列');

    } catch (error) {
      logger.error('生成日统计报告失败', { error: error.message });
    }
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    const scheduledTasksInfo = Array.from(this.scheduledTasks.values()).map(task => ({
      id: task.id,
      description: task.description,
      cronExpression: task.cronExpression,
      isRunning: task.cronJob ? task.cronJob.running : false,
      lastRun: task.lastRun,
      nextRun: task.nextRun
    }));

    const batchJobsInfo = Array.from(this.batchJobs.values()).map(job => ({
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt
    }));

    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      scheduledTasks: scheduledTasksInfo,
      batchJobs: batchJobsInfo,
      rabbitmqConnected: rabbitmqManager.isHealthy()
    };
  }
}

// 创建单例实例
const taskSchedulerService = new TaskSchedulerService();

export default taskSchedulerService;
