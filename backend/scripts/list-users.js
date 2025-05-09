import { sequelize } from '../db/config.js';
import User from '../models/User.js';

async function listUsers() {
  try {
    // 获取所有用户
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'isAdmin', 'createdAt', 'lastLogin']
    });
    
    console.log('\n数据库中的用户列表:');
    console.log('==============================================');
    
    if (users.length === 0) {
      console.log('没有找到任何用户');
    } else {
      users.forEach(user => {
        const userData = user.toJSON();
        console.log(`ID: ${userData.id}`);
        console.log(`用户名: ${userData.username}`);
        console.log(`邮箱: ${userData.email}`);
        console.log(`管理员: ${userData.isAdmin ? '是' : '否'}`);
        console.log(`创建时间: ${userData.createdAt}`);
        console.log(`最后登录: ${userData.lastLogin || '从未登录'}`);
        console.log('----------------------------------------------');
      });
      
      console.log(`共 ${users.length} 个用户账号`);
    }
  } catch (error) {
    console.error('查询用户失败:', error);
  } finally {
    await sequelize.close();
  }
}

// 执行查询
listUsers(); 