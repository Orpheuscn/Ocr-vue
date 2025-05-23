// backend/services/recognitionService.js
import fetchWithProxy from "../utils/fetchHelper.js";

// Google Cloud Vision API URL
const API_URL = "https://vision.googleapis.com/v1/images:annotate";

/**
 * 识别图像中的物体和场景
 * @param {string} base64Image - Base64编码的图像数据
 * @param {string} apiKey - Google Cloud Vision API密钥
 * @returns {Promise<Array>} - 识别结果数组
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

    console.log("API响应成功，处理识别结果...");

    // 处理识别结果
    const result = processRecognitionResult(data.responses[0]);
    console.log("识别结果处理完成");

    return result;
  } catch (error) {
    console.error("图像识别 API 请求/处理错误:", error);
    console.error("错误堆栈:", error.stack);
    throw error;
  }
}

/**
 * 处理识别结果
 * @param {Object} recognitionResult - Google Cloud Vision API返回的识别结果
 * @returns {Array} - 处理后的识别结果数组
 */
function processRecognitionResult(recognitionResult) {
  // 提取物体定位结果
  const localizedObjects = recognitionResult.localizedObjectAnnotations || [];

  // 提取标签检测结果
  const labelAnnotations = recognitionResult.labelAnnotations || [];

  // 合并结果，优先使用物体定位结果（因为它们有边界框）
  const results = [];

  // 处理物体定位结果
  localizedObjects.forEach((object) => {
    results.push({
      description: object.name,
      score: object.score,
      boundingPoly: object.boundingPoly,
      type: "object",
    });
  });

  // 处理没有边界框的标签
  labelAnnotations.forEach((label) => {
    // 检查是否已经有相同名称的物体
    const existingObject = results.find(
      (r) => r.description.toLowerCase() === label.description.toLowerCase()
    );

    if (!existingObject) {
      results.push({
        description: label.description,
        score: label.score,
        type: "label",
      });
    }
  });

  // 按置信度排序
  results.sort((a, b) => b.score - a.score);

  return results;
}
