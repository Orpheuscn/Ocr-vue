import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated, isAdmin } from '@/services/authService'
import HomePage from '@/views/HomePage.vue'
import LoginPage from '@/views/LoginPage.vue'
import RegisterPage from '@/views/RegisterPage.vue'
import AdminDashboard from '@/views/AdminDashboard.vue'

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
  // 管理仪表板
  {
    path: '/admin',
    name: 'Admin',
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true },
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

// 导航守卫
router.beforeEach((to, from, next) => {
  const isLoggedIn = isAuthenticated()
  const userIsAdmin = isAdmin()

  // 需要管理员权限的页面，但用户不是管理员
  if (to.meta.requiresAdmin && !userIsAdmin) {
    next({ name: 'Home' })
  }
  // 需要登录的页面，但用户未登录
  else if (to.meta.requiresAuth && !isLoggedIn) {
    next({ name: 'Login' })
  }
  // 只允许游客访问的页面，但用户已登录
  else if (to.meta.guestOnly && isLoggedIn) {
    next({ name: 'Home' })
  }
  // 其他情况正常导航
  else {
    next()
  }
})

export default router
