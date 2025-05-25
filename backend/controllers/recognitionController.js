// backend/controllers/recognitionController.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { v4 as uuidv4 } from "uuid";
import * as recognitionService from "../services/recognitionService.js";
import * as visionClientService from "../services/visionClientService.js";
import * as ocrRecordService from "../services/ocrRecordService.js";

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 定义上传目录
const UPLOAD_DIR = path.join(__dirname, "../uploads/recognition");

// 注意：上传目录将在实际需要时按需创建

/**
 * 上传图像文件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const uploadImage = async (req, res) => {
  try {
    console.log("图像上传请求开始", {
      headers: req.headers,
      hasFile: !!req.file,
      body: req.body,
      method: req.method,
      path: req.path,
    });

    if (!req.file) {
      console.error("图像上传失败：没有上传文件");
      return res.status(400).json({
        success: false,
        message: "请上传图像文件",
      });
    }

    // 检查文件类型
    if (!req.file.mimetype.startsWith("image/")) {
      console.error("图像上传失败：文件类型不支持", req.file.mimetype);
      return res.status(400).json({
        success: false,
        message: "只支持图像文件",
      });
    }

    // 生成唯一ID
    const imageId = uuidv4();
    const fileExtension = req.file.originalname.split(".").pop() || "jpg";
    const fileName = `${imageId}.${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // 确保上传目录存在（按需创建）
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // 保存文件
    fs.writeFileSync(filePath, req.file.buffer);

    console.log("图像上传成功", {
      imageId,
      fileName,
      filePath,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: "图像上传成功",
      image_id: imageId,
      file_name: fileName,
    });
  } catch (error) {
    console.error("图像上传处理错误:", error);
    return res.status(500).json({
      success: false,
      message: "服务器处理上传时出错",
      error: error.message,
    });
  }
};

/**
 * 处理图像识别
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const processImage = async (req, res) => {
  try {
    console.log("图像识别请求开始", {
      body: req.body,
      method: req.method,
      path: req.path,
    });

    const { image_id } = req.body;

    if (!image_id) {
      console.error("图像识别失败：没有提供图像ID");
      return res.status(400).json({
        success: false,
        message: "请提供图像ID",
      });
    }

    // 检查上传目录是否存在
    if (!fs.existsSync(UPLOAD_DIR)) {
      console.error("图像识别失败：上传目录不存在", { image_id });
      return res.status(404).json({
        success: false,
        message: "上传目录不存在",
      });
    }

    // 查找图像文件
    const files = fs.readdirSync(UPLOAD_DIR);
    const imageFile = files.find((file) => file.startsWith(image_id));

    if (!imageFile) {
      console.error("图像识别失败：找不到图像文件", { image_id });
      return res.status(404).json({
        success: false,
        message: "找不到图像文件",
      });
    }

    const imagePath = path.join(UPLOAD_DIR, imageFile);

    // 获取环境变量中的API密钥
    const apiKey = process.env.GOOGLE_VISION_API_KEY;

    // 如果服务器端没有配置API密钥，返回错误
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "服务器未配置Google Vision API密钥，请联系管理员",
      });
    }

    // 读取图像文件并转换为Base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    // 调用识别服务 - 使用新的Vision客户端服务
    const startTime = Date.now();
    const result = await visionClientService.recognizeImage(base64Image, apiKey);
    const processingTime = (Date.now() - startTime) / 1000;

    console.log("图像识别完成", {
      image_id,
      processingTime: `${processingTime.toFixed(2)}秒`,
      resultsCount: result.labels.length + result.objects.length,
    });

    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: "图像识别成功",
      processing_time: processingTime,
      results: result,
    });
  } catch (error) {
    console.error("图像识别处理错误:", error);
    return res.status(500).json({
      success: false,
      message: "服务器处理识别时出错",
      error: error.message,
    });
  }
};

/**
 * 获取图像
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const getImage = async (req, res) => {
  try {
    const { image_id } = req.params;

    if (!image_id) {
      console.error("获取图像失败：没有提供图像ID");
      return res.status(400).json({
        success: false,
        message: "请提供图像ID",
      });
    }

    // 检查上传目录是否存在
    if (!fs.existsSync(UPLOAD_DIR)) {
      console.error("获取图像失败：上传目录不存在", { image_id });
      return res.status(404).json({
        success: false,
        message: "上传目录不存在",
      });
    }

    // 查找图像文件
    const files = fs.readdirSync(UPLOAD_DIR);
    const imageFile = files.find((file) => file.startsWith(image_id));

    if (!imageFile) {
      console.error("获取图像失败：找不到图像文件", { image_id });
      return res.status(404).json({
        success: false,
        message: "找不到图像文件",
      });
    }

    const imagePath = path.join(UPLOAD_DIR, imageFile);

    // 发送文件
    return res.sendFile(imagePath);
  } catch (error) {
    console.error("获取图像处理错误:", error);
    return res.status(500).json({
      success: false,
      message: "服务器处理获取图像时出错",
      error: error.message,
    });
  }
};

/**
 * 处理Base64编码的图像识别
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const processBase64Image = async (req, res) => {
  try {
    console.log("Base64图像识别请求开始", {
      headers: req.headers,
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      method: req.method,
      path: req.path,
    });

    const { base64Image } = req.body;

    if (!base64Image) {
      console.error("Base64图像识别失败：没有提供图像数据", {
        body: req.body,
      });
      return res.status(400).json({
        success: false,
        message: "请提供Base64编码的图像数据",
      });
    }

    // 获取环境变量中的API密钥
    const apiKey = process.env.GOOGLE_VISION_API_KEY;

    // 如果服务器端没有配置API密钥，返回错误
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "服务器未配置Google Vision API密钥，请联系管理员",
      });
    }

    // 移除可能存在的base64前缀
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    try {
      // 调用识别服务
      const startTime = Date.now();
      const result = await visionClientService.recognizeImage(base64Data, apiKey);
      const processingTime = (Date.now() - startTime) / 1000;

      console.log("Base64图像识别完成", {
        processingTime: `${processingTime.toFixed(2)}秒`,
        resultsCount: result.labels.length + result.objects.length,
      });

      // 如果用户已登录，记录图像识别到数据库
      if (req.user && req.user.id) {
        try {
          console.log(`尝试为用户 ${req.user.id} 创建图像识别记录`);

          // 准备记录数据
          const recordData = {
            userId: req.user.id,
            filename: "图像识别", // 图像识别没有具体文件名
            fileType: "image",
            pageCount: 1,
            recognitionMode: "image_recognition", // 区别于OCR的识别模式
            language: "auto", // 图像识别不涉及语言
            processingTime: processingTime * 1000, // 转换为毫秒
            textLength: 0, // 图像识别不产生文本
            status: "success",
            extractedText: "", // 图像识别不产生文本
          };

          // 创建记录
          await ocrRecordService.createOcrRecord(recordData);
          console.log(`成功为用户 ${req.user.id} 创建了图像识别记录`);
        } catch (recordError) {
          console.error("创建图像识别记录失败:", recordError);
          // 不影响主要的识别响应，只记录错误
        }
      }

      // 返回成功响应
      return res.status(200).json({
        success: true,
        message: "图像识别成功",
        processing_time: processingTime,
        results: result,
      });
    } catch (apiError) {
      console.error("Vision API调用错误:", apiError);

      // 返回实际错误，不再使用模拟数据
      return res.status(500).json({
        success: false,
        message: "Vision API调用失败",
        error: apiError.message,
      });
    }
  } catch (error) {
    console.error("Base64图像识别处理错误:", error);
    return res.status(500).json({
      success: false,
      message: "服务器处理识别时出错",
      error: error.message,
    });
  }
};

/**
 * 测试接口
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export const testApi = async (req, res) => {
  try {
    console.log("测试接口请求开始");

    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: "测试接口成功",
      data: {
        test: "这是一个测试接口",
      },
    });
  } catch (error) {
    console.error("测试接口处理错误:", error);
    return res.status(500).json({
      success: false,
      message: "服务器处理测试接口时出错",
      error: error.message,
    });
  }
};
