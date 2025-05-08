import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from '@/services/authService'
import HomePage from '@/views/HomePage.vue'
import AuthPage from '@/views/AuthPage.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
    meta: { requiresAuth: true }
  },
  {
    path: '/auth',
    name: 'Auth',
    component: AuthPage,
    meta: { guestOnly: true },
    children: [
      {
        path: 'login',
        name: 'Login',
        component: () => import('@/components/auth/LoginForm.vue')
      },
      {
        path: 'register',
        name: 'Register',
        component: () => import('@/components/auth/RegisterForm.vue')
      },
      {
        path: '',
        redirect: { name: 'Login' }
      }
    ]
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/components/auth/UserProfile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 导航守卫
router.beforeEach((to, from, next) => {
  const isLoggedIn = isAuthenticated()
  
  // 需要登录的页面，但用户未登录
  if (to.meta.requiresAuth && !isLoggedIn) {
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