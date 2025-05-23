/**
 * 应用启动文件 - 集成RabbitMQ
 * 展示如何在Express应用中集成队列系统
 */

import express from "express";
import cors from "cors";
import { initializeQueueManager, shutdownQueueManager } from "./controllers/ocrController";
import { getLogger } from "./utils/logger";

const logger = getLogger("App");

// 创建Express应用
const app = express();

// 中间件配置
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 示例认证中间件
app.use((req, res, next) => {
  // 这里应该实现实际的认证逻辑
  // 示例：从请求头获取用户信息
  const userId = req.headers["x-user-id"] as string;
  const isAdmin = req.headers["x-is-admin"] === "true";

  if (userId) {
    req.user = { id: userId, isAdmin };
  }

  next();
});

// OCR路由
import {
  processOcrAsync,
  processBatchOcr,
  processOcrSync,
  getOcrTaskStatus,
  cancelOcrTask,
  getQueueStatus,
} from "./controllers/ocrController";

// Node.js OCR队列路由
import {
  submitNodeOcrTask,
  getNodeOcrTaskStatus,
  cancelNodeOcrTask,
  getNodeOcrQueueStatus,
} from "../controllers/nodeOcrQueueController.js";

// OCR API路由
app.post("/api/ocr/async", processOcrAsync);
app.post("/api/ocr/batch", processBatchOcr);
app.post("/api/ocr/sync", processOcrSync);
app.get("/api/ocr/status/:taskId", getOcrTaskStatus);
app.delete("/api/ocr/task/:taskId", cancelOcrTask);

// Node.js OCR队列路由
app.post("/api/node-ocr/submit", submitNodeOcrTask);
app.get("/api/node-ocr/status/:taskId", getNodeOcrTaskStatus);
app.delete("/api/node-ocr/task/:taskId", cancelNodeOcrTask);

// 管理员路由
app.get("/api/admin/queue/status", getQueueStatus);
app.get("/api/admin/node-ocr/queue/status", getNodeOcrQueueStatus);

// 健康检查路由
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 错误处理中间件
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error("未处理的错误", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: "服务器内部错误",
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "接口不存在",
  });
});

/**
 * 启动应用
 */
async function startApp(): Promise<void> {
  try {
    // 初始化队列管理器
    logger.info("正在初始化队列系统...");
    await initializeQueueManager();

    // 启动HTTP服务器
    const port = process.env.PORT || 3000;
    const server = app.listen(port, () => {
      logger.info(`服务器已启动，端口: ${port}`);
      logger.info("队列系统已就绪，支持异步OCR处理");
    });

    // 优雅关闭处理
    const gracefulShutdown = async (signal: string) => {
      logger.info(`收到 ${signal} 信号，开始优雅关闭...`);

      // 停止接受新连接
      server.close(async () => {
        logger.info("HTTP服务器已关闭");

        try {
          // 关闭队列管理器
          await shutdownQueueManager();
          logger.info("应用已优雅关闭");
          process.exit(0);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error("关闭过程中发生错误", { error: errorMessage });
          process.exit(1);
        }
      });

      // 强制关闭超时
      setTimeout(() => {
        logger.error("强制关闭应用（超时）");
        process.exit(1);
      }, 30000); // 30秒超时
    };

    // 监听关闭信号
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // 监听未捕获的异常
    process.on("uncaughtException", (error) => {
      logger.error("未捕获的异常", {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("未处理的Promise拒绝", {
        reason: reason,
        promise: promise,
      });
      process.exit(1);
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("应用启动失败", { error: errorMessage });
    process.exit(1);
  }
}

// 扩展Express Request类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        isAdmin?: boolean;
      };
    }
  }
}

// 如果直接运行此文件，则启动应用
if (require.main === module) {
  startApp();
}

export default app;
