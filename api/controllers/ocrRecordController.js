// api/controllers/ocrRecordController.js
import * as ocrRecordService from '../services/ocrRecordService.js';
import * as userService from '../services/userService.js';

// 创建OCR记录
export const createOcrRecord = async (req, res) => {
  try {
    const { userId, filename, fileType, pageCount, recognitionMode, language, processingTime, textLength } = req.body;
    
    // 验证必填字段
    if (!userId || !filename || !fileType) {
      return res.status(400).json({
        success: false,
        message: '用户ID、文件名和文件类型为必填项'
      });
    }
    
    // 验证用户存在
    const user = await userService.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 创建OCR记录
    const ocrRecord = await ocrRecordService.createOcrRecord({
      userId,
      filename,
      fileType,
      pageCount,
      recognitionMode,
      language,
      processingTime,
      textLength,
      status: 'success'
    });
    
    // 返回成功响应
    res.status(201).json({
      success: true,
      message: 'OCR记录创建成功',
      data: ocrRecord
    });
  } catch (error) {
    console.error('创建OCR记录错误:', error);
    res.status(500).json({
      success: false,
      message: '创建OCR记录失败',
      error: error.message
    });
  }
};

// 获取用户OCR历史记录
export const getUserOcrRecords = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // 验证用户存在
    const user = await userService.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 计算跳过的记录数
    const skip = (page - 1) * limit;
    
    // 获取OCR记录
    const ocrRecords = await ocrRecordService.getUserOcrRecords(userId, limit, skip);
    
    // 返回结果
    res.status(200).json({
      success: true,
      data: ocrRecords
    });
  } catch (error) {
    console.error('获取OCR记录错误:', error);
    res.status(500).json({
      success: false,
      message: '获取OCR记录失败',
      error: error.message
    });
  }
};

// 获取用户OCR统计摘要
export const getUserOcrSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 验证用户存在
    const user = await userService.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 获取统计摘要
    const summary = await ocrRecordService.getUserOcrSummary(userId);
    
    // 返回结果
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('获取OCR统计摘要错误:', error);
    res.status(500).json({
      success: false,
      message: '获取OCR统计摘要失败',
      error: error.message
    });
  }
}; 