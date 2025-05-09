import { sequelize } from '../db/config.js';
import User from '../models/User.js';

async function addAdminColumn() {
  try {
    // 检查isAdmin列是否存在
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('users');
    
    if (!tableInfo.isAdmin) {
      console.log('正在添加isAdmin列到用户表...');
      await queryInterface.addColumn('users', 'isAdmin', {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
      console.log('成功添加isAdmin列');
    } else {
      console.log('isAdmin列已存在，无需添加');
    }
    
    console.log('数据库迁移成功完成');
  } catch (error) {
    console.error('数据库迁移失败:', error);
  } finally {
    await sequelize.close();
  }
}

// 执行迁移
addAdminColumn(); 