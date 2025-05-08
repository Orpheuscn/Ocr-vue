// api/models/userModel.js
// 注意：这是一个简单的内存存储实现，生产环境应使用数据库
// 如MongoDB、MySQL等来持久化用户数据

// 用户数据存储
const users = [];

// 用户ID计数器
let userIdCounter = 1;

// 创建新用户
export const createUser = (userData) => {
  const newUser = {
    id: userIdCounter++,
    username: userData.username,
    email: userData.email,
    password: userData.password, // 注意：实际应用中应该对密码进行哈希处理
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  users.push(newUser);
  return { ...newUser, password: undefined }; // 返回用户信息时不包含密码
};

// 通过电子邮件查找用户
export const findUserByEmail = (email) => {
  return users.find(user => user.email === email);
};

// 通过用户名查找用户
export const findUserByUsername = (username) => {
  return users.find(user => user.username === username);
};

// 通过ID查找用户
export const findUserById = (id) => {
  return users.find(user => user.id === id);
};

// 获取所有用户（不包含密码）
export const getAllUsers = () => {
  return users.map(user => ({
    ...user,
    password: undefined
  }));
};

// 更新用户信息
export const updateUser = (id, userData) => {
  const userIndex = users.findIndex(user => user.id === id);
  if (userIndex === -1) return null;
  
  users[userIndex] = {
    ...users[userIndex],
    ...userData,
    updatedAt: new Date()
  };
  
  return { ...users[userIndex], password: undefined };
};

// 删除用户
export const deleteUser = (id) => {
  const userIndex = users.findIndex(user => user.id === id);
  if (userIndex === -1) return false;
  
  users.splice(userIndex, 1);
  return true;
}; 