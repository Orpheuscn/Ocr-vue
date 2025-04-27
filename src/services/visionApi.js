// src/services/visionApi.js
const API_URL = 'https://vision.googleapis.com/v1/images:annotate';

/**
 * Performs OCR using Google Cloud Vision API.
 * @param {string} base64Image - Base64 encoded image data (without prefix).
 * @param {string} apiKey - Google Cloud Vision API Key.
 * @returns {Promise<object>} - The first response object from the API.
 * @throws {Error} - If API key/image is missing or API returns an error.
 */
export async function performOcrRequest(base64Image, apiKey) {
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
          ]
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

// Helper function to get language name (can be expanded)
export function getLanguageName(code) {
    const map = {
        'zh': '中文', 'en': '英语', 'ja': '日语', 'ko': '韩语', 'fr': '法语',
        'de': '德语', 'es': '西班牙语', 'ru': '俄语', 'ar': '阿拉伯语',
        'hi': '印地语', 'pt': '葡萄牙语', 'it': '意大利语',
        'zh-Hans': '简体中文', 'zh-Hant': '繁体中文', 'und': '未确定'
        // Add more as needed
    };
    if (map[code]) return map[code];
    const baseCode = code?.split('-')[0];
    return map[baseCode] || code || '未知'; // Fallback
}