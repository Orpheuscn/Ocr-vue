// src/services/visionApi.js
const API_URL = 'https://vision.googleapis.com/v1/images:annotate';

/**
 * Performs OCR using Google Cloud Vision API.
 * @param {string} base64Image - Base64 encoded image data (without prefix).
 * @param {string} apiKey - Google Cloud Vision API Key.
 * @param {string[]} languageHints - Optional array of language codes to hint at the OCR processor.
 * @returns {Promise<object>} - The first response object from the API.
 * @throws {Error} - If API key/image is missing or API returns an error.
 */
export async function performOcrRequest(base64Image, apiKey, languageHints = []) {
  if (!apiKey) throw new Error("API Key is missing");
  if (!base64Image) throw new Error("Base64 image data is missing");

  try {
    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [
            // Request both to get detailed structure and full text
            { type: 'TEXT_DETECTION' },
            { type: 'DOCUMENT_TEXT_DETECTION' }
          ],
          imageContext: {
            languageHints: languageHints.length > 0 ? languageHints : undefined
          }
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("API Error Response:", data);
      throw new Error(data?.error?.message || `HTTP error! status: ${response.status}`);
    }
    if (!data.responses?.[0]) {
      console.error("Invalid API Response Structure:", data);
      throw new Error('Invalid API response structure');
    }
    // Check specifically for errors within the response object
    if (data.responses[0].error) {
       console.error("API returned error object:", data.responses[0].error);
       throw new Error(data.responses[0].error.message || 'API returned an error');
    }

    // Return the first response object, which contains annotations
    return data.responses[0];

  } catch (error) {
    console.error('OCR API Fetch/Processing Error in service:', error);
    // Re-throw the error so the caller (Pinia action) knows it failed
    throw error;
  }
}

// 语言代码映射表
const LANGUAGE_MAP = {
  'zh': '中文', 'en': '英语', 'ja': '日语', 'ko': '韩语', 'fr': '法语',
  'de': '德语', 'es': '西班牙语', 'ru': '俄语', 'ar': '阿拉伯语',
  'hi': '印地语', 'pt': '葡萄牙语', 'it': '意大利语', 'th': '泰语',
  'vi': '越南语', 'tr': '土耳其语', 'id': '印尼语', 'ms': '马来语',
  'fa': '波斯语', 'nl': '荷兰语', 'el': '希腊语', 'he': '希伯来语',
  'uk': '乌克兰语', 'pl': '波兰语', 'ro': '罗马尼亚语', 'sv': '瑞典语',
  'hu': '匈牙利语', 'cs': '捷克语', 'da': '丹麦语', 'fi': '芬兰语',
  'no': '挪威语', 'sk': '斯洛伐克语', 'bg': '保加利亚语', 'hr': '克罗地亚语',
  'sr': '塞尔维亚语', 'sl': '斯洛文尼亚语', 'et': '爱沙尼亚语', 'lv': '拉脱维亚语',
  'lt': '立陶宛语', 'zh-Hans': '简体中文', 'zh-Hant': '繁体中文', 'und': '未确定'
  // 可按需添加更多语言
};

// Helper function to get language name
export function getLanguageName(code) {
    if (LANGUAGE_MAP[code]) return LANGUAGE_MAP[code];
    const baseCode = code?.split('-')[0];
    return LANGUAGE_MAP[baseCode] || code || '未知'; // Fallback
}

// 获取所有可用语言的列表，用于多选组件
export function getAllLanguages() {
    const result = [];
    for (const [code, name] of Object.entries(LANGUAGE_MAP)) {
        // 排除一些特殊值
        if (code !== 'und' && !code.includes('-')) {
            result.push({ code, name });
        }
    }
    // 按照语言名称排序
    return result.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}