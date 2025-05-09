// api/routes/ocrRoutes.js
import express from 'express';
import * as ocrController from '../controllers/ocrController.js';
import multer from 'multer';

// 配置multer用于文件上传处理
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 限制50MB
});

const router = express.Router();

// 获取API密钥状态
router.get('/apiStatus', (req, res) => {
  // 检查环境变量中是否有Google Vision API密钥
  const hasApiKey = !!process.env.GOOGLE_VISION_API_KEY;
  
  res.json({
    success: true,
    data: {
      apiAvailable: hasApiKey,
      // 如果有API密钥，返回部分密钥作为确认（安全处理）
      keyPrefix: hasApiKey ? process.env.GOOGLE_VISION_API_KEY.substring(0, 8) + '...' : null
    }
  });
});

// 文件上传和OCR处理 - 简化版
router.post('/process', upload.single('file'), ocrController.processSimple);

// 获取支持的语言列表
router.get('/languages', ocrController.getSupportedLanguages);

export default router; 