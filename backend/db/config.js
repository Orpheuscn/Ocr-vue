import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";
import dotenv from "dotenv";

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 如果环境变量尚未加载（通过 start.js），则加载环境变量
if (!process.env.ENV_LOADED) {
  // 确定当前环境
  const env = process.env.NODE_ENV || "development";

  // 根据环境选择配置文件
  let envFile = ".env.local";
  if (env === "production") {
    envFile = ".env.production";
  } else if (env === "test") {
    envFile = ".env.test";
  }

  // 尝试加载环境变量文件
  const envPath = resolve(__dirname, `../${envFile}`);
  const defaultEnvPath = resolve(__dirname, "../.env");

  // 按优先级加载环境变量文件
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`已加载环境变量文件: ${envPath}`);
  } else if (fs.existsSync(defaultEnvPath)) {
    dotenv.config({ path: defaultEnvPath });
    console.log("已加载默认环境变量文件:", defaultEnvPath);
  } else {
    dotenv.config();
    console.log("已加载默认环境变量");
  }
}

// 检查必要的环境变量是否存在
if (!process.env.MONGODB_URI) {
  throw new Error("环境变量MONGODB_URI未定义，请检查.env文件");
}

if (!process.env.MONGODB_DB_NAME) {
  throw new Error("环境变量MONGODB_DB_NAME未定义，请检查.env文件");
}

// 标记数据库连接状态
let isConnected = false;

// 连接数据库
const connectDB = async () => {
  // 重试机制
  const maxRetries = 5;
  let retries = 0;
  let lastError = null;

  while (retries < maxRetries) {
    try {
      // 设置Mongoose选项
      mongoose.set("strictQuery", false);

      // 连接到MongoDB
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: process.env.MONGODB_DB_NAME,
      });

      console.log("MongoDB 数据库连接成功");
      console.log(`数据库URI: ${process.env.MONGODB_URI}`);
      console.log(`数据库名称: ${process.env.MONGODB_DB_NAME}`);

      // 设置连接状态为已连接
      isConnected = true;

      return true;
    } catch (error) {
      retries++;
      lastError = error;
      const waitTime = retries * 1000; // 递增等待时间

      console.warn(`MongoDB 数据库连接失败 (尝试 ${retries}/${maxRetries}): ${error.message}`);
      console.log(`等待 ${waitTime}ms 后重试...`);

      // 等待一段时间后重试
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  // 如果所有重试都失败
  console.error("MongoDB 数据库连接失败，已达到最大重试次数:", lastError.message);
  throw lastError;
};

// 提供一个函数来检查数据库连接状态
const checkConnection = async () => {
  try {
    // 检查MongoDB连接状态
    const connectionState = mongoose.connection.readyState;
    
    // 记录当前连接状态
    console.log(`当前数据库连接状态: ${connectionState} (${getConnectionStateName(connectionState)})`);
    
    // 如果连接不正常，尝试重连
    if (connectionState !== 1) { // 1 = connected
      isConnected = false;
      console.log('数据库连接不正常，尝试重新连接...');
      await connectDB();
      return true; // 如果重连成功，connectDB会设置isConnected为true
    }
    
    isConnected = true;
    return true;
  } catch (error) {
    console.error("数据库连接检查失败:", error.message);
    isConnected = false;
    return false;
  }
};

// 获取连接状态名称
function getConnectionStateName(state) {
  switch(state) {
    case 0: return '已断开';
    case 1: return '已连接';
    case 2: return '正在连接';
    case 3: return '正在断开连接';
    default: return '未知状态';
  }
}

export { mongoose, checkConnection, isConnected };
export default connectDB;
