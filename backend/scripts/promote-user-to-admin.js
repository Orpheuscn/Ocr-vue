import { sequelize } from '../db/config.js';
import User from '../models/User.js';

async function promoteUserToAdmin(userIdentifier) {
  try {
    console.log(`开始提升用户为管理员: ${userIdentifier}`);
    
    // 查找用户（可以通过ID、用户名或邮箱）
    let user;
    
    // 尝试按ID查找
    if (!isNaN(userIdentifier)) {
      user = await User.findByPk(userIdentifier);
    }
    
    // 尝试按用户名或邮箱查找
    if (!user) {
      user = await User.findOne({
        where: {
          [sequelize.Op.or]: [
            { username: userIdentifier },
            { email: userIdentifier }
          ]
        }
      });
    }
    
    // 如果找不到用户
    if (!user) {
      console.error(`找不到用户: ${userIdentifier}`);
      process.exit(1);
    }
    
    // 提升用户为管理员
    user.isAdmin = true;
    await user.save();
    
    console.log(`成功将用户 [${user.username}] (ID: ${user.id}) 提升为管理员`);
  } catch (error) {
    console.error('提升管理员失败:', error);
  } finally {
    await sequelize.close();
  }
}

// 从命令行参数获取用户标识符
const userIdentifier = process.argv[2];

if (!userIdentifier) {
  console.error('请提供用户ID、用户名或邮箱作为参数');
  console.error('用法: node scripts/promote-user-to-admin.js <用户ID|用户名|邮箱>');
  process.exit(1);
}

// 执行提升操作
promoteUserToAdmin(userIdentifier); 