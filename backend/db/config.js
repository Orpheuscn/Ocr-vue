import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 如果环境变量尚未加载（通过 start.js），则加载环境变量
if (!process.env.ENV_LOADED) {
  // 尝试加载多个可能的.env文件位置
  const envLocalPath = resolve(__dirname, '../.env.local');
  const envPath = resolve(__dirname, '../.env');
  const rootEnvPath = resolve(__dirname, '../../config/.env');

  // 按优先级加载环境变量文件
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
  } else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
  } else {
    dotenv.config();
  }
}

// 数据库文件路径
const DB_PATH = process.env.SQLITE_PATH || resolve(__dirname, '../../database/ocr_app.sqlite');

// 创建Sequelize实例
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: process.env.LOG_LEVEL === 'debug', // 只在 debug 级别时显示 SQL 日志
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  retry: {
    max: 5 // 增加重试次数
  }
});

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
      await sequelize.authenticate();
      console.log('SQLite 数据库连接成功');
      console.log(`数据库路径: ${DB_PATH}`);
      
      // 检查数据库文件是否存在
      if (!fs.existsSync(DB_PATH)) {
        console.log('数据库文件不存在，将创建新的数据库文件');
      }
      
      // 同步数据库模型（设置 alter: false 避免自动修改表结构）
      await sequelize.sync({ alter: false });
      console.log('数据库模型同步完成');
      
      // 设置连接状态为已连接
      isConnected = true;
      
      return true;
    } catch (error) {
      retries++;
      lastError = error;
      const waitTime = retries * 1000; // 递增等待时间
      
      console.warn(`SQLite 数据库连接失败 (尝试 ${retries}/${maxRetries}): ${error.message}`);
      console.log(`等待 ${waitTime}ms 后重试...`);
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // 如果所有重试都失败
  console.error('SQLite 数据库连接失败，已达到最大重试次数:', lastError.message);
  throw lastError;
};

// 提供一个函数来检查数据库连接状态
const checkConnection = async () => {
  if (!isConnected) {
    return false;
  }
  
  try {
    // 执行一个简单查询来确认连接状态
    await sequelize.query('SELECT 1+1 AS result');
    return true;
  } catch (error) {
    console.error('数据库连接检查失败:', error.message);
    isConnected = false;
    return false;
  }
};

export { sequelize, checkConnection, isConnected };
export default connectDB; 