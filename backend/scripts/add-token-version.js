import { sequelize } from '../db/config.js';
import User from '../models/User.js';

const addTokenVersionField = async () => {
  try {
    console.log('开始添加tokenVersion字段...');
    
    // 检查字段是否已存在
    const query = `PRAGMA table_info(users);`;
    const tableInfo = await sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
    
    // 查找是否已存在tokenVersion字段
    const hasTokenVersionField = tableInfo.some(column => column.name === 'tokenVersion');
    
    if (hasTokenVersionField) {
      console.log('tokenVersion字段已存在，无需添加');
      return;
    }
    
    // 添加字段
    const alterQuery = `ALTER TABLE users ADD COLUMN tokenVersion INTEGER DEFAULT 0;`;
    await sequelize.query(alterQuery);
    
    console.log('成功添加tokenVersion字段');
    
    // 更新所有现有用户的tokenVersion值
    const users = await User.findAll();
    console.log(`找到${users.length}个用户，正在更新tokenVersion...`);
    
    for (const user of users) {
      user.tokenVersion = 0;
      await user.save();
    }
    
    console.log('所有用户的tokenVersion已更新');
  } catch (error) {
    console.error('添加tokenVersion字段失败:', error);
    throw error;
  }
};

// 执行迁移
addTokenVersionField()
  .then(() => {
    console.log('数据库迁移完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('数据库迁移失败:', error);
    process.exit(1);
  }); 