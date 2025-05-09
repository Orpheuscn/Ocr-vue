// 检查数据库架构
import { sequelize } from '../db/config.js';
import connectDB from '../db/config.js';

/**
 * 检查数据库架构，列出所有表及其列信息
 */
async function checkDatabaseSchema() {
  try {
    // 连接数据库
    await connectDB();
    
    // 获取所有表信息
    const query = `
      SELECT 
        name
      FROM 
        sqlite_master
      WHERE 
        type ='table' AND 
        name NOT LIKE 'sqlite_%';
    `;
    
    const [tables] = await sequelize.query(query);
    console.log(`数据库中发现 ${tables.length} 个表：`);
    
    // 遍历每个表，获取列信息
    for (const table of tables) {
      const tableName = table.name;
      console.log(`\n表名: ${tableName}`);
      
      const [columns] = await sequelize.query(`PRAGMA table_info(${tableName});`);
      
      console.log('列信息:');
      columns.forEach(column => {
        console.log(`  - ${column.name} (${column.type}${column.notnull ? ', NOT NULL' : ''}${column.pk ? ', PRIMARY KEY' : ''})`);
      });
      
      // 查询并显示第一条记录示例
      const [records] = await sequelize.query(`SELECT * FROM ${tableName} LIMIT 1;`);
      if (records.length > 0) {
        console.log('记录示例:');
        console.log(JSON.stringify(records[0], null, 2));
      } else {
        console.log('表中没有记录');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('检查数据库架构时出错:', error);
    process.exit(1);
  }
}

// 执行检查函数
checkDatabaseSchema(); 