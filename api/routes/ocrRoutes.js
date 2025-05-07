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

// 文件上传和OCR处理 - 简化版
router.post('/process', upload.single('file'), ocrController.processSimple);

// 获取支持的语言列表
router.get('/languages', ocrController.getSupportedLanguages);

export default router; 