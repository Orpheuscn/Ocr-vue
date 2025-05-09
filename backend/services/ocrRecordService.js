import OcrRecord from '../models/OcrRecord.js';
import { updateUserOcrStats } from './userService.js';

// 创建OCR记录
export const createOcrRecord = async (recordData) => {
  try {
    // 准备记录数据
    const recordDetails = {
      userId: recordData.userId,
      filename: recordData.filename,
      fileType: recordData.fileType,
      pageCount: recordData.pageCount || 1,
      recognitionMode: recordData.recognitionMode || 'text',
      language: recordData.language || 'auto',
      processingTime: recordData.processingTime || 0,
      status: recordData.status || 'success',
      textLength: recordData.textLength || 0,
      extractedText: recordData.extractedText || ''
    };
    
    // 使用Sequelize创建记录
    const newRecord = await OcrRecord.create(recordDetails);
    
    // 更新用户OCR统计
    const imageCount = recordData.fileType === 'image' ? 1 : 0;
    const pdfPageCount = recordData.fileType === 'pdf' ? recordData.pageCount : 0;
    
    await updateUserOcrStats(recordData.userId, {
      imageCount,
      pdfPageCount
    });
    
    return newRecord;
  } catch (error) {
    throw error;
  }
};

// 获取用户OCR记录
export const getUserOcrRecords = async (userId, limit = 20, skip = 0) => {
  try {
    // 使用Sequelize分页查询
    const { count, rows } = await OcrRecord.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      offset: skip,
      limit: limit
    });
    
    return {
      records: rows,
      total: count,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(count / limit)
    };
  } catch (error) {
    throw error;
  }
};

// 获取指定记录
export const getOcrRecordById = async (recordId) => {
  try {
    // 使用Sequelize查询记录
    return await OcrRecord.findByPk(recordId);
  } catch (error) {
    throw error;
  }
};

// 获取用户OCR统计摘要
export const getUserOcrSummary = async (userId) => {
  try {
    // 使用Sequelize查询记录
    const records = await OcrRecord.findAll({
      where: { userId }
    });
    
    // 计算统计信息
    const summary = {
      totalRecords: records.length,
      imagesProcessed: records.filter(r => r.fileType === 'image').length,
      pdfsProcessed: records.filter(r => r.fileType === 'pdf').length,
      totalPages: records.reduce((sum, record) => sum + record.pageCount, 0),
      textMode: records.filter(r => r.recognitionMode === 'text').length,
      tableMode: records.filter(r => r.recognitionMode === 'table').length,
      mixedMode: records.filter(r => r.recognitionMode === 'mixed').length,
      averageProcessingTime: 0,
      successRate: 0
    };
    
    if (records.length > 0) {
      const totalProcessingTime = records.reduce((sum, record) => sum + record.processingTime, 0);
      summary.averageProcessingTime = totalProcessingTime / records.length;
      
      const successfulRecords = records.filter(r => r.status === 'success').length;
      summary.successRate = (successfulRecords / records.length) * 100;
    }
    
    return summary;
  } catch (error) {
    throw error;
  }
}; 