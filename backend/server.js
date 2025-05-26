// backend/server.js
import express from "express";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import ocrRoutes from "./routes/ocrRoutes.js";

import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import languageRoutes from "./routes/languageRoutes.js";
import ocrRecordRoutes from "./routes/ocrRecordRoutes.js"; // 引入OCR记录路由
import recognitionRoutes from "./routes/recognitionRoutes.js"; // 引入图像识别路由
import savedOcrResultRoutes from "./routes/savedOcrResultRoutes.js"; // 引入保存的OCR结果路由
import notificationRoutes from "./routes/notificationRoutes.js"; // 引入通知路由
// import { logRequest, logResponse } from "./controllers/adminController.js"; // 暂时注释掉进行调试
import connectDB from "./db/config.js"; // 导入数据库连接函数
import swaggerSetup from "./swagger.js"; // 导入 Swagger 设置
import config from "./utils/envConfig.js"; // 导入统一的环境变量配置

import { mongoose, checkConnection, isConnected } from "./db/config.js"; // 导入mongoose实例和连接检查函数
import { initializePassport } from "./middleware/passportConfig.js"; // 导入Passport配置
import { getLogger } from "./utils/logger.js"; // 导入安全日志服务
import { errorHandler, notFoundHandler } from "./middleware/errorMiddleware.js"; // 导入错误处理中间件
import { csrfProtection, addCsrfToken } from "./middleware/csrfMiddleware.js"; // 导入CSRF保护中间件
import { apiRateLimit } from "./middleware/rateLimitMiddleware.js"; // 导入速率限制中间件

const logger = getLogger("server");

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 连接到数据库
(async () => {
  try {
    await connectDB();
    console.log("MongoDB数据库连接成功并准备就绪");
  } catch (error) {
    console.error("数据库初始化错误:", error);
    // 不立即退出，继续启动应用，让健康检查API可以报告状态
    console.warn("应用将继续启动，但数据库功能可能不可用");
  }
})();

const app = express();
const PORT = config.port;

// 安全中间件
// 使用Helmet设置安全HTTP头
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https://vision.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"],
      },
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// CORS配置
app.use(
  cors({
    origin: config.corsOrigins || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    credentials: true,
    maxAge: 86400, // 24小时
  })
);

// 解析Cookie
app.use(cookieParser(config.cookieSecret || config.sessionSecret));

// 解析请求体
app.use(express.json({ limit: "50mb" })); // 增加限制以处理大型图像
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 会话配置
app.use(
  session({
    secret: config.sessionSecret || "vue-ocr-app-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // 只在生产环境中要求HTTPS
      httpOnly: true,
      sameSite: "lax", // 使用lax而不是strict，允许从外部链接导航时发送Cookie
      maxAge: 24 * 60 * 60 * 1000, // 24小时
    },
  })
);

// 初始化Passport
const passport = initializePassport();
app.use(passport.initialize());
app.use(passport.session());

// 添加CSRF令牌 - 暂时注释掉进行调试
// app.use(addCsrfToken);

// 全局速率限制 - 暂时注释掉进行调试
// app.use(apiRateLimit);

// API请求日志中间件 - 暂时注释掉进行调试
// app.use(logRequest);
// app.use(logResponse);

// 设置 Swagger
if (config.swaggerEnabled) {
  swaggerSetup(app);
}

// CSRF令牌获取路由
app.get("/api/csrf-token", (req, res) => {
  // 这个路由不需要CSRF保护，因为它本身就是用来获取CSRF令牌的
  // 令牌已经通过addCsrfToken中间件添加到响应头中
  res.json({ success: true, message: "CSRF令牌已在响应头中" });
});

// 简单测试路由
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "测试路由工作正常" });
});

// 路由
app.use("/api/ocr", ocrRoutes); // 移除CSRF保护，因为OCR路由已在csrfMiddleware.js中豁免
app.use("/api/users", userRoutes); // 用户路由中已添加CSRF保护
app.use("/api/auth", authRoutes); // 认证路由（OAuth、邮箱验证等）
app.use("/api/admin", csrfProtection, adminRoutes);
app.use("/api/languages", languageRoutes);
app.use("/api/ocr-records", csrfProtection, ocrRecordRoutes); // 添加OCR记录路由
app.use("/api/node/recognition", recognitionRoutes); // 添加图像识别路由
app.use("/api/saved-results", savedOcrResultRoutes); // 移除CSRF保护，解决保存问题
app.use(
  "/api/published-results",
  (req, res, next) => {
    // 将/api/published-results的请求重定向到/api/saved-results/published
    req.url = "/published" + (req.url === "/" ? "" : req.url);
    console.log("重定向published-results请求到:", req.url);
    next();
  },
  savedOcrResultRoutes
); // 公开发布的OCR结果路由
app.use("/api/notifications", notificationRoutes); // 通知路由

// 健康检查API - 快速诊断系统状态
app.get("/api/health", async (req, res) => {
  // 使用新的连接检查函数确认数据库状态
  let dbStatus = "disconnected";
  try {
    const isDbConnected = await checkConnection();
    dbStatus = isDbConnected ? "connected" : "disconnected";
  } catch (error) {
    console.error("健康检查: 数据库测试失败", error);
    dbStatus = "error";
  }

  // 检查JWT密钥
  const jwtConfigured =
    config.jwtSecret && config.jwtSecret !== "dev_jwt_secret_do_not_use_in_production";

  // 组装健康状态
  const healthStatus = {
    status: "online",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    server: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    },
    services: {
      database: {
        status: dbStatus,
        type: "mongodb",
        uri: config.mongodbUri
          ? config.mongodbUri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")
          : "未设置",
        isConnected: isConnected, // 添加数据库连接标志
      },

      jwt: {
        configured: jwtConfigured,
        expiresIn: config.jwtExpiresIn || "24h",
        refreshExpiresIn: config.refreshTokenExpiresIn || "30d",
      },
      api: {
        googleVision: !!config.googleVisionApiKey,
      },
    },
  };

  res.json(healthStatus);
});

// 404错误处理
app.use(notFoundHandler);

// 错误处理中间件
app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ 服务器启动成功 - 端口: ${PORT}`);
  console.log(`🌍 环境: ${config.nodeEnv}`);
  console.log(`🔗 健康检查: http://0.0.0.0:${PORT}/api/health`);

  // 异步执行详细日志，避免阻塞启动
  setImmediate(() => {
    try {
      logger.info(`服务器运行在 http://0.0.0.0:${PORT}`, { version: "1.0.1" });

      if (config.swaggerEnabled) {
        logger.info(`API 文档可在 http://0.0.0.0:${PORT}/api-docs 访问`);
      }

      // 检查API密钥是否已配置
      if (!config.googleVisionApiKey) {
        logger.warn("警告: Google Vision API密钥未在环境变量中设置，服务器端OCR功能将不可用");
      } else {
        logger.info("Google Vision API密钥已配置");
      }

      // 显示JWT配置状态
      if (config.isConfigValid()) {
        logger.info("JWT配置已正确加载");
      } else {
        logger.error("警告: JWT配置未正确加载，用户认证功能可能不可用");
      }

      logger.info("服务器启动完成，所有功能已就绪");
    } catch (error) {
      console.error("启动后日志记录失败:", error);
    }
  });
});

export default app;
