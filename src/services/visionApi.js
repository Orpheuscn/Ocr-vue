// src/services/visionApi.js
import languageData from '@/assets/languages.json';

const API_URL = 'https://vision.googleapis.com/v1/images:annotate';

// 从右向左书写的RTL语言列表
const RTL_LANGUAGES = ['ar', 'fa', 'he', 'iw', 'ur', 'dv', 'ps'];

// 判断是否为RTL语言
export function isRtlLanguage(code) {
    if (!code) return false;
    // 处理可能的子标记，如 'ar-EG'
    const baseCode = code.split('-')[0].toLowerCase();
    return RTL_LANGUAGES.includes(baseCode);
}

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

// 语言代码映射表 - 从JSON文件导入
const LANGUAGE_MAP = languageData;

// Helper function to get language name
export function getLanguageName(code) {
    if (LANGUAGE_MAP[code]) return LANGUAGE_MAP[code];
    const baseCode = code?.split('-')[0];
    return LANGUAGE_MAP[baseCode] || code || '未知'; // Fallback
}

// 获取所有可用语言的列表，用于多选组件
export function getAllLanguages() {
    const result = [];
    
    // 添加所有语言
    for (const [code, name] of Object.entries(LANGUAGE_MAP)) {
        // 排除一些特殊值
        if (code !== 'und' && !code.includes('-')) {
            result.push({ code, name });
        }
    }
    
    // 按照语言名称排序
    return result.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}