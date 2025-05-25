// api/controllers/ocrController.js
import * as ocrService from "../services/ocrService.js";
import { fileTypeFromBuffer } from "file-type";
import * as ocrRecordService from "../services/ocrRecordService.js";
import mongoose from "mongoose";

// 简化版OCR处理 - 使用服务器端API密钥
export const processSimple = async (req, res) => {
  try {
    console.log("OCR处理请求开始", {
      headers: req.headers,
      hasFile: !!req.file,
      body: req.body,
      method: req.method,
      path: req.path,
      csrfToken: req.headers["x-csrf-token"] || req.body._csrf || "未提供",
    });

    if (!req.file) {
      console.error("OCR处理失败：没有上传文件");
      return res.status(400).json({
        success: false,
        message: "请上传图像文件",
      });
    }

    // 获取环境变量中的API密钥
    const serverApiKey = process.env.GOOGLE_VISION_API_KEY;

    // 如果服务器端没有配置API密钥，返回错误
    if (!serverApiKey) {
      return res.status(500).json({
        success: false,
        message: "服务器未配置Google Vision API密钥，请联系管理员",
      });
    }

    // 获取参数
    const { languageHints = [], recognitionMode = "text" } = req.body;

    // 从认证中间件提供的req.user中获取用户ID
    // 这样可以确保用户ID是经过认证的有效ID
    const userId = req.user ? req.user.id || req.user._id : null;

    console.log("当前请求的用户认证信息:", {
      hasUser: !!req.user,
      userId: userId,
      userObject: req.user ? JSON.stringify(req.user) : "无用户对象",
      authHeader: req.headers.authorization ? "存在" : "不存在",
      cookies: req.cookies ? Object.keys(req.cookies).join(", ") : "无cookies",
    });

    // 检测文件类型
    const fileBuffer = req.file.buffer;
    const fileType = await fileTypeFromBuffer(fileBuffer);
    const mimeType = fileType ? fileType.mime : req.file.mimetype;

    // 检查是否为图像文件
    if (!mimeType.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "仅支持图像文件，暂不支持PDF",
      });
    }

    // 转换为Base64并进行OCR识别
    const base64Data = fileBuffer.toString("base64");
    const startTime = Date.now();

    try {
      // 使用服务器端API密钥调用Google Vision API
      const result = await ocrService.performOcr(
        base64Data,
        serverApiKey,
        languageHints,
        recognitionMode
      );

      const processingTime = Date.now() - startTime;
      const textLength = result.originalFullText ? result.originalFullText.length : 0;

      // 如果提供了用户ID，则创建OCR记录
      if (userId) {
        try {
          console.log(`尝试为用户 ${userId} 创建OCR记录，用户ID类型: ${typeof userId}`);

          // 确保文件名使用正确的UTF-8编码
          const originalFilename = req.file.originalname || "未命名图片";

          // 准备记录数据并记录日志
          const recordData = {
            userId,
            filename: originalFilename,
            fileType: "image",
            pageCount: 1,
            recognitionMode,
            language: result.detectedLanguageCode || "auto",
            processingTime,
            textLength,
            status: "success",
          };

          console.log("准备创建OCR记录，数据:", JSON.stringify(recordData));

          // 创建OCR记录
          const newRecord = await ocrRecordService.createOcrRecord(recordData);

          console.log(
            `成功为用户 ${userId} 创建了OCR记录，记录ID: ${newRecord ? newRecord._id : "未返回ID"}`
          );
        } catch (recordError) {
          console.error("创建OCR记录失败:", {
            error: recordError.message,
            stack: recordError.stack,
            userId,
            filename: req.file.originalname,
            recognitionMode,
            language: result.detectedLanguageCode || "auto",
          });
          // 不中断主流程，继续返回OCR结果
        }
      } else {
        console.warn("未能创建OCR记录: 用户ID不存在", {
          hasUser: !!req.user,
          reqUserId: req.user ? req.user.id : null,
          authHeader: req.headers.authorization ? "存在" : "不存在",
        });
      }

      // 构建响应数据
      const responseData = {
        success: true,
        // 返回完整的OCR结果
        data: {
          ocrRawResult: result.ocrRawResult,
          fullTextAnnotation: result.fullTextAnnotation,
          originalFullText: result.originalFullText || "",
          detectedLanguageCode: result.detectedLanguageCode || "und",
          symbolsData: result.symbolsData || [],
        },
        // 兼容旧格式
        ocrRawResult: result.ocrRawResult,
        fullTextAnnotation: result.fullTextAnnotation,
        text: result.originalFullText || "",
        language: result.detectedLanguageCode || "und",
        symbolsData: result.symbolsData || [],
      };

      console.log("OCR处理成功", {
        textLength: (result.originalFullText || "").length,
        language: result.detectedLanguageCode || "und",
        processingTime: Date.now() - startTime,
      });

      res.json(responseData);
    } catch (ocrError) {
      // OCR处理错误
      console.error("OCR识别错误:", ocrError);
      return res.status(500).json({
        success: false,
        message: "识别文本时出错",
        error: ocrError.message,
      });
    }
  } catch (error) {
    console.error("处理文件错误:", error);

    // 检查是否为CSRF错误
    if (error.message && error.message.includes("CSRF")) {
      console.error("CSRF验证失败:", error);
      return res.status(403).json({
        success: false,
        message: "CSRF验证失败，请刷新页面后重试",
        error: "CSRF_VALIDATION_FAILED",
      });
    }

    res.status(500).json({
      success: false,
      message: "处理文件时出错",
      error: error.message,
    });
  }
};

