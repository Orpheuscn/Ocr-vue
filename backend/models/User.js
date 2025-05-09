import { DataTypes } from 'sequelize';
import { sequelize } from '../db/config.js';

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否为管理员用户'
  },
  tags: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('tags');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('tags', JSON.stringify(value || []));
    }
  },
  ocrStats: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '{"totalImages": 0}',
    get() {
      const rawValue = this.getDataValue('ocrStats');
      return rawValue ? JSON.parse(rawValue) : { totalImages: 0 };
    },
    set(value) {
      this.setDataValue('ocrStats', JSON.stringify(value || { totalImages: 0 }));
    }
  },
  lastLogin: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  // 其他模型选项
  timestamps: true, // 创建 createdAt 和 updatedAt 字段
  paranoid: true,   // 软删除 - 创建 deletedAt 字段
  
  // 自定义表名
  tableName: 'users'
});

export default User; 