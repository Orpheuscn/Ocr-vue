import { DataTypes } from 'sequelize';
import { sequelize } from '../db/config.js';
import User from './User.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     OcrRecord:
 *       type: object
 *       required:
 *         - userId
 *         - filename
 *         - fileType
 *       properties:
 *         id:
 *           type: integer
 *           description: OCR 记录 ID（自动生成）
 *         userId:
 *           type: integer
 *           description: 关联的用户 ID
 *         filename:
 *           type: string
 *           description: 处理的文件名
 *         fileType:
 *           type: string
 *           enum: [image, pdf]
 *           description: 文件类型（图片或 PDF）
 *         pageCount:
 *           type: integer
 *           description: 文件页数
 *         recognitionMode:
 *           type: string
 *           enum: [text, table, mixed]
 *           description: OCR 识别模式
 *         language:
 *           type: string
 *           description: 识别语言
 *         processingTime:
 *           type: number
 *           format: float
 *           description: 处理时间（秒）
 *         status:
 *           type: string
 *           enum: [success, error, processing]
 *           description: 处理状态
 *         textLength:
 *           type: integer
 *           description: 提取的文本长度
 *         extractedText:
 *           type: string
 *           description: 提取的文本内容
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 *       example:
 *         userId: 1
 *         filename: example.jpg
 *         fileType: image
 *         pageCount: 1
 *         recognitionMode: text
 *         language: zh-CN
 *         processingTime: 2.5
 *         status: success
 *         textLength: 1000
 *         extractedText: "这是一段示例文本..."
 */
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