// 处理上传的文件
export const processFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "请上传文件",
      });
    }

    const { apiKey, languageHints = [], recognitionMode = "text", userId } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "缺少API密钥",
      });
    }

    // 检测文件类型
    const fileBuffer = req.file.buffer;
    const fileType = await fileTypeFromBuffer(fileBuffer);
    const mimeType = fileType ? fileType.mime : req.file.mimetype;
    const startTime = Date.now();
    let result;
    let filePageCount = 1;

    if (mimeType === "application/pdf") {
      // 处理PDF文件
      result = await ocrService.processPdf(fileBuffer, apiKey, languageHints, 1, recognitionMode);
      // 获取PDF页面数量
      filePageCount = result.totalPages || 1;
    } else if (mimeType.startsWith("image/")) {
      // 处理图像文件
      const base64Data = fileBuffer.toString("base64");
      result = await ocrService.performOcr(base64Data, apiKey, languageHints, recognitionMode);
    } else {
      return res.status(400).json({
        success: false,
        message: "不支持的文件类型",
      });
    }

    const processingTime = Date.now() - startTime;

    // 如果用户已经登录（有效的req.user），则创建OCR记录
    if (userId) {
      console.log(`尝试为用户 ${userId} 创建OCR记录...`);
      try {
        const fileType = mimeType === "application/pdf" ? "pdf" : "image";
        const textLength = result.fullTextAnnotation?.text?.length || 0;

        // 确保文件名使用正确的UTF-8编码
        const originalFilename =
          req.file.originalname || `未命名${fileType === "pdf" ? "PDF" : "图片"}`;

        console.log(
          `准备OCR记录数据: 用户ID=${userId}, 文件名=${originalFilename}, 文件类型=${fileType}, 页数=${filePageCount}`
        );

        // 确保用户ID是字符串类型
        const userIdStr = userId.toString();

        const recordData = {
          userId: userIdStr, // 使用字符串类型的用户ID
          filename: originalFilename,
          fileType,
          pageCount: filePageCount,
          recognitionMode,
          language: result.detectedLanguage || "auto",
          processingTime,
          textLength,
          status: "success",
          // 添加提取的文本内容，最多保存前1000个字符
          extractedText: (result.fullTextAnnotation?.text || "").substring(0, 1000),
          createdAt: new Date(),
        };

        console.log(`调用ocrRecordService.createOcrRecord创建OCR记录...`);
        console.log(`完整的记录数据:`, JSON.stringify(recordData));

        try {
          const newRecord = await ocrRecordService.createOcrRecord(recordData);
          console.log(
            `OCR记录创建成功: ID=${
              newRecord._id || newRecord.id
            }, 用户ID=${userIdStr}, 文件类型=${fileType}, 页数=${filePageCount}`
          );
        } catch (dbError) {
          console.error(`数据库操作失败: ${dbError.message}`);
          console.error(`数据库错误详情:`, dbError);

          // 尝试直接使用MongoDB原生操作插入记录
          try {
            const db = mongoose.connection.db;
            const collection = db.collection("ocrrecords");
            const insertResult = await collection.insertOne(recordData);
            console.log(`使用原生操作插入成功: ${insertResult.insertedId}`);
          } catch (nativeError) {
            console.error(`原生操作也失败: ${nativeError.message}`);
          }
        }
      } catch (recordError) {
        console.error(
          `创建OCR记录失败 (用户ID: ${userId}): 错误类型: ${recordError.name}, 错误消息: ${recordError.message}`
        );
        console.error(`错误详情:`, recordError);
        // 不中断主流程，继续返回OCR结果
      }
    } else {
      console.log(`未提供用户ID（用户可能未登录），不创建OCR记录`);
    }

    res.json({
      success: true,
      data: result,
      fileType: mimeType,
    });
  } catch (error) {
    console.error("处理文件错误:", error);
    res.status(500).json({
      success: false,
      message: "处理文件时出错",
      error: error.message,
    });
  }
};

// 处理Base64编码的图像
export const processBase64Image = async (req, res) => {
  try {
    const { image, apiKey, languageHints = [], recognitionMode = "text" } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "缺少图像数据",
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "缺少API密钥",
      });
    }

    // 移除可能存在的base64前缀
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const result = await ocrService.performOcr(base64Data, apiKey, languageHints, recognitionMode);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("处理Base64图像错误:", error);
    res.status(500).json({
      success: false,
      message: "处理图像时出错",
      error: error.message,
    });
  }
};

