// backend/server.js
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import ocrRoutes from './routes/ocrRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { logRequest, logResponse } from './controllers/adminController.js';
import connectDB from './db/config.js'; // 导入数据库连接函数
import dotenv from 'dotenv'; // 确保导入dotenv
import fs from 'fs';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 尝试加载多个可能的.env文件位置
const envLocalPath = resolve(__dirname, './.env.local');
const envPath = resolve(__dirname, './.env');
const rootEnvPath = resolve(__dirname, '../config/.env');

// 按优先级加载环境变量文件
if (fs.existsSync(envLocalPath)) {
  console.log('加载.env.local环境变量文件');
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  console.log('加载.env环境变量文件');
  dotenv.config({ path: envPath });
} else if (fs.existsSync(rootEnvPath)) {
  console.log('加载config/.env环境变量文件');
  dotenv.config({ path: rootEnvPath });
} else {
  console.log('未找到.env文件，使用默认环境变量');
  dotenv.config();
}

// 连接到数据库
(async () => {
  try {
    await connectDB();
    console.log('SQLite数据库连接成功并准备就绪');
  } catch (error) {
    console.error('数据库初始化错误:', error);
    process.exit(1); // 如果数据库连接失败，终止应用
  }
})();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 增加限制以处理大型图像
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API请求日志中间件
app.use(logRequest);
app.use(logResponse);

// 路由
app.use('/api/ocr', ocrRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: err.message
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  // 打印环境变量以进行调试
  console.log(`当前环境: ${process.env.NODE_ENV}`);

  // 检查API密钥是否已配置 (移除默认值检查，只验证是否有值)
  if (!process.env.GOOGLE_VISION_API_KEY) {
    console.warn('警告: Google Vision API密钥未在环境变量中设置，服务器端OCR功能将不可用');
  } else {
    console.log('Google Vision API密钥已配置');
    // 显示API密钥的前几个字符用于验证
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    console.log(`API密钥前缀: ${apiKey.substring(0, 8)}...`);
  }
  
  // 显示数据库状态
  console.log('数据库模式: SQLite (本地文件数据库)');
});

export default app; 