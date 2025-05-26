/**
 * 环境变量配置工具
 * 集中管理所有环境变量，避免在多个文件中重复加载
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// 根据环境选择配置文件
const env = process.env.NODE_ENV || "development";
let envFile = ".env.local";

if (env === "production") {
  envFile = ".env.production";
} else if (env === "test") {
  envFile = ".env.test";
}

// 检查并加载环境变量文件
const envPath = path.resolve(rootDir, envFile);
const defaultEnvPath = path.resolve(rootDir, ".env");

if (fs.existsSync(envPath)) {
  console.log(`加载 ${envFile} 环境变量文件`);
  dotenv.config({ path: envPath });
} else if (fs.existsSync(defaultEnvPath)) {
  console.log("加载 .env 环境变量文件");
  dotenv.config({ path: defaultEnvPath });
} else {
  console.log("未找到 .env 文件，使用默认环境变量");
  dotenv.config();
}

// 验证必要的环境变量
const requiredEnvVars = ["JWT_SECRET"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error("错误: 缺少以下必要的环境变量:");
  missingEnvVars.forEach((envVar) => console.error(`- ${envVar}`));

  // 为开发环境设置默认值，生产环境直接退出
  if (env !== "production") {
    console.warn("警告: 在开发环境中使用默认值，生产环境请正确设置这些环境变量");

    // 设置默认值
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = "dev_jwt_secret_do_not_use_in_production";
      console.warn("已使用开发环境默认 JWT_SECRET");
    }
  } else {
    console.error("在生产环境中必须正确配置所有所需的环境变量");
    process.exit(1);
  }
}

// 导出所有配置
export default {
  // 服务器配置
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",

  // 数据库配置
  mongodbUri: process.env.MONGODB_URI,
  mongodbDbName: process.env.MONGODB_DB_NAME || "ocr_app",

  // JWT配置
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",

  // Cookie配置
  cookieSecret: process.env.COOKIE_SECRET || process.env.JWT_SECRET,
  sessionSecret: process.env.SESSION_SECRET || "ocr-app-session-secret",

  // CSRF保护配置
  csrfSecret: process.env.CSRF_SECRET || process.env.JWT_SECRET,

  // 速率限制配置
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "30"),
  authRateLimitWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "900000"),
  authRateLimitMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || "10"),
  ocrRateLimitWindowMs: parseInt(process.env.OCR_RATE_LIMIT_WINDOW_MS || "60000"),
  ocrRateLimitMaxRequests: parseInt(process.env.OCR_RATE_LIMIT_MAX_REQUESTS || "5"),

  // 日志配置
  logLevel: process.env.LOG_LEVEL || (env === "production" ? "info" : "debug"),
  logDir: process.env.LOG_DIR || "../logs",

  // CORS配置
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : env === "production"
    ? ["https://textistext.com", "https://textistext-frontend-82114549685.us-central1.run.app"]
    : ["http://localhost:8080", "http://localhost:8082", "https://localhost:8443"],

  // 文件上传配置
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "25000000"),
  allowedFileTypes: process.env.ALLOWED_FILE_TYPES
    ? process.env.ALLOWED_FILE_TYPES.split(",")
    : ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "application/pdf"],
  uploadDir: process.env.UPLOAD_DIR || "../uploads",

  // API密钥
  googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY,

  // Swagger配置
  swaggerEnabled: process.env.SWAGGER_ENABLED === "true" || env !== "production",
  swaggerUser: process.env.SWAGGER_USER,
  swaggerPassword: process.env.SWAGGER_PASSWORD,

  // 验证配置是否加载成功的辅助函数
  isConfigValid() {
    return !!this.jwtSecret;
  },
};
