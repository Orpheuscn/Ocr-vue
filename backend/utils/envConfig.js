/**
 * 环境变量配置工具
 * 集中管理所有环境变量，避免在多个文件中重复加载
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 根据环境选择配置文件
const env = process.env.NODE_ENV || 'development';
let envFile = '.env.local';

if (env === 'production') {
  envFile = '.env.production';
} else if (env === 'test') {
  envFile = '.env.test';
}

// 检查并加载环境变量文件
const envPath = path.resolve(rootDir, envFile);
const defaultEnvPath = path.resolve(rootDir, '.env');
const rootEnvPath = path.resolve(rootDir, '../config/.env');

if (fs.existsSync(envPath)) {
  console.log(`加载 ${envFile} 环境变量文件`);
  dotenv.config({ path: envPath });
} else if (fs.existsSync(defaultEnvPath)) {
  console.log('加载 .env 环境变量文件');
  dotenv.config({ path: defaultEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  console.log('加载 config/.env 环境变量文件');
  dotenv.config({ path: rootEnvPath });
} else {
  console.log('未找到 .env 文件，使用默认环境变量');
  dotenv.config();
}

// 验证必要的环境变量
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('错误: 缺少以下必要的环境变量:');
  missingEnvVars.forEach(envVar => console.error(`- ${envVar}`));
  
  // 为开发环境设置默认值，生产环境直接退出
  if (env !== 'production') {
    console.warn('警告: 在开发环境中使用默认值，生产环境请正确设置这些环境变量');
    
    // 设置默认值
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'dev_jwt_secret_do_not_use_in_production';
      console.warn('已使用开发环境默认 JWT_SECRET');
    }
  } else {
    console.error('在生产环境中必须正确配置所有所需的环境变量');
    process.exit(1);
  }
}

// 导出所有配置
export default {
  // 服务器配置
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT配置
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  
  // API密钥
  googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY,
  
  // Swagger配置
  swaggerEnabled: process.env.SWAGGER_ENABLED === 'true' || env !== 'production',
  swaggerUser: process.env.SWAGGER_USER,
  swaggerPassword: process.env.SWAGGER_PASSWORD,
  
  // 验证配置是否加载成功的辅助函数
  isConfigValid() {
    return !!this.jwtSecret;
  }
}; 