// 处理PDF文件
export const processPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "请上传PDF文件",
      });
    }

    const { apiKey, languageHints = [], pageNumber = 1, recognitionMode = "text" } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "缺少API密钥",
      });
    }

    const pdfBuffer = req.file.buffer;

    // 处理PDF文件
    const result = await ocrService.processPdf(
      pdfBuffer,
      apiKey,
      languageHints,
      parseInt(pageNumber, 10),
      recognitionMode
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("处理PDF错误:", error);
    res.status(500).json({
      success: false,
      message: "处理PDF文件时出错",
      error: error.message,
    });
  }
};

// 获取PDF页面
export const getPdfPage = async (req, res) => {
  try {
    const { pdfData, pageNumber = 1, scale = 1.5 } = req.body;

    if (!pdfData) {
      return res.status(400).json({
        success: false,
        message: "缺少PDF数据",
      });
    }

    // Base64解码PDF数据
    const pdfBuffer = Buffer.from(pdfData, "base64");

    // 渲染PDF页面
    const result = await ocrService.renderPdfPage(
      pdfBuffer,
      parseInt(pageNumber, 10),
      parseFloat(scale)
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("获取PDF页面错误:", error);
    res.status(500).json({
      success: false,
      message: "渲染PDF页面时出错",
      error: error.message,
    });
  }
};

// 获取支持的语言列表
export const getSupportedLanguages = (req, res) => {
  try {
    const languages = ocrService.getLanguages();
    res.json({
      success: true,
      data: languages,
    });
  } catch (error) {
    console.error("获取语言列表错误:", error);
    res.status(500).json({
      success: false,
      message: "获取语言列表时出错",
      error: error.message,
    });
  }
};

// 应用图像过滤器
export const applyFilters = async (req, res) => {
  try {
    const { ocrResult, filters } = req.body;

    if (!ocrResult) {
      return res.status(400).json({
        success: false,
        message: "缺少OCR结果数据",
      });
    }

    if (!filters) {
      return res.status(400).json({
        success: false,
        message: "缺少过滤器设置",
      });
    }

    const result = await ocrService.applyFilters(ocrResult, filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("应用过滤器错误:", error);
    res.status(500).json({
      success: false,
      message: "应用过滤器时出错",
      error: error.message,
    });
  }
};

// 设置识别方向
export const setRecognitionDirection = async (req, res) => {
  try {
    const { direction, ocrResult } = req.body;

    if (!direction) {
      return res.status(400).json({
        success: false,
        message: "缺少识别方向",
      });
    }

    if (!ocrResult) {
      return res.status(400).json({
        success: false,
        message: "缺少OCR结果数据",
      });
    }

    const result = await ocrService.setRecognitionDirection(ocrResult, direction);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("设置识别方向错误:", error);
    res.status(500).json({
      success: false,
      message: "设置识别方向时出错",
      error: error.message,
    });
  }
};

// 设置显示模式
export const setDisplayMode = async (req, res) => {
  try {
    const { mode, ocrResult } = req.body;

    if (!mode) {
      return res.status(400).json({
        success: false,
        message: "缺少显示模式",
      });
    }

    if (!ocrResult) {
      return res.status(400).json({
        success: false,
        message: "缺少OCR结果数据",
      });
    }

    const result = await ocrService.setDisplayMode(ocrResult, mode);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("设置显示模式错误:", error);
    res.status(500).json({
      success: false,
      message: "设置显示模式时出错",
      error: error.message,
    });
  }
};

// 应用表格设置
export const setTableSettings = async (req, res) => {
  try {
    const { settings, ocrResult } = req.body;

    if (!settings) {
      return res.status(400).json({
        success: false,
        message: "缺少表格设置",
      });
    }

    if (!ocrResult) {
      return res.status(400).json({
        success: false,
        message: "缺少OCR结果数据",
      });
    }

    const result = await ocrService.setTableSettings(ocrResult, settings);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("应用表格设置错误:", error);
    res.status(500).json({
      success: false,
      message: "应用表格设置时出错",
      error: error.message,
    });
  }
};

// 应用遮罩
export const applyMasks = async (req, res) => {
  try {
    const { image, masks, dimensions } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "缺少图像数据",
      });
    }

    if (!masks || !Array.isArray(masks) || masks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "缺少遮罩数据",
      });
    }

    if (!dimensions) {
      return res.status(400).json({
        success: false,
        message: "缺少图像尺寸信息",
      });
    }

    const maskedImage = await ocrService.applyMasks(image, masks, dimensions);

    res.json({
      success: true,
      data: {
        maskedImage,
      },
    });
  } catch (error) {
    console.error("应用遮罩错误:", error);
    res.status(500).json({
      success: false,
      message: "应用遮罩时出错",
      error: error.message,
    });
  }
};
