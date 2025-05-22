// src/services/routeSecurityService.js
// 注意：此服务仅用于改善用户体验，不应被视为安全措施
// 所有敏感操作和页面访问权限必须在后端再次验证

import { refreshUserInfo, isAuthenticated, isAdmin, logout } from './authService'
import { useOcrStore } from '@/stores/ocrStore'
import { useI18nStore } from '@/stores/i18nStore'

// 开发环境警告
if (import.meta.env.DEV) {
  console.warn(
    '警告: 前端路由守卫和权限检查仅用于改善用户体验，不能替代后端安全验证。' +
      '所有敏感操作必须在服务器端进行权限验证。',
  )
}

/**
 * 验证用户权限并返回导航决策
 * @param {Object} to - 目标路由
 * @param {Object} from - 来源路由
 * @returns {Object|boolean} - 导航决策对象或true表示允许导航
 */
export const validateRouteAccess = async (to, from) => {
  // 获取i18n实例用于消息提示
  const i18n = useI18nStore()
  const ocrStore = useOcrStore()

  try {
    console.log('验证路由访问权限:', { to: to.fullPath, from: from.fullPath })

    // 检查用户是否已登出
    const userLoggedOut =
      localStorage.getItem('user_logged_out') === 'true' ||
      sessionStorage.getItem('user_logged_out') === 'true'

    console.log('用户登出状态:', { userLoggedOut })

    // 检查路由是否需要认证
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
    const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin)
    const guestOnly = to.matched.some((record) => record.meta.guestOnly)

    console.log('路由要求:', { requiresAuth, requiresAdmin, guestOnly })

    // 如果用户已登出，强制认为未登录
    let isLoggedIn = userLoggedOut ? false : isAuthenticated()
    let userIsAdmin = userLoggedOut ? false : isAdmin()

    console.log('当前登录状态:', { isLoggedIn, userIsAdmin, userLoggedOut })

    // 如果是首次导航到需要认证的页面，给予更多时间让会话恢复
    if (from.name === undefined && requiresAuth && !isLoggedIn && !userLoggedOut) {
      console.log('首次导航到需要认证的页面，等待额外时间让会话恢复')

      // 等待一小段时间，让会话恢复有更多机会完成
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 再次检查用户是否在此期间登出
      const userLoggedOutNow =
        localStorage.getItem('user_logged_out') === 'true' ||
        sessionStorage.getItem('user_logged_out') === 'true'

      // 只有在用户未登出的情况下才重新检查登录状态
      if (!userLoggedOutNow) {
        // 重新检查登录状态
        isLoggedIn = isAuthenticated()
        userIsAdmin = isAdmin()
        console.log('等待后的登录状态:', { isLoggedIn, userIsAdmin })
      } else {
        console.log('用户在等待期间登出，不重新检查登录状态')
        isLoggedIn = false
        userIsAdmin = false
      }
    }

    // 如果需要认证，验证令牌有效性
    if (requiresAuth && isLoggedIn) {
      try {
        // 再次检查用户是否已登出
        const userLoggedOutNow =
          localStorage.getItem('user_logged_out') === 'true' ||
          sessionStorage.getItem('user_logged_out') === 'true'

        if (userLoggedOutNow) {
          console.log('用户已登出，跳过令牌验证')
          isLoggedIn = false
          userIsAdmin = false
        } else {
          console.log('验证令牌有效性并刷新用户信息')

          // 验证令牌有效性并刷新用户信息
          const userInfo = await refreshUserInfo()

          // 如果无法获取用户信息，令牌可能已失效
          if (!userInfo) {
            console.warn('无法获取用户信息，令牌可能已失效')

            // 清除无效的认证信息
            logout()

            // 显示通知
            if (ocrStore) {
              ocrStore._showNotification(i18n.t('sessionExpired'), 'error')
            }

            // 重定向到登录页面，并保存原始目标路由
            return {
              name: 'Login',
              query: { redirect: to.fullPath },
            }
          }

          console.log('用户信息刷新成功:', userInfo)

          // 更新管理员状态
          userIsAdmin = userInfo.isAdmin === true
        }
      } catch (error) {
        console.error('验证用户权限时出错:', error)

        // 出错时清除认证信息
        logout()

        // 显示通知
        if (ocrStore) {
          ocrStore._showNotification(i18n.t('authError'), 'error')
        }

        // 重定向到登录页面
        return {
          name: 'Login',
          query: { redirect: to.fullPath },
        }
      }
    }

    // 重新检查登录状态（可能在上面的验证中已更改）
    isLoggedIn = isAuthenticated()
    console.log('最终登录状态:', { isLoggedIn, userIsAdmin })

    // 应用路由规则

    // 需要管理员权限的页面，但用户不是管理员
    if (requiresAdmin && !userIsAdmin) {
      console.log('需要管理员权限，但用户不是管理员')

      // 显示通知
      if (ocrStore) {
        ocrStore._showNotification(i18n.t('adminAccessRequired'), 'error')
      }

      return { name: 'Home' }
    }

    // 需要登录的页面，但用户未登录
    if (requiresAuth && !isLoggedIn) {
      console.log('需要登录，但用户未登录')

      return {
        name: 'Login',
        query: { redirect: to.fullPath },
      }
    }

    // 只允许游客访问的页面，但用户已登录
    if (guestOnly && isLoggedIn) {
      console.log('只允许游客访问，但用户已登录')

      return { name: 'Home' }
    }

    // 允许导航
    console.log('验证通过，允许导航')
    return true
  } catch (error) {
    console.error('路由安全检查错误:', error)

    // 出现未预期的错误时，重定向到首页
    return { name: 'Home' }
  }
}

/**
 * 生成CSRF令牌
 * @returns {string} - CSRF令牌
 */
export const generateCsrfToken = () => {
  // 生成随机令牌
  const token =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  // 存储令牌（使用sessionStorage而不是localStorage）
  sessionStorage.setItem('csrfToken', token)

  return token
}

/**
 * 验证CSRF令牌
 * @param {string} token - 要验证的令牌
 * @returns {boolean} - 令牌是否有效
 */
export const validateCsrfToken = (token) => {
  const storedToken = sessionStorage.getItem('csrfToken')
  return storedToken === token
}

/**
 * 为敏感操作添加CSRF保护
 * @param {Function} actionFn - 要保护的操作函数
 * @returns {Function} - 带有CSRF保护的函数
 */
export const withCsrfProtection = (actionFn) => {
  return (...args) => {
    // 获取当前令牌
    const token = sessionStorage.getItem('csrfToken')

    // 如果没有令牌，生成一个新的
    if (!token) {
      generateCsrfToken()
    }

    // 执行原始函数，并传递所有参数
    return actionFn(...args)
  }
}
