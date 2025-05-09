import { DataTypes } from 'sequelize';
import { sequelize } from '../db/config.js';
import User from './User.js';

const OcrRecord = sequelize.define('OcrRecord', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['image', 'pdf']]
    }
  },
  pageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  recognitionMode: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'text',
    validate: {
      isIn: [['text', 'table', 'mixed']]
    }
  },
  language: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'auto'
  },
  processingTime: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'success',
    validate: {
      isIn: [['success', 'error', 'processing']]
    }
  },
  textLength: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  extractedText: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  // 其他模型选项
  timestamps: true, // 创建 createdAt 和 updatedAt 字段
  paranoid: true,   // 软删除 - 创建 deletedAt 字段
  
  // 自定义表名
  tableName: 'ocr_records'
});

// 设置关联关系
OcrRecord.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(OcrRecord, { foreignKey: 'userId' });

export default OcrRecord; 