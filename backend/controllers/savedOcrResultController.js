import { SavedOcrResult } from "../models/index.js";

/**
 * 获取用户保存的OCR结果列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const getSavedResults = async (req, res) => {
  try {
    // 从请求中获取用户ID
    const userId = req.user.id;

    // 查询该用户的所有保存结果，按创建时间降序排列
    const results = await SavedOcrResult.find({ userId }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error("获取保存的OCR结果失败:", error);
    return res.status(500).json({
      success: false,
      message: "获取保存的OCR结果失败",
      error: error.message,
    });
  }
};

/**
 * 保存新的OCR结果
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const saveResult = async (req, res) => {
  try {
    // 从请求中获取用户ID和OCR结果数据
    const userId = req.user.id;
    const { text, language, languageName } = req.body;

    // 验证必要字段
    if (!text) {
      return res.status(400).json({
        success: false,
        message: "文本内容不能为空",
      });
    }

    // 创建预览文本
    const preview = text.substring(0, 100) + (text.length > 100 ? "..." : "");

    // 计算单词和字符数量
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const charCount = text.length;

    // 创建新的保存结果
    const newResult = new SavedOcrResult({
      userId,
      text,
      language: language || "und",
      languageName: languageName || "未知语言",
      preview,
      wordCount,
      charCount,
    });

    // 保存到数据库
    await newResult.save();

    return res.status(201).json({
      success: true,
      message: "OCR结果保存成功",
      data: newResult,
    });
  } catch (error) {
    console.error("保存OCR结果失败:", error);
    return res.status(500).json({
      success: false,
      message: "保存OCR结果失败",
      error: error.message,
    });
  }
};

/**
 * 获取单个保存的OCR结果
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const getResultById = async (req, res) => {
  try {
    const userId = req.user.id;
    const resultId = req.params.id;

    // 查找指定ID的结果，并确保它属于当前用户
    const result = await SavedOcrResult.findOne({
      _id: resultId,
      userId,
    }).lean();

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "未找到指定的OCR结果",
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("获取OCR结果详情失败:", error);
    return res.status(500).json({
      success: false,
      message: "获取OCR结果详情失败",
      error: error.message,
    });
  }
};

/**
 * 删除保存的OCR结果
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const deleteResult = async (req, res) => {
  try {
    const userId = req.user.id;
    const resultId = req.params.id;

    // 查找并删除指定ID的结果，确保它属于当前用户
    const result = await SavedOcrResult.findOneAndDelete({
      _id: resultId,
      userId,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "未找到指定的OCR结果",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OCR结果已删除",
    });
  } catch (error) {
    console.error("删除OCR结果失败:", error);
    return res.status(500).json({
      success: false,
      message: "删除OCR结果失败",
      error: error.message,
    });
  }
};

/**
 * 清除用户所有保存的OCR结果
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const clearAllResults = async (req, res) => {
  try {
    const userId = req.user.id;

    // 删除该用户的所有保存结果
    const result = await SavedOcrResult.deleteMany({ userId });

    return res.status(200).json({
      success: true,
      message: "所有OCR结果已清除",
      count: result.deletedCount,
    });
  } catch (error) {
    console.error("清除所有OCR结果失败:", error);
    return res.status(500).json({
      success: false,
      message: "清除所有OCR结果失败",
      error: error.message,
    });
  }
};
