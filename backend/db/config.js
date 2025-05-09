import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// 数据库文件路径
const DB_PATH = process.env.SQLITE_PATH || resolve(__dirname, '../../database/ocr_app.sqlite');

// 创建Sequelize实例
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: false // 关闭SQL日志输出
});

// 连接数据库
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('SQLite 数据库连接成功');
    
    // 同步数据库模型（设置 alter: false 避免自动修改表结构）
    await sequelize.sync({ alter: false });
    console.log('数据库模型同步完成');
    
    return true;
  } catch (error) {
    console.error('SQLite 数据库连接失败:', error.message);
    throw error;
  }
};

export { sequelize };
export default connectDB; 