/**
 * Node.js后端统一环境检测器
 * 提供统一的环境检测、配置管理和功能开关
 * 类似于前端的environment.js，但适配Node.js环境
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

/**
 * Node.js后端环境检测器类
 * 提供统一的环境检测和配置管理
 */
class NodeEnvironmentDetector {
  constructor() {
    this.initializeEnvironment();
  }

  /**
   * 初始化环境检测
   */
  initializeEnvironment() {
    // 如果环境变量已经被start.js加载，则跳过
    if (process.env.ENV_LOADED === 'true') {
      console.log('环境变量已由启动脚本加载，跳过重复加载');
      return;
    }

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
      console.log(`🔧 加载 ${envFile} 环境变量文件`);
      dotenv.config({ path: envPath });
    } else if (fs.existsSync(defaultEnvPath)) {
      console.log("🔧 加载 .env 环境变量文件");
      dotenv.config({ path: defaultEnvPath });
    } else {
      console.log("🔧 未找到 .env 文件，使用默认环境变量");
      dotenv.config();
    }
  }

  /**
   * 获取当前运行环境
   * @returns {string} 环境名称
   */
  getEnvironment() {
    return process.env.NODE_ENV || "development";
  }

  /**
   * 获取运行平台
   * @returns {string} 平台类型
   */
  getPlatform() {
    // 检查是否在云端运行
    if (process.env.GOOGLE_CLOUD_PROJECT || process.env.GAE_APPLICATION) {
      return "google-cloud";
    }
    if (process.env.AWS_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return "aws";
    }
    if (process.env.AZURE_FUNCTIONS_ENVIRONMENT) {
      return "azure";
    }
    if (process.env.HEROKU_APP_NAME) {
      return "heroku";
    }
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      return "vercel";
    }
    if (process.env.NETLIFY) {
      return "netlify";
    }

    // 检查容器环境
    if (process.env.KUBERNETES_SERVICE_HOST) {
      return "kubernetes";
    }
    if (fs.existsSync('/.dockerenv')) {
      return "docker";
    }

    return "local";
  }

  /**
   * 检查是否为开发环境
   * @returns {boolean}
   */
  isDevelopment() {
    return this.getEnvironment() === "development";
  }

  /**
   * 检查是否为生产环境
   * @returns {boolean}
   */
  isProduction() {
    return this.getEnvironment() === "production";
  }

  /**
   * 检查是否为测试环境
   * @returns {boolean}
   */
  isTest() {
    return this.getEnvironment() === "test";
  }

  /**
   * 检查是否为本地环境
   * @returns {boolean}
   */
  isLocal() {
    return this.getPlatform() === "local";
  }

  /**
   * 检查是否为云端环境
   * @returns {boolean}
   */
  isCloud() {
    const platform = this.getPlatform();
    return !["local", "docker"].includes(platform);
  }

  // ==================== 功能开关方法 ====================

  /**
   * 是否启用调试日志
   * @returns {boolean}
   */
  shouldEnableDebugLogs() {
    if (this.isProduction()) return false;
    return process.env.ENABLE_DEBUG_LOGS !== "false";
  }

  /**
   * 是否显示详细错误信息
   * @returns {boolean}
   */
  shouldShowDetailedErrors() {
    return this.isDevelopment() || process.env.SHOW_DETAILED_ERRORS === "true";
  }

  /**
   * 是否启用Swagger API文档
   * @returns {boolean}
   */
  shouldEnableSwagger() {
    if (this.isProduction()) {
      return process.env.SWAGGER_ENABLED === "true";
    }
    return process.env.SWAGGER_ENABLED !== "false";
  }

  /**
   * 是否启用OAuth功能
   * @returns {boolean}
   */
  shouldEnableOAuth() {
    if (this.isDevelopment()) {
      return process.env.ENABLE_OAUTH === "true";
    }
    return process.env.ENABLE_OAUTH !== "false";
  }

  /**
   * 是否启用邮箱验证
   * @returns {boolean}
   */
  shouldEnableEmailVerification() {
    return process.env.ENABLE_EMAIL_VERIFICATION === "true";
  }

  /**
   * 是否启用CSRF保护
   * @returns {boolean}
   */
  shouldEnableCSRF() {
    if (this.isDevelopment()) {
      return process.env.ENABLE_CSRF !== "false";
    }
    return true;
  }

  /**
   * 是否启用速率限制
   * @returns {boolean}
   */
  shouldEnableRateLimit() {
    if (this.isDevelopment()) {
      return process.env.ENABLE_RATE_LIMIT === "true";
    }
    return true;
  }

  /**
   * 是否启用请求日志
   * @returns {boolean}
   */
  shouldEnableRequestLogging() {
    return process.env.ENABLE_REQUEST_LOGGING !== "false";
  }

  /**
   * 是否启用性能监控
   * @returns {boolean}
   */
  shouldEnablePerformanceMonitoring() {
    return this.isProduction() || process.env.ENABLE_PERFORMANCE_MONITORING === "true";
  }

  // ==================== 配置获取方法 ====================

  /**
   * 获取服务器配置
   * @returns {object} 服务器配置对象
   */
  getServerConfig() {
    return {
      port: parseInt(process.env.PORT) || 3000,
      host: process.env.HOST || "0.0.0.0",
      nodeEnv: this.getEnvironment(),
      platform: this.getPlatform(),
      enableHttps: process.env.ENABLE_HTTPS === "true",
      httpsPort: parseInt(process.env.HTTPS_PORT) || 443
    };
  }

  /**
   * 获取数据库配置
   * @returns {object} 数据库配置对象
   */
  getDatabaseConfig() {
    return {
      uri: process.env.MONGODB_URI,
      dbName: process.env.MONGODB_DB_NAME || "ocr_app",
      options: {
        maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
        serverSelectionTimeoutMS: parseInt(process.env.DB_TIMEOUT) || 5000,
        socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
      }
    };
  }

  /**
   * 获取JWT配置
   * @returns {object} JWT配置对象
   */
  getJWTConfig() {
    return {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || "24h",
      refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",
      algorithm: process.env.JWT_ALGORITHM || "HS256"
    };
  }

  /**
   * 获取安全配置
   * @returns {object} 安全配置对象
   */
  getSecurityConfig() {
    return {
      cookieSecret: process.env.COOKIE_SECRET || process.env.JWT_SECRET,
      sessionSecret: process.env.SESSION_SECRET || "ocr-app-session-secret",
      csrfSecret: process.env.CSRF_SECRET || process.env.JWT_SECRET,
      enableCSRF: this.shouldEnableCSRF(),
      enableRateLimit: this.shouldEnableRateLimit(),
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
      rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30,
      authRateLimitWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 900000,
      authRateLimitMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 10,
      ocrRateLimitWindowMs: parseInt(process.env.OCR_RATE_LIMIT_WINDOW_MS) || 60000,
      ocrRateLimitMaxRequests: parseInt(process.env.OCR_RATE_LIMIT_MAX_REQUESTS) || 5
    };
  }

  /**
   * 获取CORS配置
   * @returns {object} CORS配置对象
   */
  getCORSConfig() {
    const defaultOrigins = this.isProduction()
      ? ["https://textistext.com", "https://textistext-frontend-82114549685.us-central1.run.app"]
      : ["http://localhost:8080", "http://localhost:8082", "https://localhost:8443"];

    return {
      origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : defaultOrigins,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
      credentials: true,
      maxAge: 86400
    };
  }

  /**
   * 获取日志配置
   * @returns {object} 日志配置对象
   */
  getLogConfig() {
    return {
      level: process.env.LOG_LEVEL || (this.isProduction() ? "info" : "debug"),
      dir: process.env.LOG_DIR || "../logs",
      enableConsole: process.env.ENABLE_CONSOLE_LOG !== "false",
      enableFile: process.env.ENABLE_FILE_LOG !== "false",
      enableRequestLogging: this.shouldEnableRequestLogging(),
      enableDebugLogs: this.shouldEnableDebugLogs()
    };
  }

  /**
   * 获取OAuth配置
   * @returns {object} OAuth配置对象
   */
  getOAuthConfig() {
    return {
      enabled: this.shouldEnableOAuth(),
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      },
      apple: {
        clientId: process.env.APPLE_CLIENT_ID,
        clientSecret: process.env.APPLE_CLIENT_SECRET,
        configured: !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET)
      }
    };
  }

  /**
   * 获取API配置
   * @returns {object} API配置对象
   */
  getAPIConfig() {
    return {
      googleVision: {
        apiKey: process.env.GOOGLE_VISION_API_KEY,
        configured: !!process.env.GOOGLE_VISION_API_KEY
      },
      swagger: {
        enabled: this.shouldEnableSwagger(),
        user: process.env.SWAGGER_USER,
        password: process.env.SWAGGER_PASSWORD
      }
    };
  }

  /**
   * 获取邮箱配置
   * @returns {object} 邮箱配置对象
   */
  getEmailConfig() {
    return {
      enabled: this.shouldEnableEmailVerification(),
      smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
      }
    };
  }

  /**
   * 获取文件上传配置
   * @returns {object} 文件上传配置对象
   */
  getUploadConfig() {
    return {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 25000000,
      allowedFileTypes: process.env.ALLOWED_FILE_TYPES
        ? process.env.ALLOWED_FILE_TYPES.split(",")
        : ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "application/pdf"],
      uploadDir: process.env.UPLOAD_DIR || "../uploads"
    };
  }

  /**
   * 获取代理配置
   * @returns {object} 代理配置对象
   */
  getProxyConfig() {
    return {
      enabled: this.shouldEnableProxy(),
      forceProxy: process.env.FORCE_PROXY === "true",
      disableProxy: process.env.DISABLE_PROXY === "true",
      httpProxy: process.env.HTTP_PROXY,
      httpsProxy: process.env.HTTPS_PROXY,
      allProxy: process.env.ALL_PROXY,
      defaultProxy: "http://127.0.0.1:7890"
    };
  }

  /**
   * 是否启用代理
   * @returns {boolean}
   */
  shouldEnableProxy() {
    // 强制禁用代理
    if (process.env.DISABLE_PROXY === "true") {
      return false;
    }

    // 强制启用代理
    if (process.env.FORCE_PROXY === "true") {
      return true;
    }

    // 检查是否在云端环境
    if (this.isCloud()) {
      return false; // 云端环境通常不需要代理
    }

    // 开发环境默认启用代理，生产环境默认禁用
    return this.isDevelopment();
  }

  /**
   * 验证配置是否有效
   * @returns {object} 验证结果
   */
  validateConfig() {
    const requiredEnvVars = ["JWT_SECRET"];
    const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

    const warnings = [];
    const errors = [];

    // 检查必要的环境变量
    if (missingEnvVars.length > 0) {
      if (this.isProduction()) {
        errors.push(`生产环境缺少必要的环境变量: ${missingEnvVars.join(", ")}`);
      } else {
        warnings.push(`开发环境缺少环境变量，将使用默认值: ${missingEnvVars.join(", ")}`);
        // 为开发环境设置默认值
        if (!process.env.JWT_SECRET) {
          process.env.JWT_SECRET = "dev_jwt_secret_do_not_use_in_production";
        }
      }
    }

    // 检查数据库配置
    if (!process.env.MONGODB_URI) {
      if (this.isProduction()) {
        errors.push("生产环境必须配置MONGODB_URI");
      } else {
        warnings.push("未配置MONGODB_URI，数据库功能可能不可用");
      }
    }

    // 检查Google Vision API
    if (!process.env.GOOGLE_VISION_API_KEY) {
      warnings.push("未配置Google Vision API密钥，OCR功能可能不可用");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingEnvVars
    };
  }

  /**
   * 初始化并验证配置
   */
  initializeAndValidate() {
    const validation = this.validateConfig();

    if (validation.warnings.length > 0) {
      console.warn("⚠️  配置警告:");
      validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
    }

    if (validation.errors.length > 0) {
      console.error("❌ 配置错误:");
      validation.errors.forEach(error => console.error(`   - ${error}`));

      if (this.isProduction()) {
        console.error("在生产环境中必须正确配置所有所需的环境变量");
        process.exit(1);
      }
    }

    return validation;
  }
}

