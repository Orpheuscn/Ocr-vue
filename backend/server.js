// backend/server.js
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import ocrRoutes from './routes/ocrRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { logRequest, logResponse } from './controllers/adminController.js';
import connectDB from './db/config.js'; // 导入数据库连接函数
import swaggerSetup from './swagger.js'; // 导入 Swagger 设置
import config from './utils/envConfig.js'; // 导入统一的环境变量配置
import { sequelize, checkConnection, isConnected } from './db/config.js'; // 导入sequelize实例和连接检查函数
import { initializePassport } from './middleware/passportConfig.js'; // 导入Passport配置

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 连接到数据库
(async () => {
  try {
    await connectDB();
    console.log('SQLite数据库连接成功并准备就绪');
  } catch (error) {
    console.error('数据库初始化错误:', error);
    // 不立即退出，继续启动应用，让健康检查API可以报告状态
    console.warn('应用将继续启动，但数据库功能可能不可用');
  }
})();

const app = express();
const PORT = config.port;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 增加限制以处理大型图像
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 会话配置
app.use(session({
  secret: config.sessionSecret || 'vue-ocr-app-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 初始化Passport
const passport = initializePassport();
app.use(passport.initialize());
app.use(passport.session());

// API请求日志中间件
app.use(logRequest);
app.use(logResponse);

// 设置 Swagger
if (config.swaggerEnabled) {
  swaggerSetup(app);
}

// 路由
app.use('/api/ocr', ocrRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查API - 快速诊断系统状态
app.get('/api/health', async (req, res) => {
  // 使用新的连接检查函数确认数据库状态
  let dbStatus = 'disconnected';
  try {
    const isDbConnected = await checkConnection();
    dbStatus = isDbConnected ? 'connected' : 'disconnected';
  } catch (error) {
    console.error('健康检查: 数据库测试失败', error);
    dbStatus = 'error';
  }
  
  // 检查JWT密钥
  const jwtConfigured = config.jwtSecret && config.jwtSecret !== 'dev_jwt_secret_do_not_use_in_production';
  
  // 组装健康状态
  const healthStatus = {
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    server: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    },
    services: {
      database: {
        status: dbStatus,
        type: 'sqlite',
        path: config.sqlitePath || '未设置',
        isConnected: isConnected // 添加数据库连接标志
      },
      jwt: {
        configured: jwtConfigured,
        expiresIn: config.jwtExpiresIn || '24h',
        refreshExpiresIn: config.refreshTokenExpiresIn || '30d'
      },
      api: {
        googleVision: !!config.googleVisionApiKey
      }
    }
  };
  
  res.json(healthStatus);
});

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
  
  if (config.swaggerEnabled) {
    console.log(`API 文档可在 http://localhost:${PORT}/api-docs 访问`);
    console.log(`认证信息 - 用户名: ${config.swaggerUser}, 密码: ${config.swaggerPassword}`);
  }
  
  // 打印环境变量以进行调试
  console.log(`当前环境: ${config.nodeEnv}`);

  // 检查API密钥是否已配置
  if (!config.googleVisionApiKey) {
    console.warn('警告: Google Vision API密钥未在环境变量中设置，服务器端OCR功能将不可用');
  } else {
    console.log('Google Vision API密钥已配置');
    // 显示API密钥的前几个字符用于验证
    const apiKey = config.googleVisionApiKey;
    console.log(`API密钥前缀: ${apiKey.substring(0, 8)}...`);
  }
  
  // 显示JWT配置状态
  if (config.isConfigValid()) {
    console.log('JWT配置已正确加载');
  } else {
    console.error('警告: JWT配置未正确加载，用户认证功能可能不可用');
  }
  
  // 显示数据库状态
  console.log('数据库模式: SQLite (本地文件数据库)');
});

export default app; 