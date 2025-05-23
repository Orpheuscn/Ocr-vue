/**
 * 队列监控脚本
 * 用于监控RabbitMQ队列状态和性能指标
 */

import { QueueManager } from "../queues/QueueManager";
import { getLogger } from "../utils/logger";

const logger = getLogger("QueueMonitor");

interface QueueMetrics {
  timestamp: Date;
  queueName: string;
  messageCount: number;
  consumerCount: number;
  messageRate: number;
  processingTime: number;
}

class QueueMonitor {
  private queueManager: QueueManager;
  private metrics: Map<string, QueueMetrics[]> = new Map();
  private isRunning = false;
  private monitorInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.queueManager = new QueueManager({
      autoStart: false,
      enableOcrQueue: true,
      enableNotifications: true,
      enableWebSocket: true,
      enableEmail: false,
    });
  }

  /**
   * 启动监控
   */
  async start(): Promise<void> {
    try {
      logger.info("启动队列监控器...");

      // 初始化队列管理器
      await this.queueManager.initialize();

      this.isRunning = true;

      // 设置监控间隔
      this.monitorInterval = setInterval(() => {
        this.collectMetrics().catch((error) => {
          logger.error("收集指标失败", {
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }, 10000); // 每10秒收集一次指标

      // 设置报告间隔
      setInterval(() => {
        this.generateReport();
      }, 60000); // 每分钟生成一次报告

      logger.info("队列监控器已启动");

      // 立即收集一次指标
      await this.collectMetrics();
    } catch (error) {
      logger.error("启动队列监控器失败", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 停止监控
   */
  async stop(): Promise<void> {
    logger.info("停止队列监控器...");

    this.isRunning = false;

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    await this.queueManager.close();
    logger.info("队列监控器已停止");
  }

  /**
   * 收集队列指标
   */
  private async collectMetrics(): Promise<void> {
    try {
      const stats = await this.queueManager.getQueueStats();
      const timestamp = new Date();

      for (const [queueType, queueInfo] of Object.entries(stats)) {
        if (queueInfo && typeof queueInfo === "object") {
          const metrics: QueueMetrics = {
            timestamp,
            queueName: (queueInfo as any).queueName || queueType,
            messageCount: (queueInfo as any).messageCount || 0,
            consumerCount: (queueInfo as any).consumerCount || 0,
            messageRate: this.calculateMessageRate(queueType, (queueInfo as any).messageCount || 0),
            processingTime: 0, // 这里可以添加处理时间统计
          };

          // 存储指标
          if (!this.metrics.has(queueType)) {
            this.metrics.set(queueType, []);
          }

          const queueMetrics = this.metrics.get(queueType)!;
          queueMetrics.push(metrics);

          // 只保留最近100个数据点
          if (queueMetrics.length > 100) {
            queueMetrics.shift();
          }

          logger.debug("收集队列指标", {
            queue: queueType,
            messageCount: metrics.messageCount,
            consumerCount: metrics.consumerCount,
            messageRate: metrics.messageRate,
          });
        }
      }
    } catch (error) {
      logger.error("收集队列指标失败", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 计算消息处理速率
   */
  private calculateMessageRate(queueType: string, currentMessageCount: number): number {
    const queueMetrics = this.metrics.get(queueType);
    if (!queueMetrics || queueMetrics.length < 2) {
      return 0;
    }

    const lastMetric = queueMetrics[queueMetrics.length - 1];
    const previousMetric = queueMetrics[queueMetrics.length - 2];

    const timeDiff = (lastMetric.timestamp.getTime() - previousMetric.timestamp.getTime()) / 1000; // 秒
    const messageDiff = previousMetric.messageCount - currentMessageCount; // 处理的消息数

    return timeDiff > 0 ? messageDiff / timeDiff : 0;
  }

  /**
   * 生成监控报告
   */
  private generateReport(): void {
    logger.info("=== 队列监控报告 ===");

    const status = this.queueManager.getStatus();
    logger.info("系统状态", {
      initialized: status.isInitialized,
      started: status.isStarted,
      rabbitmqConnected: status.rabbitMQConnected,
    });

    for (const [queueType, queueMetrics] of this.metrics) {
      if (queueMetrics.length === 0) continue;

      const latest = queueMetrics[queueMetrics.length - 1];
      const avgMessageRate = this.calculateAverageMessageRate(queueMetrics);
      const maxMessageCount = Math.max(...queueMetrics.map((m) => m.messageCount));

      logger.info(`队列: ${queueType}`, {
        当前消息数: latest.messageCount,
        消费者数量: latest.consumerCount,
        平均处理速率: `${avgMessageRate.toFixed(2)} msg/s`,
        最大消息积压: maxMessageCount,
        状态: this.getQueueHealthStatus(latest),
      });

      // 检查告警条件
      this.checkAlerts(queueType, latest);
    }

    logger.info("==================");
  }

  /**
   * 计算平均消息处理速率
   */
  private calculateAverageMessageRate(metrics: QueueMetrics[]): number {
    if (metrics.length === 0) return 0;

    const rates = metrics.map((m) => m.messageRate).filter((rate) => rate > 0);
    return rates.length > 0 ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0;
  }

  /**
   * 获取队列健康状态
   */
  private getQueueHealthStatus(metrics: QueueMetrics): string {
    if (metrics.consumerCount === 0) {
      return "❌ 无消费者";
    }

    if (metrics.messageCount > 1000) {
      return "⚠️ 消息积压";
    }

    if (metrics.messageCount > 100) {
      return "🟡 消息较多";
    }

    return "✅ 正常";
  }

  /**
   * 检查告警条件
   */
  private checkAlerts(queueType: string, metrics: QueueMetrics): void {
    // 消息积压告警
    if (metrics.messageCount > 1000) {
      logger.warn("队列消息积压告警", {
        queue: queueType,
        messageCount: metrics.messageCount,
        threshold: 1000,
      });
    }

    // 无消费者告警
    if (metrics.consumerCount === 0 && metrics.messageCount > 0) {
      logger.warn("队列无消费者告警", {
        queue: queueType,
        messageCount: metrics.messageCount,
      });
    }

    // 处理速率过低告警
    if (metrics.messageRate < 0.1 && metrics.messageCount > 10) {
      logger.warn("队列处理速率过低告警", {
        queue: queueType,
        messageRate: metrics.messageRate,
        messageCount: metrics.messageCount,
      });
    }
  }

  /**
   * 获取队列统计摘要
   */
  getStatsSummary(): any {
    const summary: any = {};

    for (const [queueType, queueMetrics] of this.metrics) {
      if (queueMetrics.length === 0) continue;

      const latest = queueMetrics[queueMetrics.length - 1];
      summary[queueType] = {
        messageCount: latest.messageCount,
        consumerCount: latest.consumerCount,
        averageMessageRate: this.calculateAverageMessageRate(queueMetrics),
        healthStatus: this.getQueueHealthStatus(latest),
        lastUpdate: latest.timestamp,
      };
    }

    return summary;
  }
}

// 主函数
async function main(): Promise<void> {
  const monitor = new QueueMonitor();

  // 优雅关闭处理
  const gracefulShutdown = async (signal: string) => {
    logger.info(`收到 ${signal} 信号，正在关闭监控器...`);
    await monitor.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

  try {
    await monitor.start();

    // 保持进程运行
    logger.info("队列监控器正在运行，按 Ctrl+C 停止");

    // 每5分钟输出一次统计摘要
    setInterval(() => {
      const summary = monitor.getStatsSummary();
      logger.info("队列统计摘要", summary);
    }, 300000);
  } catch (error) {
    logger.error("监控器运行失败", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch((error) => {
    console.error("监控器启动失败:", error);
    process.exit(1);
  });
}

export { QueueMonitor };
