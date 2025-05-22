import OcrRecord from "../models/OcrRecord.js";
import { updateUserOcrStats } from "./userService.js";

import { checkConnection } from "../db/config.js";

// 创建OCR记录
export const createOcrRecord = async (recordData) => {
  try {
    console.log('开始创建OCR记录，原始userId:', recordData.userId, '类型:', typeof recordData.userId);
    
    // 检查数据库连接状态
    console.log('检查数据库连接状态...');
    const isConnected = await checkConnection();
    if (!isConnected) {
      throw new Error('数据库连接失败，无法创建OCR记录');
    }
    console.log('数据库连接正常，继续创建OCR记录');
    
    // 检查userId是否存在
    if (!recordData.userId) {
      throw new Error('用户ID不能为空');
    }
    
    // 确俞userId是字符串类型
    const userIdStr = recordData.userId.toString();
    console.log('转换后的userIdStr:', userIdStr);

    // 准备记录数据
    const recordDetails = {
      userId: userIdStr,
      filename: recordData.filename,
      fileType: recordData.fileType,
      pageCount: recordData.pageCount || 1,
      recognitionMode: recordData.recognitionMode || "text",
      language: recordData.language || "auto",
      processingTime: recordData.processingTime || 0,
      status: recordData.status || "success",
      textLength: recordData.textLength || 0,
      extractedText: recordData.extractedText || "",
    };
    
    console.log('已准备记录数据:', JSON.stringify(recordDetails));

    // 使用Mongoose创建记录
    console.log('尝试创建MongoDB记录...');
    const newRecord = await OcrRecord.create(recordDetails);
    console.log('成功创建MongoDB记录，记录ID:', newRecord._id);

    // 更新用户OCR统计
    const imageCount = recordData.fileType === "image" ? 1 : 0;
    const pdfPageCount = recordData.fileType === "pdf" ? recordData.pageCount : 0;

    console.log('尝试更新用户OCR统计...');
    try {
      await updateUserOcrStats(userIdStr, {
        imageCount,
        pdfPageCount,
      });
      console.log('成功更新用户OCR统计');
    } catch (statsError) {
      console.error('更新用户OCR统计失败，但记录已创建:', {
        error: statsError.message,
        userId: userIdStr
      });
      // 不抛出错误，因为记录已经创建成功
    }

    return newRecord;
  } catch (error) {
    console.error('创建OCR记录失败，详细错误:', {
      message: error.message,
      stack: error.stack,
      userId: recordData.userId,
      filename: recordData.filename
    });
    throw error;
  }
};

// 获取用户OCR记录
export const getUserOcrRecords = async (userId, limit = 20, skip = 0) => {
  try {
    // 确保userId是字符串类型
    const userIdStr = userId.toString();

    // 使用Mongoose分页查询
    const total = await OcrRecord.countDocuments({ userId: userIdStr });
    const records = await OcrRecord.find({ userId: userIdStr })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      records,
      total,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw error;
  }
};

// 获取指定记录
export const getOcrRecordById = async (recordId) => {
  try {
    // 使用Mongoose查询记录
    return await OcrRecord.findById(recordId);
  } catch (error) {
    throw error;
  }
};

// 获取用户OCR统计摘要
export const getUserOcrSummary = async (userId) => {
  try {
    // 确保userId是字符串类型
    const userIdStr = userId.toString();

    // 使用Mongoose查询记录
    const records = await OcrRecord.find({ userId: userIdStr });

    // 计算统计信息
    const summary = {
      totalRecords: records.length,
      imagesProcessed: records.filter((r) => r.fileType === "image").length,
      pdfsProcessed: records.filter((r) => r.fileType === "pdf").length,
      totalPages: records.reduce((sum, record) => sum + record.pageCount, 0),
      textMode: records.filter((r) => r.recognitionMode === "text").length,
      tableMode: records.filter((r) => r.recognitionMode === "table").length,
      mixedMode: records.filter((r) => r.recognitionMode === "mixed").length,
      averageProcessingTime: 0,
      successRate: 0,
    };

    if (records.length > 0) {
      const totalProcessingTime = records.reduce((sum, record) => sum + record.processingTime, 0);
      summary.averageProcessingTime = totalProcessingTime / records.length;

      const successfulRecords = records.filter((r) => r.status === "success").length;
      summary.successRate = (successfulRecords / records.length) * 100;
    }

    return summary;
  } catch (error) {
    throw error;
  }
};
