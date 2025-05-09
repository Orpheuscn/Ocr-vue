// 强制同步数据库模型
import User from '../models/User.js';
import OcrRecord from '../models/OcrRecord.js';
import { sequelize } from '../db/config.js';
import connectDB from '../db/config.js';

/**
 * 强制同步数据库模型，更新表结构
 */
async function syncModel() {
  try {
    // 连接数据库
    await connectDB();
    
    console.log('开始强制同步数据库模型...');
    
    // 同步单个模型
    console.log('同步User模型...');
    await User.sync({ alter: true });
    console.log('同步OcrRecord模型...');
    await OcrRecord.sync({ alter: true });
    
    // 或者同步所有模型
    // console.log('同步所有模型...');
    // await sequelize.sync({ force: false, alter: true });
    
    console.log('数据库模型同步完成');
    
    // 验证用户模型属性
    const userAttributes = User.getAttributes();
    console.log('\nUser模型属性列表:');
    for (const [attributeName, attribute] of Object.entries(userAttributes)) {
      console.log(`- ${attributeName} (${attribute.type.constructor.name})`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('同步数据库模型时出错:', error);
    process.exit(1);
  }
}

// 执行同步函数
syncModel(); 