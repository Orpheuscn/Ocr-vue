// api/test-server.js
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 8080;

// 提供静态文件
app.use(express.static(__dirname));

// 处理根路径请求，返回测试页面
app.get('/', (req, res) => {
  res.sendFile(resolve(__dirname, 'test-ocr.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`测试服务器运行在 http://localhost:${PORT}`);
}); 