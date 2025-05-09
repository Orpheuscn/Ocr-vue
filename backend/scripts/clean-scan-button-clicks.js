// 清理数据库中的scanButtonClicks统计数据
import User from '../models/User.js';
import connectDB from '../db/config.js';

/**
 * 清理所有用户的ocrStats中的scanButtonClicks数据
 */
async function cleanScanButtonClicks() {
  try {
    // 连接数据库
    await connectDB();
    
    // 获取所有用户
    const users = await User.findAll();
    console.log(`找到 ${users.length} 个用户记录`);
    
    let updatedCount = 0;
    
    // 遍历每个用户，清理scanButtonClicks数据
    for (const user of users) {
      const ocrStats = user.ocrStats;
      
      // 检查是否存在scanButtonClicks字段
      if (ocrStats.scanButtonClicks !== undefined) {
        // 删除scanButtonClicks字段
        delete ocrStats.scanButtonClicks;
        
        // 更新用户记录
        await user.update({ ocrStats });
        updatedCount++;
      }
    }
    
    console.log(`成功清理了 ${updatedCount} 个用户的scanButtonClicks数据`);
    console.log('数据清理完成');
    
    process.exit(0);
  } catch (error) {
    console.error('清理数据时出错:', error);
    process.exit(1);
  }
}

// 执行清理函数
cleanScanButtonClicks(); 