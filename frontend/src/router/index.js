import { createRouter, createWebHistory } from 'vue-router'
import { validateRouteAccess } from '@/services/routeSecurityService'
import HomePage from '@/views/HomePage.vue'
import LoginPage from '@/views/LoginPage.vue'
import RegisterPage from '@/views/RegisterPage.vue'
import EmailVerificationPage from '@/views/EmailVerificationPage.vue'
import PasswordResetPage from '@/views/PasswordResetPage.vue'
import SavedResultsPage from '@/views/SavedResultsPage.vue'
import PublishedResultsPage from '@/views/PublishedResultsPage.vue'
import ContentReviewPage from '@/views/admin/ContentReviewPage.vue'
import DocDetection from '@/components/doc-detection/DocDetection.vue'
import ImageRecognitionTool from '@/components/recognition/ImageRecognitionTool.vue'
import PrivacyPage from '@/views/PrivacyPage.vue'
import TermsPage from '@/views/TermsPage.vue'
import EnvironmentTestPage from '@/views/EnvironmentTestPage.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
    meta: { requiresAuth: true },
  },
  // 登录页面作为顶级路由
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: { guestOnly: true },
  },
  // 注册页面作为顶级路由
  {
    path: '/register',
    name: 'Register',
    component: RegisterPage,
    meta: { guestOnly: true },
  },
  // 邮箱验证页面
  {
    path: '/verify-email',
    name: 'EmailVerification',
    component: EmailVerificationPage,
    meta: { guestOnly: true },
  },
  // 密码重置页面
  {
    path: '/reset-password',
    name: 'PasswordReset',
    component: PasswordResetPage,
    meta: { guestOnly: true },
  },
  // 管理功能已移除，改为使用后端API进行管理
  // 管理相关功能应通过后端API实现，前端不再提供管理界面
  // 文档检测工具 - 直接使用组件
  {
    path: '/doc-detection',
    name: 'DocDetection',
    component: DocDetection,
    meta: { requiresAuth: true },
  },
  // 图像识别工具
  {
    path: '/image-recognition',
    name: 'ImageRecognition',
    component: ImageRecognitionTool,
    meta: { requiresAuth: true },
  },
  // 保留原来的/auth路径，重定向到登录
  {
    path: '/auth',
    redirect: { name: 'Login' },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/components/auth/UserProfile.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/saved-results',
    name: 'SavedResults',
    component: SavedResultsPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/published-results',
    name: 'PublishedResults',
    component: PublishedResultsPage,
    // 无需登录即可访问
  },
  {
    path: '/admin/content-review',
    name: 'ContentReview',
    component: ContentReviewPage,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  // 隐私政策页面
  {
    path: '/privacy',
    name: 'Privacy',
    component: PrivacyPage,
    // 无需登录即可访问
  },
  // 服务条款页面
  {
    path: '/terms',
    name: 'Terms',
    component: TermsPage,
    // 无需登录即可访问
  },
  // 环境测试页面（仅开发环境）
  {
    path: '/environment-test',
    name: 'EnvironmentTest',
    component: EnvironmentTestPage,
    // 无需登录即可访问
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 前端路由守卫 - 仅用于改善用户体验
// 注意：这不是安全措施，所有敏感操作和页面访问权限必须在后端再次验证

// 标记是否正在尝试恢复会话
let isRestoringSession = false
let sessionRestorePromise = null

// 创建一个会话恢复Promise
const createSessionRestorePromise = () => {
  if (!sessionRestorePromise) {
    isRestoringSession = true
    console.log('路由守卫: 创建会话恢复Promise')

    sessionRestorePromise = new Promise((resolve) => {
      // 等待一段时间，让会话恢复完成
      setTimeout(() => {
        console.log('路由守卫: 会话恢复等待完成')
        isRestoringSession = false
        resolve()
      }, 2000)
    })
  }
  return sessionRestorePromise
}

router.beforeEach(async (to, from, next) => {
  // 如果是首次导航，等待会话恢复完成
  if (from.name === undefined && to.meta.requiresAuth) {
    console.log('路由守卫: 首次导航到需要认证的页面，等待会话恢复')
    await createSessionRestorePromise()
  }

  // 使用路由安全服务验证访问权限（仅用于用户体验）
  const navigationDecision = await validateRouteAccess(to, from)
  console.log('路由守卫: 导航决策', navigationDecision)

  // 如果返回true，允许导航
  if (navigationDecision === true) {
    next()
  }
  // 否则，使用返回的导航决策对象
  else {
    next(navigationDecision)
  }
})

export default router
