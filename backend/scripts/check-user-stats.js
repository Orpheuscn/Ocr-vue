// 检查用户统计数据的结构
import User from '../models/User.js';
import connectDB from '../db/config.js';

/**
 * 检查用户的ocrStats数据结构
 */
async function checkUserStats() {
  try {
    // 连接数据库
    await connectDB();
    
    // 获取所有用户
    const users = await User.findAll();
    console.log(`找到 ${users.length} 个用户记录`);
    
    // 检查每个用户的ocrStats结构
    for (const user of users) {
      console.log(`\n用户 ID: ${user.id}, 用户名: ${user.username}`);
      console.log('ocrStats 数据结构:');
      console.log(JSON.stringify(user.ocrStats, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('检查数据时出错:', error);
    process.exit(1);
  }
}

// 执行检查函数
checkUserStats(); 