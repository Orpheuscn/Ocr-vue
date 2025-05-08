import mongoose from 'mongoose';
import dotenv from 'dotenv';

// 加载.env文件
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

// MongoDB连接地址
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ocr_app';

// 内存中的模拟数据存储（当MongoDB无法连接时使用）
const memoryDb = {
  users: [],
  ocrRecords: []
};

// 模拟数据查询方法
export const mockDb = {
  findUserByEmail: (email) => {
    return Promise.resolve(memoryDb.users.find(user => user.email === email));
  },
  findUserByUsername: (username) => {
    return Promise.resolve(memoryDb.users.find(user => user.username === username));
  },
  createUser: (userData) => {
    const newUser = { ...userData, id: Date.now().toString(), _id: Date.now().toString() };
    memoryDb.users.push(newUser);
    return Promise.resolve(newUser);
  },
  // 其他必要的方法
};

// 连接MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 超时时间5秒，方便快速发现问题
    });
    console.log('MongoDB 连接成功');
    return true;
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    console.log('将使用内存数据库模式作为降级策略');
    // 不终止进程，允许应用继续运行
    return false;
  }
};

export default connectDB; 