// backend/services/visionClientService.js
import { Buffer } from "buffer";
import fetchWithProxy from "../utils/fetchHelper.js";

// Google Cloud Vision API URL
const API_URL = "https://vision.googleapis.com/v1/images:annotate";

/**
 * 识别图像中的物体和场景
 * @param {string} base64Image - Base64编码的图像数据
 * @param {string} apiKey - Google Cloud Vision API密钥
 * @returns {Promise<Object>} - 识别结果对象
 */
export async function recognizeImage(base64Image, apiKey) {
  if (!apiKey) throw new Error("API Key is missing");
  if (!base64Image) throw new Error("Base64 image data is missing");

  try {
    console.log(`开始图像识别请求`);
    console.log(`API密钥前缀: ${apiKey.substring(0, 8)}...`);

    const apiUrl = `${API_URL}?key=${apiKey}`;
    console.log(`API URL: ${API_URL}`);

    // 构建请求体，包含LABEL_DETECTION和OBJECT_LOCALIZATION特性
    const requestBody = {
      requests: [
        {
          image: { content: base64Image },
          features: [
            { type: "LABEL_DETECTION", maxResults: 10 },
            { type: "OBJECT_LOCALIZATION", maxResults: 10 },
          ],
        },
      ],
    };

    console.log("发送API请求...");

    // 使用fetchWithProxy函数，它会根据环境自动处理代理
    console.log("[Vision API] 使用fetchWithProxy发送请求");

    // 设置超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

    const response = await fetchWithProxy(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log("[Vision API] 请求已发送，等待响应");

    console.log(`API响应状态: ${response.status}`);
    const data = await response.json();

    if (!response.ok) {
      console.error("API错误响应:", JSON.stringify(data, null, 2));
      throw new Error(data?.error?.message || `HTTP error! status: ${response.status}`);
    }

    if (!data.responses?.[0]) {
      console.error("无效的API响应结构:", JSON.stringify(data, null, 2));
      throw new Error("Invalid API response structure");
    }

    // 检查响应对象中是否存在错误
    if (data.responses[0].error) {
      console.error("API返回错误对象:", JSON.stringify(data.responses[0].error, null, 2));
      throw new Error(data.responses[0].error.message || "API returned an error");
    }

    console.log("API响应成功，处理识别结果...");

    // 处理识别结果
    const result = data.responses[0];

    // 处理标签检测结果
    const labels = result.labelAnnotations || [];
    const formattedLabels = labels.map((label) => ({
      description: label.description,
      score: label.score,
      topicality: label.topicality,
    }));

    // 处理对象定位结果
    const objects = result.localizedObjectAnnotations || [];
    const formattedObjects = objects.map((object) => ({
      name: object.name,
      score: object.score,
      boundingPoly: object.boundingPoly,
    }));

    // 合并结果
    const combinedResults = {
      labels: formattedLabels,
      objects: formattedObjects,
    };

    return combinedResults;
  } catch (error) {
    console.error("图像识别错误:", error);
    throw error;
  }
}

/**
 * 使用Vision API进行OCR识别
 * @param {string} base64Image - Base64编码的图像数据
 * @param {string[]} languageHints - 语言提示
 * @param {string} apiKey - Google Cloud Vision API密钥
 * @returns {Promise<Object>} - OCR识别结果
 */
export async function performOcr(base64Image, languageHints = [], apiKey) {
  if (!apiKey) throw new Error("API Key is missing");
  if (!base64Image) throw new Error("Base64 image data is missing");

  try {
    console.log(`开始OCR识别请求`);
    console.log(`语言提示: ${languageHints.length > 0 ? languageHints.join(", ") : "无"}`);
    console.log(`API密钥前缀: ${apiKey.substring(0, 8)}...`);

    const apiUrl = `${API_URL}?key=${apiKey}`;
    console.log(`API URL: ${API_URL}`);

    // 设置图像上下文
    const imageContext = {};
    if (languageHints && languageHints.length > 0) {
      imageContext.languageHints = languageHints;
    }

    // 构建请求体，包含TEXT_DETECTION和DOCUMENT_TEXT_DETECTION特性
    const requestBody = {
      requests: [
        {
          image: { content: base64Image },
          features: [
            { type: "TEXT_DETECTION", maxResults: 10 },
            { type: "DOCUMENT_TEXT_DETECTION", maxResults: 10 },
          ],
          imageContext: imageContext,
        },
      ],
    };

    console.log("发送OCR API请求...");

    // 使用fetchWithProxy函数，它会根据环境自动处理代理
    console.log("[OCR API] 使用fetchWithProxy发送请求");

    // 设置超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

    const response = await fetchWithProxy(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`API响应状态: ${response.status}`);
    const data = await response.json();

    if (!response.ok) {
      console.error("API错误响应:", JSON.stringify(data, null, 2));
      throw new Error(data?.error?.message || `HTTP error! status: ${response.status}`);
    }

    if (!data.responses?.[0]) {
      console.error("无效的API响应结构:", JSON.stringify(data, null, 2));
      throw new Error("Invalid API response structure");
    }

    // 检查响应对象中是否存在错误
    if (data.responses[0].error) {
      console.error("API返回错误对象:", JSON.stringify(data.responses[0].error, null, 2));
      throw new Error(data.responses[0].error.message || "API returned an error");
    }

    console.log("OCR API请求完成，处理结果...");

    // 处理识别结果
    const result = data.responses[0];

    // 提取文本检测结果
    const textAnnotations = result.textAnnotations || [];
    const fullTextAnnotation = result.fullTextAnnotation || {};

    // 获取检测到的语言
    const detectedLanguage = fullTextAnnotation.pages?.[0]?.property?.detectedLanguages?.[0] || {};
    const detectedLanguageCode = detectedLanguage.languageCode || "und";

    // 格式化结果
    return {
      originalFullText: fullTextAnnotation.text || "",
      detectedLanguageCode: detectedLanguageCode,
      detectedLanguageName: getLanguageName(detectedLanguageCode),
      textAnnotations: textAnnotations,
      fullTextAnnotation: fullTextAnnotation,
    };
  } catch (error) {
    console.error("OCR识别错误:", error);
    throw error;
  }
}

/**
 * 获取语言名称
 * @param {string} languageCode - 语言代码
 * @returns {string} - 语言名称
 */
function getLanguageName(languageCode) {
  const languageMap = {
    zh: "中文",
    "zh-CN": "简体中文",
    "zh-TW": "繁体中文",
    en: "英语",
    ja: "日语",
    ko: "韩语",
    fr: "法语",
    de: "德语",
    es: "西班牙语",
    ru: "俄语",
    it: "意大利语",
    pt: "葡萄牙语",
    und: "未知语言",
  };

  return languageMap[languageCode] || languageCode;
}
