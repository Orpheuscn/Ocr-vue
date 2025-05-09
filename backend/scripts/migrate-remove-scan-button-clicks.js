// 删除scanButtonClicks列的数据库迁移脚本
import { sequelize } from '../db/config.js';
import connectDB from '../db/config.js';

/**
 * 数据库迁移：删除users表中的scanButtonClicks列
 */
async function removeScanButtonClicksColumn() {
  try {
    // 连接数据库
    await connectDB();
    
    console.log('开始数据库迁移操作...');
    
    // 1. 创建临时表，不包含scanButtonClicks列
    await sequelize.query(`
      CREATE TABLE users_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        isAdmin TINYINT(1) NOT NULL DEFAULT 0,
        tags TEXT,
        ocrStats TEXT,
        lastLogin DATETIME,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        deletedAt DATETIME
      )
    `);
    
    console.log('1. 创建临时表成功');
    
    // 2. 复制数据到临时表
    await sequelize.query(`
      INSERT INTO users_temp 
      SELECT 
        id, username, email, password, isAdmin, tags, ocrStats, 
        lastLogin, createdAt, updatedAt, deletedAt
      FROM users
    `);
    
    console.log('2. 数据复制到临时表成功');
    
    // 3. 删除原表
    await sequelize.query(`DROP TABLE users`);
    
    console.log('3. 删除原表成功');
    
    // 4. 重命名临时表为原表名
    await sequelize.query(`ALTER TABLE users_temp RENAME TO users`);
    
    console.log('4. 重命名临时表成功');
    
    // 5. 重建索引
    await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)`);
    await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username)`);
    
    console.log('5. 索引重建成功');
    
    console.log('\n数据库迁移完成：成功删除scanButtonClicks列');
    
    // 验证结果
    const [columns] = await sequelize.query(`PRAGMA table_info(users);`);
    console.log('\n更新后的users表结构:');
    columns.forEach(column => {
      console.log(`  - ${column.name} (${column.type}${column.notnull ? ', NOT NULL' : ''}${column.pk ? ', PRIMARY KEY' : ''})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('数据库迁移时出错:', error);
    process.exit(1);
  }
}

// 执行迁移函数
removeScanButtonClicksColumn(); 