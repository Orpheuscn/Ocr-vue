// src/services/authService.js
// 使用相对路径，这样请求会通过Vite的代理转发
const API_URL = '/api/users';

// 用户注册
export const register = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '注册失败');
    }
    
    return data;
  } catch (error) {
    console.error('注册服务错误:', error);
    throw error;
  }
};

// 用户登录
export const login = async (credentials) => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '登录失败');
    }
    
    // 保存用户信息到本地存储
    localStorage.setItem('user', JSON.stringify(data.data));
    
    return data;
  } catch (error) {
    console.error('登录服务错误:', error);
    throw error;
  }
};

// 用户注销
export const logout = () => {
  // 清除本地存储中的用户信息
  localStorage.removeItem('user');
  localStorage.removeItem('rememberMe');
};

// 获取当前用户信息
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('解析用户信息错误:', error);
    return null;
  }
};

// 检查用户是否已登录
export const isAuthenticated = () => {
  return getCurrentUser() !== null;
};

// 检查当前用户是否为管理员
export const isAdmin = () => {
  const user = getCurrentUser();
  return user !== null && user.isAdmin === true;
};

// 创建带有认证头的请求
export const fetchWithAuth = async (url, options = {}) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('未登录，无法访问受保护资源');
    }
    
    // 检查用户是否有token，如果没有则提示需要重新登录
    if (!user.token) {
      console.error('用户没有有效的授权令牌，请重新登录获取');
      throw new Error('授权已过期，请重新登录');
    }
    
    // 创建请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.token}` // 使用服务器返回的token
    };
    
    // 合并请求选项
    const requestOptions = {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    };
    
    // 发送请求
    const response = await fetch(url, requestOptions);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '请求失败');
    }
    
    return data;
  } catch (error) {
    console.error('认证请求错误:', error);
    throw error;
  }
};

// 刷新当前用户信息（包括管理员状态）
export const refreshUserInfo = async () => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return null;
    }
    
    const userId = currentUser.id;
    
    // 获取最新的用户信息
    const response = await fetch(`${API_URL}/profile/${userId}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '获取用户信息失败');
    }
    
    // 更新本地存储中的用户信息
    const updatedUser = {
      ...currentUser,
      ...data.data
    };
    
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    return updatedUser;
  } catch (error) {
    console.error('刷新用户信息错误:', error);
    return null;
  }
};

// 获取用户详细信息
export const getUserProfile = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/profile/${userId}`);
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '获取用户信息失败');
    }
    
    return data.data;
  } catch (error) {
    console.error('获取用户资料错误:', error);
    throw error;
  }
};

// 更新用户信息
export const updateUserProfile = async (userId, userData) => {
  try {
    const response = await fetch(`${API_URL}/profile/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '更新用户信息失败');
    }
    
    // 更新本地存储中的用户信息
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      const updatedUser = {
        ...currentUser,
        username: userData.username,
        email: userData.email
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
    
    return data.data;
  } catch (error) {
    console.error('更新用户资料错误:', error);
    throw error;
  }
}; 