// src/services/inputValidationService.js

/**
 * 输入验证服务
 * 提供各种输入验证和净化功能
 */

/**
 * 验证电子邮件地址
 * @param {string} email - 要验证的电子邮件地址
 * @returns {boolean} - 电子邮件地址是否有效
 */
export const validateEmail = (email) => {
  if (!email) return false
  
  // 使用正则表达式验证电子邮件格式
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

/**
 * 验证密码强度
 * @param {string} password - 要验证的密码
 * @returns {Object} - 包含验证结果的对象
 */
export const validatePassword = (password) => {
  if (!password) {
    return {
      valid: false,
      message: '密码不能为空',
      strength: 0
    }
  }
  
  // 检查密码长度
  if (password.length < 8) {
    return {
      valid: false,
      message: '密码长度必须至少为8个字符',
      strength: 1
    }
  }
  
  // 检查密码复杂性
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  
  // 计算密码强度
  let strength = 0
  if (hasUpperCase) strength++
  if (hasLowerCase) strength++
  if (hasNumbers) strength++
  if (hasSpecialChars) strength++
  
  // 根据强度返回结果
  if (strength < 3) {
    return {
      valid: false,
      message: '密码必须包含大写字母、小写字母、数字和特殊字符中的至少3种',
      strength
    }
  }
  
  return {
    valid: true,
    message: '密码强度良好',
    strength
  }
}

/**
 * 验证用户名
 * @param {string} username - 要验证的用户名
 * @returns {Object} - 包含验证结果的对象
 */
export const validateUsername = (username) => {
  if (!username) {
    return {
      valid: false,
      message: '用户名不能为空'
    }
  }
  
  // 检查用户名长度
  if (username.length < 3 || username.length > 20) {
    return {
      valid: false,
      message: '用户名长度必须在3到20个字符之间'
    }
  }
  
  // 检查用户名格式
  const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/
  if (!usernameRegex.test(username)) {
    return {
      valid: false,
      message: '用户名只能包含字母、数字、下划线和中文字符'
    }
  }
  
  return {
    valid: true,
    message: '用户名有效'
  }
}

/**
 * 净化HTML内容，防止XSS攻击
 * @param {string} html - 要净化的HTML内容
 * @returns {string} - 净化后的HTML内容
 */
export const sanitizeHtml = (html) => {
  if (!html) return ''
  
  // 创建一个临时元素
  const tempElement = document.createElement('div')
  
  // 设置HTML内容
  tempElement.textContent = html
  
  // 返回净化后的HTML内容
  return tempElement.innerHTML
}

/**
 * 净化文本内容，移除所有HTML标签
 * @param {string} text - 要净化的文本内容
 * @returns {string} - 净化后的文本内容
 */
export const sanitizeText = (text) => {
  if (!text) return ''
  
  // 移除所有HTML标签
  return text.replace(/<[^>]*>/g, '')
}

/**
 * 验证URL
 * @param {string} url - 要验证的URL
 * @returns {boolean} - URL是否有效
 */
export const validateUrl = (url) => {
  if (!url) return false
  
  try {
    // 尝试创建URL对象
    new URL(url)
    return true
  } catch (error) {
    return false
  }
}

/**
 * 验证文件类型
 * @param {File} file - 要验证的文件
 * @param {string[]} allowedTypes - 允许的MIME类型数组
 * @returns {boolean} - 文件类型是否有效
 */
export const validateFileType = (file, allowedTypes) => {
  if (!file || !allowedTypes || !allowedTypes.length) return false
  
  // 检查文件类型
  return allowedTypes.includes(file.type)
}

/**
 * 验证文件大小
 * @param {File} file - 要验证的文件
 * @param {number} maxSize - 最大文件大小（字节）
 * @returns {boolean} - 文件大小是否有效
 */
export const validateFileSize = (file, maxSize) => {
  if (!file || !maxSize) return false
  
  // 检查文件大小
  return file.size <= maxSize
}

/**
 * 验证表单数据
 * @param {Object} formData - 表单数据对象
 * @param {Object} validationRules - 验证规则对象
 * @returns {Object} - 包含验证结果的对象
 */
export const validateForm = (formData, validationRules) => {
  const errors = {}
  let isValid = true
  
  // 遍历验证规则
  Object.keys(validationRules).forEach(field => {
    const rules = validationRules[field]
    const value = formData[field]
    
    // 遍历字段的验证规则
    rules.forEach(rule => {
      // 如果已经有错误，跳过后续验证
      if (errors[field]) return
      
      // 根据规则类型验证
      switch (rule.type) {
        case 'required':
          if (!value) {
            errors[field] = rule.message || '此字段是必填的'
            isValid = false
          }
          break
        case 'email':
          if (value && !validateEmail(value)) {
            errors[field] = rule.message || '请输入有效的电子邮件地址'
            isValid = false
          }
          break
        case 'password':
          if (value) {
            const result = validatePassword(value)
            if (!result.valid) {
              errors[field] = rule.message || result.message
              isValid = false
            }
          }
          break
        case 'username':
          if (value) {
            const result = validateUsername(value)
            if (!result.valid) {
              errors[field] = rule.message || result.message
              isValid = false
            }
          }
          break
        case 'url':
          if (value && !validateUrl(value)) {
            errors[field] = rule.message || '请输入有效的URL'
            isValid = false
          }
          break
        case 'custom':
          if (rule.validator && !rule.validator(value)) {
            errors[field] = rule.message || '验证失败'
            isValid = false
          }
          break
      }
    })
  })
  
  return {
    isValid,
    errors
  }
}
