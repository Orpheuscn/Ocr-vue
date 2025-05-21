// models/UserActivity.js
import { mongoose } from "../db/config.js";

/**
 * @swagger
 * components:
 *   schemas:
 *     UserActivity:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           description: 用户ID
 *         type:
 *           type: string
 *           description: 活动类型
 *         category:
 *           type: string
 *           description: 活动类别
 *         data:
 *           type: object
 *           description: 活动相关数据
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: 活动时间
 *         ipAddress:
 *           type: string
 *           description: 用户IP地址
 *         userAgent:
 *           type: string
 *           description: 用户代理信息
 *         sessionId:
 *           type: string
 *           description: 会话ID
 *         page:
 *           type: string
 *           description: 页面路径
 */

const userActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      index: true
    },
    category: {
      type: String,
      required: true,
      index: true
    },
    data: {
      type: Object,
      default: {}
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    ipAddress: {
      type: String,
      index: true
    },
    userAgent: {
      type: String
    },
    sessionId: {
      type: String,
      index: true
    },
    page: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// 创建索引以提高查询性能
userActivitySchema.index({ userId: 1, timestamp: -1 });
userActivitySchema.index({ type: 1, category: 1 });
userActivitySchema.index({ sessionId: 1, timestamp: 1 });

// 添加TTL索引，自动删除旧数据（例如90天后）
userActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const UserActivity = mongoose.model("UserActivity", userActivitySchema);

export default UserActivity;
