// src/services/authService.js
const API_URL = 'http://localhost:3000/api/users';

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