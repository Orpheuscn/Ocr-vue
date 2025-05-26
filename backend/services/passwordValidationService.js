// services/passwordValidationService.js
import validator from 'validator';
import config from '../utils/envConfig.js';

/**
 * 密码验证服务
 * 在生产环境中强制使用强密码
 */
class PasswordValidationService {
  constructor() {
    this.isProduction = config.nodeEnv === 'production';
  }

  /**
   * 验证密码强度
   * @param {string} password - 要验证的密码
   * @returns {Object} - 验证结果
   */
  validatePassword(password) {
    const result = {
      isValid: false,
      errors: [],
      strength: 'weak',
      score: 0
    };

    if (!password) {
      result.errors.push('密码不能为空');
      return result;
    }

    // 基本长度检查
    if (password.length < 6) {
      result.errors.push('密码至少需要6个字符');
    }

    // 生产环境的强密码要求
    if (this.isProduction) {
      if (password.length < 8) {
        result.errors.push('生产环境密码至少需要8个字符');
      }

      if (!/[a-z]/.test(password)) {
        result.errors.push('密码必须包含至少一个小写字母');
      }

      if (!/[A-Z]/.test(password)) {
        result.errors.push('密码必须包含至少一个大写字母');
      }

      if (!/\d/.test(password)) {
        result.errors.push('密码必须包含至少一个数字');
      }

      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        result.errors.push('密码必须包含至少一个特殊字符');
      }

      // 检查常见弱密码
      if (this.isCommonPassword(password)) {
        result.errors.push('密码过于常见，请使用更复杂的密码');
      }
    }

    // 计算密码强度分数
    result.score = this.calculatePasswordScore(password);
    result.strength = this.getPasswordStrength(result.score);

    // 如果没有错误，则密码有效
    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * 验证邮箱格式
   * @param {string} email - 要验证的邮箱
   * @returns {Object} - 验证结果
   */
  validateEmail(email) {
    const result = {
      isValid: false,
      errors: []
    };

    if (!email) {
      result.errors.push('邮箱不能为空');
      return result;
    }

    if (!validator.isEmail(email)) {
      result.errors.push('邮箱格式不正确');
      return result;
    }

    // 生产环境的额外邮箱验证
    if (this.isProduction) {
      // 检查是否为临时邮箱域名
      if (this.isTemporaryEmail(email)) {
        result.errors.push('不允许使用临时邮箱地址');
      }

      // 检查邮箱长度
      if (email.length > 254) {
        result.errors.push('邮箱地址过长');
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * 计算密码强度分数
   * @param {string} password - 密码
   * @returns {number} - 分数 (0-100)
   */
  calculatePasswordScore(password) {
    let score = 0;

    // 长度分数
    if (password.length >= 8) score += 25;
    else if (password.length >= 6) score += 10;

    // 字符类型分数
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/\d/.test(password)) score += 15;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 20;

    // 长度奖励
    if (password.length >= 12) score += 10;

    return Math.min(score, 100);
  }

  /**
   * 获取密码强度等级
   * @param {number} score - 密码分数
   * @returns {string} - 强度等级
   */
  getPasswordStrength(score) {
    if (score >= 80) return 'very_strong';
    if (score >= 60) return 'strong';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'weak';
    return 'very_weak';
  }

  /**
   * 检查是否为常见弱密码
   * @param {string} password - 密码
   * @returns {boolean} - 是否为常见密码
   */
  isCommonPassword(password) {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', '111111', '123123', 'admin', 'root',
      'user', 'test', 'guest', '000000', '666666', '888888',
      '12345678', 'qwerty123', 'password1', 'welcome'
    ];

    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * 检查是否为临时邮箱
   * @param {string} email - 邮箱地址
   * @returns {boolean} - 是否为临时邮箱
   */
  isTemporaryEmail(email) {
    const temporaryDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
      'mailinator.com', 'yopmail.com', 'temp-mail.org',
      'throwaway.email', 'getnada.com', 'maildrop.cc'
    ];

    const domain = email.split('@')[1]?.toLowerCase();
    return temporaryDomains.includes(domain);
  }

  /**
   * 获取密码强度提示
   * @param {string} password - 密码
   * @returns {Object} - 强度提示
   */
  getPasswordStrengthTips(password) {
    const validation = this.validatePassword(password);
    const tips = [];

    if (validation.isValid) {
      tips.push('密码强度良好！');
    } else {
      tips.push('密码需要改进：');
      tips.push(...validation.errors);
    }

    // 添加改进建议
    if (validation.score < 60) {
      tips.push('建议：');
      if (password.length < 8) tips.push('- 增加密码长度至8位以上');
      if (!/[A-Z]/.test(password)) tips.push('- 添加大写字母');
      if (!/[a-z]/.test(password)) tips.push('- 添加小写字母');
      if (!/\d/.test(password)) tips.push('- 添加数字');
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) tips.push('- 添加特殊字符');
    }

    return {
      strength: validation.strength,
      score: validation.score,
      tips: tips
    };
  }
}

// 创建单例实例
const passwordValidationService = new PasswordValidationService();

export default passwordValidationService;
