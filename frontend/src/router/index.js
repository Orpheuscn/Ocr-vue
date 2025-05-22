import { createRouter, createWebHistory } from 'vue-router'
import { validateRouteAccess } from '@/services/routeSecurityService'
import HomePage from '@/views/HomePage.vue'
import LoginPage from '@/views/LoginPage.vue'
import RegisterPage from '@/views/RegisterPage.vue'
import DocDetection from '@/components/doc-detection/DocDetection.vue'
import ImageRecognitionTool from '@/components/recognition/ImageRecognitionTool.vue'

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
      }, 1000)
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
