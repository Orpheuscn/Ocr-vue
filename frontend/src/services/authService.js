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
    
    // 保存用户信息到本地存储
    if (data.data) {
      localStorage.setItem('user', JSON.stringify(data.data));
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

// 刷新令牌
export const refreshToken = async () => {
  try {
    const user = getCurrentUser();
    if (!user || !user.refreshToken) {
      throw new Error('没有有效的刷新令牌');
    }
    
    const response = await fetch(`${API_URL}/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken: user.refreshToken })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '刷新令牌失败');
    }
    
    // 更新本地存储中的令牌
    const updatedUser = {
      ...user,
      token: data.data.token,
      refreshToken: data.data.refreshToken
    };
    
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    return data;
  } catch (error) {
    console.error('刷新令牌错误:', error);
    // 如果刷新失败，清除用户信息，要求重新登录
    logout();
    throw error;
  }
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
    let response = await fetch(url, requestOptions);
    
    // 如果响应为401（未授权），尝试刷新令牌
    if (response.status === 401) {
      try {
        // 尝试刷新令牌
        await refreshToken();
        
        // 使用新令牌重新发送请求
        const refreshedUser = getCurrentUser();
        requestOptions.headers['Authorization'] = `Bearer ${refreshedUser.token}`;
        response = await fetch(url, requestOptions);
      } catch (refreshError) {
        // 刷新令牌失败，需要重新登录
        throw new Error('会话已过期，请重新登录');
      }
    }
    
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
    
    // 使用fetchWithAuth确保发送认证token
    const url = `${API_URL}/${userId}/profile`;
    const data = await fetchWithAuth(url);
    
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
    // 使用fetchWithAuth而不是普通fetch，确保发送认证token
    const url = `${API_URL}/${userId}/profile`;
    const data = await fetchWithAuth(url);
    
    return data.data;
  } catch (error) {
    console.error('获取用户资料错误:', error);
    throw error;
  }
};

// 更新用户信息
export const updateUserProfile = async (userId, userData) => {
  try {
    // 使用fetchWithAuth确保发送认证token
    const url = `${API_URL}/${userId}`;
    const data = await fetchWithAuth(url, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
    
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

// 注销账户（永久删除）
export const deactivateAccount = async (userId) => {
  try {
    // 使用fetchWithAuth确保发送认证token
    const url = `${API_URL}/${userId}/deactivate`;
    const data = await fetchWithAuth(url, {
      method: 'DELETE'
    });
    
    // 成功注销后清除本地存储
    logout();
    
    return data;
  } catch (error) {
    console.error('注销账户错误:', error);
    throw error;
  }
}; 