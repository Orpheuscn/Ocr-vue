// utils/logger.js
import winston from "winston";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import config from "./envConfig.js";

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 日志目录 - 在Cloud Run中使用应用目录下的logs文件夹
const LOG_DIR =
  process.env.NODE_ENV === "production"
    ? path.join("/app", "logs")
    : path.join(__dirname, "../../logs/backend");

// 确保日志目录存在
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (error) {
  // 在Cloud Run中如果无法创建日志目录，使用临时目录
  console.warn("无法创建日志目录，将使用控制台输出:", error.message);
}

// 敏感字段列表，这些字段的值将被屏蔽
const SENSITIVE_FIELDS = [
  "password",
  "token",
  "refreshToken",
  "apiKey",
  "secret",
  "authorization",
  "cookie",
  "sessionId",
  "key",
  "credential",
  "pin",
  "code",
  "cvv",
  "ssn",
  "creditCard",
  "cardNumber",
];

/**
 * 检查对象是否包含敏感信息
 * @param {string} key - 对象的键
 * @returns {boolean} - 是否是敏感信息
 */
const isSensitiveKey = (key) => {
  if (typeof key !== "string") return false;

  const lowerKey = key.toLowerCase();
  return SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()));
};

/**
 * 屏蔽对象中的敏感信息
 * @param {any} data - 要屏蔽的数据
 * @returns {any} - 屏蔽后的数据
 */
const maskSensitiveData = (data) => {
  // 如果是null或undefined，直接返回
  if (data == null) return data;

  // 如果是基本类型，直接返回
  if (typeof data !== "object") return data;

  // 如果是数组，递归处理每个元素
  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item));
  }

  // 如果是对象，递归处理每个属性
  const maskedData = {};
  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveKey(key)) {
      // 屏蔽敏感信息
      maskedData[key] =
        typeof value === "string" ? "***MASKED***" : { type: typeof value, masked: true };
    } else if (typeof value === "object" && value !== null) {
      // 递归处理嵌套对象
      maskedData[key] = maskSensitiveData(value);
    } else {
      // 非敏感信息直接保留
      maskedData[key] = value;
    }
  }

  return maskedData;
};

// 自定义格式化器，屏蔽敏感信息
const maskFormat = winston.format((info) => {
  // 屏蔽message中的敏感信息
  if (info.message && typeof info.message === "string") {
    // 简单替换常见的敏感信息模式
    info.message = info.message.replace(
      /(password|token|apiKey|secret)[:=]\s*["']?[^"'\s]+["']?/gi,
      "$1: ***MASKED***"
    );
  }

  // 屏蔽其他字段中的敏感信息
  for (const key in info) {
    if (key !== "level" && key !== "message" && key !== "timestamp") {
      info[key] = maskSensitiveData(info[key]);
    }
  }

  return info;
});

// 创建日志格式
const logFormat = winston.format.combine(
  maskFormat(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 创建控制台格式
const consoleFormat = winston.format.combine(
  maskFormat(),
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...rest }) => {
    const restString = Object.keys(rest).length ? JSON.stringify(rest, null, 2) : "";
    return `${timestamp} ${level}: ${message} ${restString}`;
  })
);

// 创建日志记录器
const createLogger = (category) => {
  const transports = [];

  // 尝试添加文件传输器
  try {
    if (fs.existsSync(LOG_DIR)) {
      transports.push(
        // 写入所有日志到combined.log
        new winston.transports.File({
          filename: path.join(LOG_DIR, "combined.log"),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // 写入错误日志到error.log
        new winston.transports.File({
          filename: path.join(LOG_DIR, "error.log"),
          level: "error",
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // 写入特定类别的日志到category.log
        new winston.transports.File({
          filename: path.join(LOG_DIR, `${category}.log`),
          maxsize: 5242880, // 5MB
          maxFiles: 3,
        })
      );
    }
  } catch (error) {
    console.warn("无法设置文件日志传输器，将仅使用控制台输出:", error.message);
  }

  // 总是添加控制台传输器
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );

  return winston.createLogger({
    level: config.logLevel || "info",
    format: logFormat,
    defaultMeta: { service: "ocr-app", category },
    transports,
    // 处理未捕获的异常和拒绝 - 在生产环境中使用控制台
    exceptionHandlers: [
      new winston.transports.Console({
        format: consoleFormat,
      }),
    ],
    rejectionHandlers: [
      new winston.transports.Console({
        format: consoleFormat,
      }),
    ],
  });
};

// 日志记录器缓存
const loggers = {};

/**
 * 获取指定类别的日志记录器
 * @param {string} category - 日志类别
 * @returns {Object} - 日志记录器
 */
export const getLogger = (category = "app") => {
  if (!loggers[category]) {
    loggers[category] = createLogger(category);
  }
  return loggers[category];
};

// 默认日志记录器
export default getLogger();
