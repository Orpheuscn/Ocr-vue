// api/server.js
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ocrRoutes from './routes/ocrRoutes.js';
import userRoutes from './routes/userRoutes.js';
import connectDB from './db/config.js'; // 导入数据库连接函数
import { setUseMemoryDB } from './services/userService.js'; // 导入设置内存DB的函数

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 连接到数据库
(async () => {
  try {
    const isConnected = await connectDB();
    // 根据连接结果设置是否使用内存数据库
    setUseMemoryDB(!isConnected);
  } catch (error) {
    console.error('数据库初始化错误:', error);
    // 出错时使用内存数据库
    setUseMemoryDB(true);
  }
})();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 增加限制以处理大型图像
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 路由
app.use('/api/ocr', ocrRoutes);
app.use('/api/users', userRoutes);

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
});

export default app; 