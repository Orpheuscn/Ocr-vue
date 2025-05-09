// 检查User模型的属性
import User from '../models/User.js';
import connectDB from '../db/config.js';

/**
 * 检查User模型的属性结构
 */
async function checkModelAttributes() {
  try {
    // 连接数据库
    await connectDB();
    
    // 获取User模型的所有属性
    const userAttributes = User.getAttributes();
    
    console.log('User模型属性列表:');
    for (const [attributeName, attribute] of Object.entries(userAttributes)) {
      console.log(`- ${attributeName} (${attribute.type.constructor.name})`);
    }
    
    // 检查是否存在scanButtonClicks属性
    if (userAttributes.scanButtonClicks) {
      console.log('\n警告：模型中仍然存在scanButtonClicks属性！');
    } else {
      console.log('\n模型中不存在scanButtonClicks属性');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('检查模型属性时出错:', error);
    process.exit(1);
  }
}

// 执行检查函数
checkModelAttributes(); 