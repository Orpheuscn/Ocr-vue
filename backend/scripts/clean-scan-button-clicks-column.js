// 清理数据库中的scanButtonClicks列数据
import { sequelize } from '../db/config.js';
import connectDB from '../db/config.js';

/**
 * 清理users表中的scanButtonClicks列数据
 */
async function cleanScanButtonClicksColumn() {
  try {
    // 连接数据库
    await connectDB();
    
    // 更新所有用户的scanButtonClicks字段为0
    const query = `UPDATE users SET scanButtonClicks = 0`;
    
    const [result, metadata] = await sequelize.query(query);
    const affectedRows = metadata || 0;
    
    console.log(`成功将 ${affectedRows} 条用户记录的scanButtonClicks重置为0`);
    
    // 查询验证结果
    const [users] = await sequelize.query(`SELECT id, username, scanButtonClicks FROM users`);
    
    console.log('\n更新后的用户数据:');
    users.forEach(user => {
      console.log(`用户ID: ${user.id}, 用户名: ${user.username}, scanButtonClicks: ${user.scanButtonClicks}`);
    });
    
    console.log('\n数据清理完成');
    
    process.exit(0);
  } catch (error) {
    console.error('清理数据时出错:', error);
    process.exit(1);
  }
}

// 执行清理函数
cleanScanButtonClicksColumn(); 