// 创建环境检测器实例
const environment = new NodeEnvironmentDetector();

// 初始化并验证配置
const configValidation = environment.initializeAndValidate();

// ==================== 便捷函数导出 ====================

/**
 * 获取指定类型的配置
 * @param {string} configType 配置类型
 * @returns {object} 配置对象
 */
export const getConfig = (configType) => {
  const configMethods = {
    'server': () => environment.getServerConfig(),
    'database': () => environment.getDatabaseConfig(),
    'jwt': () => environment.getJWTConfig(),
    'security': () => environment.getSecurityConfig(),
    'cors': () => environment.getCORSConfig(),
    'log': () => environment.getLogConfig(),
    'oauth': () => environment.getOAuthConfig(),
    'api': () => environment.getAPIConfig(),
    'email': () => environment.getEmailConfig(),
    'upload': () => environment.getUploadConfig(),
    'proxy': () => environment.getProxyConfig()
  };

  if (!configMethods[configType]) {
    throw new Error(`不支持的配置类型: ${configType}`);
  }

  return configMethods[configType]();
};

/**
 * 获取当前运行环境
 * @returns {string} 环境名称
 */
export const getEnvironment = () => environment.getEnvironment();

/**
 * 获取运行平台
 * @returns {string} 平台类型
 */
