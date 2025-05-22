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

// ----- 语言特性检测相关函数 -----

/**
 * 语言类型常量定义
 */
const LANGUAGE_TYPES = {
  // CJK语言（中文、日文、韩文）
  CJK: ['zh', 'ja', 'ko'],
  // 东南亚语言（泰文、老挝文、缅甸文）
  SOUTHEAST_ASIAN: ['th', 'lo', 'my'],
  // 所有不使用空格的语言
  get NO_SPACE() {
    return [...this.CJK, ...this.SOUTHEAST_ASIAN]
  }
}

/**
 * 检测语言类型
 * @param {string} code 语言代码
 * @param {string} type 语言类型，可选值：'cjk', 'southeast_asian', 'no_space'
 * @returns {boolean} 是否属于指定类型
 */
export function checkLanguageType(code, type = 'cjk') {
  if (!code) return false
  
  // 处理可能的子标记，如 'zh-CN'
  const baseCode = code.split('-')[0].toLowerCase()
  
  // 根据类型返回对应的检测结果
  switch (type.toLowerCase()) {
    case 'cjk':
      return LANGUAGE_TYPES.CJK.includes(baseCode)
    case 'southeast_asian':
      return LANGUAGE_TYPES.SOUTHEAST_ASIAN.includes(baseCode)
    case 'no_space':
      return LANGUAGE_TYPES.NO_SPACE.includes(baseCode)
    default:
      return false
  }
}

/**
 * 判断语言是否为CJK语言（中文、日文、韩文）
 * @param {string} code 语言代码
 * @returns {boolean} 是否为CJK语言
 */
export function isCJKLanguage(code) {
  return checkLanguageType(code, 'cjk')
}

/**
 * 判断语言是否为不使用空格的语言（CJK等）
 * @param {string} code 语言代码
 * @returns {boolean} 是否为不使用空格的语言
 */
export function isNoSpaceLanguage(code) {
  return checkLanguageType(code, 'no_space')
}

/**
 * 获取指定类型的语言列表
 * @param {string} type 语言类型，可选值：'cjk', 'southeast_asian', 'no_space'
 * @returns {string[]} 语言代码列表
 */
export function getLanguagesByType(type = 'no_space') {
  switch (type.toLowerCase()) {
    case 'cjk':
      return [...LANGUAGE_TYPES.CJK]
    case 'southeast_asian':
      return [...LANGUAGE_TYPES.SOUTHEAST_ASIAN]
    case 'no_space':
      return [...LANGUAGE_TYPES.NO_SPACE]
    default:
      return []
  }
}

/**
 * 获取不使用空格的语言列表
 * @returns {string[]} 不使用空格的语言代码列表
 */
export function getNoSpaceLanguages() {
  return getLanguagesByType('no_space')
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
