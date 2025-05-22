const API_BASE_URL = '/api/languages'

/**
 * 获取所有可用语言列表
 * @param {string} preferredLang 首选语言(zh或en)
 * @returns {Promise<Array>} 语言列表
 */
export async function getAllLanguages(preferredLang = 'zh') {
  try {
    const response = await fetch(`${API_BASE_URL}?lang=${preferredLang}`)

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '获取语言列表失败')
    }

    return result.data
  } catch (error) {
    console.error('获取语言列表错误:', error)
    // 返回空数组，以便用户界面可以继续工作
    return []
  }
}

/**
 * 获取语言名称
 * @param {string} code 语言代码
 * @param {string} preferredLang 首选语言(zh或en)
 * @returns {Promise<string>} 语言名称
 */
export async function getLanguageName(code, preferredLang = 'zh') {
  try {
    if (!code) return preferredLang === 'zh' ? '未知' : 'Unknown'

    const response = await fetch(`${API_BASE_URL}/info?code=${code}&lang=${preferredLang}`)

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '获取语言名称失败')
    }

    return result.data.name
  } catch (error) {
    console.error('获取语言名称错误:', error)
    // 如果发生错误，返回代码本身或未知
    return code || (preferredLang === 'zh' ? '未知' : 'Unknown')
  }
}

/**
 * 判断语言代码是否为RTL语言（从右到左书写）
 * 同步版本 - 用于初始化或简单逻辑（不发API请求，直接判断）
 * @param {string} code 语言代码
 * @returns {boolean} 是否是RTL语言
 */
export function isRtlLanguageSync(code) {
  if (!code) return false
  // 处理可能的子标记，如 'ar-EG'
  const baseCode = code.split('-')[0].toLowerCase()
  const RTL_LANGUAGES = ['ar', 'fa', 'he', 'iw', 'ur', 'dv', 'ps']
  return RTL_LANGUAGES.includes(baseCode)
}

/**
 * 分析文本内容，判断是否需要RTL方向
 * @param {string} text 要分析的文本内容
 * @param {number} threshold 判断为RTL的字符比例阈值，默认为0.3（30%）
 * @returns {boolean} 是否需要RTL方向
 */
export function rtlDirectionNeeded(text, threshold = 0.3) {
  if (!text) return false

  // RTL字符范围（阿拉伯文、希伯来文等）的Unicode正则表达式
  const rtlCharsRegex =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0590-\u05FF\uFB50-\uFDFF\uFE70-\uFEFF]/g

  // 统计RTL字符数量
  const rtlCharMatches = text.match(rtlCharsRegex)
  const rtlCharCount = rtlCharMatches ? rtlCharMatches.length : 0

  // 如果RTL字符占比超过阈值，则认为需要RTL方向
  return rtlCharCount > text.length * threshold
}

/**
 * 综合判断文本是否应该使用RTL方向
 * 结合语言代码和文本内容进行判断
 * @param {string} code 语言代码
 * @param {string} text 文本内容
 * @returns {boolean} 是否应该使用RTL方向
 */
export function shouldUseRtlDirection(code, text) {
  // 首先检查语言代码是否为RTL语言
  const isRtlLanguage = isRtlLanguageSync(code)
  
  // 如果不是RTL语言，直接返回false
  if (!isRtlLanguage) return false
  
  // 如果是RTL语言，且文本很短或没有文本，直接返回true
  if (!text || text.length < 10) return true
  
  // 对于较长文本，分析文本内容确认是否真的需要RTL方向
  return rtlDirectionNeeded(text)
}