export const getPlatform = () => environment.getPlatform();

/**
 * 检查是否为开发环境
 * @returns {boolean}
 */
export const isDevelopment = () => environment.isDevelopment();

/**
 * 检查是否为生产环境
 * @returns {boolean}
 */
export const isProduction = () => environment.isProduction();

/**
 * 检查是否为测试环境
 * @returns {boolean}
 */
export const isTest = () => environment.isTest();

// ==================== 兼容性导出 ====================
// 为了保持向后兼容，导出旧的配置格式

const serverConfig = environment.getServerConfig();
const databaseConfig = environment.getDatabaseConfig();
const jwtConfig = environment.getJWTConfig();
const securityConfig = environment.getSecurityConfig();
const corsConfig = environment.getCORSConfig();
const logConfig = environment.getLogConfig();
const oauthConfig = environment.getOAuthConfig();
const apiConfig = environment.getAPIConfig();
const emailConfig = environment.getEmailConfig();
const uploadConfig = environment.getUploadConfig();

// 导出兼容的配置对象
export default {
  // 服务器配置
  port: serverConfig.port,
  nodeEnv: serverConfig.nodeEnv,

  // 数据库配置
  mongodbUri: databaseConfig.uri,
  mongodbDbName: databaseConfig.dbName,

  // JWT配置
  jwtSecret: jwtConfig.secret,
  jwtExpiresIn: jwtConfig.expiresIn,
  refreshTokenExpiresIn: jwtConfig.refreshExpiresIn,

  // 安全配置
  cookieSecret: securityConfig.cookieSecret,
  sessionSecret: securityConfig.sessionSecret,
  csrfSecret: securityConfig.csrfSecret,
  rateLimitWindowMs: securityConfig.rateLimitWindowMs,
  rateLimitMaxRequests: securityConfig.rateLimitMaxRequests,
  authRateLimitWindowMs: securityConfig.authRateLimitWindowMs,
  authRateLimitMaxRequests: securityConfig.authRateLimitMaxRequests,
  ocrRateLimitWindowMs: securityConfig.ocrRateLimitWindowMs,
  ocrRateLimitMaxRequests: securityConfig.ocrRateLimitMaxRequests,

  // 日志配置
  logLevel: logConfig.level,
  logDir: logConfig.dir,

  // CORS配置
  corsOrigins: corsConfig.origins,

  // 文件上传配置
  maxFileSize: uploadConfig.maxFileSize,
  allowedFileTypes: uploadConfig.allowedFileTypes,
  uploadDir: uploadConfig.uploadDir,

  // API配置
  googleVisionApiKey: apiConfig.googleVision.apiKey,

  // OAuth配置
  enableOAuth: oauthConfig.enabled,
  googleClientId: oauthConfig.google.clientId,
  googleClientSecret: oauthConfig.google.clientSecret,
  appleClientId: oauthConfig.apple.clientId,
  appleClientSecret: oauthConfig.apple.clientSecret,

  // 邮箱配置
  enableEmailVerification: emailConfig.enabled,
  smtpHost: emailConfig.smtp.host,
  smtpPort: emailConfig.smtp.port,
  smtpUser: emailConfig.smtp.user,
  smtpPass: emailConfig.smtp.pass,

  // Swagger配置
  swaggerEnabled: apiConfig.swagger.enabled,
  swaggerUser: apiConfig.swagger.user,
  swaggerPassword: apiConfig.swagger.password,

  // 验证配置是否加载成功的辅助函数
  isConfigValid() {
    return !!jwtConfig.secret;
  },
};

// 导出环境检测器实例
export { environment };
