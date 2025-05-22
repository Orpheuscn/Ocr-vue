import { SavedOcrResult, User, Notification } from "../models/index.js";
import { createNotification } from "./notificationController.js";

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

/**
 * 发布OCR结果
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const publishResult = async (req, res) => {
  try {
    const userId = req.user.id;
    const resultId = req.params.id;

    // 检查ID是否有效
    if (!resultId) {
      console.error("发布OCR结果失败: 无效的ID", resultId);
      return res.status(400).json({
        success: false,
        message: "无效的OCR结果ID",
      });
    }

    console.log(`尝试发布OCR结果: 用户ID=${userId}, 结果ID=${resultId}`);

    // 查找指定ID的结果，并确保它属于当前用户
    try {
      const result = await SavedOcrResult.findOne({
        _id: resultId,
        userId,
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "未找到指定的OCR结果",
        });
      }

      // 检查是否已经发布
      if (result.isPublic && result.publishStatus === "published") {
        return res.status(400).json({
          success: false,
          message: "该OCR结果已发布",
        });
      }

      // 如果已被管理员移除，不允许再次发布
      if (result.publishStatus === "removed") {
        return res.status(400).json({
          success: false,
          message: "该OCR结果已被管理员移除，无法发布",
        });
      }

      // 更新状态为已发布
      result.isPublic = true;
      result.publishStatus = "published";
      result.publishedAt = new Date();
      await result.save();

      console.log(`OCR结果发布成功: ID=${resultId}`);
      return res.status(200).json({
        success: true,
        message: "OCR结果已成功发布",
        data: result,
      });
    } catch (findError) {
      console.error("查找OCR结果失败:", findError);
      return res.status(500).json({
        success: false,
        message: "查找OCR结果失败",
        error: findError.message,
      });
    }
  } catch (error) {
    console.error("发布OCR结果失败:", error);
    return res.status(500).json({
      success: false,
      message: "发布OCR结果失败",
      error: error.message,
    });
  }
};

/**
 * 获取已发布的OCR结果列表（公开访问）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const getPublishedResults = async (req, res) => {
  try {
    console.log("获取已发布的OCR结果列表，请求路径:", req.path, "查询参数:", req.query);

    // 获取分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // 获取搜索参数
    const search = req.query.search || "";

    // 构建查询条件
    const query = {
      isPublic: true,
      publishStatus: "published",
      publishedAt: { $ne: null },
    };

    // 如果有搜索关键词，添加文本搜索条件
    if (search) {
      query.$or = [
        { text: { $regex: search, $options: "i" } },
        { preview: { $regex: search, $options: "i" } },
      ];
    }

    console.log("查询条件:", JSON.stringify(query));

    // 查询已发布的结果
    const results = await SavedOcrResult.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "username email")
      .lean();

    // 处理结果，添加用户名和确保id字段存在
    const processedResults = results.map((result) => {
      // 确保结果有id字段
      if (!result.id && result._id) {
        console.log("为结果添加id字段:", result._id.toString());
        result.id = result._id.toString();
      }

      return {
        ...result,
        username: result.userId ? result.userId.username || result.userId.email : "未知用户",
      };
    });

    console.log("查询到的结果数量:", results.length);

    // 获取总数
    const total = await SavedOcrResult.countDocuments(query);
    console.log("符合条件的总结果数:", total);

    // 计算总页数
    const totalPages = Math.ceil(total / limit);
    console.log("返回已发布结果，当前页:", page, "总页数:", totalPages);

    return res.status(200).json({
      success: true,
      data: processedResults,
      count: processedResults.length,
      total,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("获取已发布的OCR结果失败:", error);
    return res.status(500).json({
      success: false,
      message: "获取已发布的OCR结果失败",
      error: error.message,
    });
  }
};

/**
 * 获取被标记的OCR结果列表（仅管理员）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const getFlaggedResults = async (req, res) => {
  try {
    // 检查用户是否为管理员
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "权限不足，仅管理员可访问",
      });
    }

    // 获取分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const query = { publishStatus: "flagged" };

    // 查询被标记的结果
    const results = await SavedOcrResult.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "username email")
      .lean();

    // 处理结果，添加用户名和确保id字段存在
    const processedResults = results.map((result) => {
      // 确保结果有id字段
      if (!result.id && result._id) {
        result.id = result._id.toString();
      }

      return {
        ...result,
        username: result.userId ? result.userId.username || result.userId.email : "未知用户",
      };
    });

    // 获取总数
    const total = await SavedOcrResult.countDocuments(query);

    // 计算总页数
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: processedResults,
      count: processedResults.length,
      total,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("获取被标记的OCR结果失败:", error);
    return res.status(500).json({
      success: false,
      message: "获取被标记的OCR结果失败",
      error: error.message,
    });
  }
};

/**
 * 获取已移除的OCR结果列表（仅管理员）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const getRemovedResults = async (req, res) => {
  try {
    // 检查用户是否为管理员
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "权限不足，仅管理员可访问",
      });
    }

    // 获取分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const query = { publishStatus: "removed" };

    // 查询已移除的结果
    const results = await SavedOcrResult.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "username email")
      .lean();

    // 处理结果，添加用户名和确保id字段存在
    const processedResults = results.map((result) => {
      // 确保结果有id字段
      if (!result.id && result._id) {
        result.id = result._id.toString();
      }

      return {
        ...result,
        username: result.userId ? result.userId.username || result.userId.email : "未知用户",
      };
    });

    // 获取总数
    const total = await SavedOcrResult.countDocuments(query);

    // 计算总页数
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: processedResults,
      count: processedResults.length,
      total,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("获取已移除的OCR结果失败:", error);
    return res.status(500).json({
      success: false,
      message: "获取已移除的OCR结果失败",
      error: error.message,
    });
  }
};

/**
 * 审核OCR结果（仅管理员）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const reviewResult = async (req, res) => {
  try {
    // 检查用户是否为管理员
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "权限不足，仅管理员可审核",
      });
    }

    const resultId = req.params.id;
    const { action, note } = req.body;

    // 验证操作类型
    if (action !== "keep" && action !== "flag" && action !== "remove") {
      return res.status(400).json({
        success: false,
        message: "无效的操作类型，必须是 'keep'、'flag' 或 'remove'",
      });
    }

    // 查找指定ID的结果
    const result = await SavedOcrResult.findById(resultId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "未找到指定的OCR结果",
      });
    }

    // 更新状态
    if (action === "keep") {
      // 保持发布状态，不做改变
      result.reviewedBy = req.user.id;
      result.reviewNote = note || "管理员已审核并保留此内容";
    } else if (action === "flag") {
      // 标记为需要注意的内容
      result.publishStatus = "flagged";
      result.reviewedBy = req.user.id;
      result.reviewNote = note || "管理员已标记此内容";
    } else if (action === "remove") {
      // 移除内容
      result.isPublic = false;
      result.publishStatus = "removed";
      result.reviewedBy = req.user.id;
      result.reviewNote = note || "管理员已移除此内容";
    }

    await result.save();

    // 查找用户信息，用于发送通知
    const user = await User.findById(result.userId);

    // 如果找到用户，发送通知
    if (user) {
      try {
        let notificationTitle = "";
        let notificationMessage = "";
        let notificationType = "info";

        if (action === "keep") {
          notificationTitle = "内容审核通过";
          notificationMessage = "您发布的OCR结果已通过审核，将继续公开显示。";
          notificationType = "success";
        } else if (action === "flag") {
          notificationTitle = "内容已被标记";
          notificationMessage = "您发布的OCR结果已被管理员标记，但仍然可见。";
          notificationType = "warning";
        } else if (action === "remove") {
          notificationTitle = "内容已被移除";
          notificationMessage = "您发布的OCR结果已被管理员移除，不再公开显示。";
          notificationType = "error";
        }

        // 如果有审核备注，添加到通知消息中
        if (note) {
          notificationMessage += ` 管理员备注: ${note}`;
        }

        // 创建通知
        await createNotification({
          userId: result.userId,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          resourceId: result._id,
          resourceType: "SavedOcrResult",
          link: "/saved-results",
        });

        console.log(`已向用户 ${user.username} 发送审核结果通知`);
      } catch (notificationError) {
        console.error("发送通知失败:", notificationError);
      }
    }

    // 根据操作类型返回不同的消息
    let message = "";
    if (action === "keep") {
      message = "OCR结果已审核并保留";
    } else if (action === "flag") {
      message = "OCR结果已被标记";
    } else if (action === "remove") {
      message = "OCR结果已被移除";
    }

    return res.status(200).json({
      success: true,
      message,
      data: result,
    });
  } catch (error) {
    console.error("审核OCR结果失败:", error);
    return res.status(500).json({
      success: false,
      message: "审核OCR结果失败",
      error: error.message,
    });
  }
};
