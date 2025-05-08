// api/routes/ocrRecordRoutes.js
import express from 'express';
import * as ocrRecordController from '../controllers/ocrRecordController.js';

const router = express.Router();

// 创建OCR记录
router.post('/', ocrRecordController.createOcrRecord);

// 获取用户OCR历史记录
router.get('/user/:userId', ocrRecordController.getUserOcrRecords);

// 获取用户OCR统计摘要
router.get('/user/:userId/summary', ocrRecordController.getUserOcrSummary);

export default router; 