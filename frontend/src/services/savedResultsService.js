// src/services/savedResultsService.js

/**
 * 保存的OCR结果服务
 * 用于管理用户保存的OCR结果
 */

// 存储键名
const SAVED_RESULTS_KEY = 'ocr_saved_results';

/**
 * 获取所有保存的OCR结果
 * @returns {Array} 保存的OCR结果数组
 */
export const getSavedResults = () => {
  try {
    const savedResultsStr = localStorage.getItem(SAVED_RESULTS_KEY);
    if (!savedResultsStr) {
      return [];
    }
    return JSON.parse(savedResultsStr);
  } catch (error) {
    console.error('获取保存的OCR结果时出错:', error);
    return [];
  }
};

/**
 * 保存OCR结果
 * @param {Object} result - OCR结果对象
 * @returns {boolean} 是否保存成功
 */
export const saveResult = (result) => {
  try {
    if (!result || !result.text) {
      console.error('无效的OCR结果');
      return false;
    }

    // 获取现有的保存结果
    const savedResults = getSavedResults();

    // 创建新的结果对象
    const newResult = {
      id: Date.now().toString(), // 使用时间戳作为唯一ID
      text: result.text,
      language: result.language || 'und',
      languageName: result.languageName || '未知语言',
      timestamp: new Date().toISOString(),
      preview: result.text.substring(0, 100) + (result.text.length > 100 ? '...' : ''),
      wordCount: result.text.split(/\s+/).filter(Boolean).length,
      charCount: result.text.length
    };

    // 添加到结果数组的开头（最新的在前面）
    savedResults.unshift(newResult);

    // 限制保存的结果数量，最多保存50条
    const limitedResults = savedResults.slice(0, 50);

    // 保存到localStorage
    localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(limitedResults));
    
    return true;
  } catch (error) {
    console.error('保存OCR结果时出错:', error);
    return false;
  }
};

/**
 * 删除保存的OCR结果
 * @param {string} id - 要删除的结果ID
 * @returns {boolean} 是否删除成功
 */
export const deleteResult = (id) => {
  try {
    if (!id) {
      return false;
    }

    // 获取现有的保存结果
    const savedResults = getSavedResults();

    // 过滤掉要删除的结果
    const filteredResults = savedResults.filter(result => result.id !== id);

    // 如果长度相同，说明没有找到要删除的结果
    if (filteredResults.length === savedResults.length) {
      return false;
    }

    // 保存更新后的结果
    localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(filteredResults));
    
    return true;
  } catch (error) {
    console.error('删除OCR结果时出错:', error);
    return false;
  }
};

/**
 * 清除所有保存的OCR结果
 * @returns {boolean} 是否清除成功
 */
export const clearAllResults = () => {
  try {
    localStorage.removeItem(SAVED_RESULTS_KEY);
    return true;
  } catch (error) {
    console.error('清除所有OCR结果时出错:', error);
    return false;
  }
};

/**
 * 获取指定ID的OCR结果
 * @param {string} id - 结果ID
 * @returns {Object|null} OCR结果对象或null
 */
export const getResultById = (id) => {
  try {
    const savedResults = getSavedResults();
    return savedResults.find(result => result.id === id) || null;
  } catch (error) {
    console.error('获取指定ID的OCR结果时出错:', error);
    return null;
  }
};
