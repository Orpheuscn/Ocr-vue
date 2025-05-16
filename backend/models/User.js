import { DataTypes } from 'sequelize';
import { sequelize } from '../db/config.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: integer
 *           description: 用户ID（自动生成）
 *         username:
 *           type: string
 *           description: 用户名
 *         email:
 *           type: string
 *           format: email
 *           description: 用户邮箱
 *         password:
 *           type: string
 *           format: password
 *           description: 用户密码（已加密）
 *         isAdmin:
 *           type: boolean
 *           description: 是否为管理员用户
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: 用户标签
 *         ocrStats:
 *           type: object
 *           properties:
 *             totalImages:
 *               type: integer
 *               description: 用户处理的总图片数量
 *           description: OCR 使用统计
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: 上次登录时间
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 *       example:
 *         username: user123
 *         email: user@example.com
 *         isAdmin: false
 *         tags: ["tag1", "tag2"]
 *         ocrStats: {"totalImages": 10}
 *         lastLogin: "2023-01-01T00:00:00.000Z"
 */
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
  },
  tokenVersion: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '令牌版本，用于追踪和失效刷新令牌'
  }
}, {
  // 其他模型选项
  timestamps: true, // 创建 createdAt 和 updatedAt 字段
  paranoid: true,   // 软删除 - 创建 deletedAt 字段
  
  // 自定义表名
  tableName: 'users'
});

export default User; 