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
 * 判断是否为RTL语言
 * @param {string} code 语言代码
 * @returns {Promise<boolean>} 是否是RTL语言
 */
export async function isRtlLanguage(code) {
  try {
    if (!code) return false

    const response = await fetch(`${API_BASE_URL}/rtl?code=${code}`)

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '检查RTL语言失败')
    }

    return result.isRtl
  } catch (error) {
    console.error('检查RTL语言错误:', error)
    // 如果发生错误，默认返回false
    return false
  }
}

// 同步版本函数 - 用于初始化或简单逻辑（不发API请求，直接判断）
// 通常只在组件加载前使用
export function isRtlLanguageSync(code) {
  if (!code) return false
  // 处理可能的子标记，如 'ar-EG'
  const baseCode = code.split('-')[0].toLowerCase()
  const RTL_LANGUAGES = ['ar', 'fa', 'he', 'iw', 'ur', 'dv', 'ps']
  return RTL_LANGUAGES.includes(baseCode)
}
