import mongoose from "mongoose";

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
 *           type: string
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

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String, // 允许使用字符串ID以兼容迁移数据
      required: false,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "请输入有效的电子邮件地址"],
    },
    password: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    tags: {
      type: [String],
      default: [],
    },
    ocrStats: {
      type: Object,
      default: { totalImages: 0 },
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    // 兼容迁移数据中可能存在的其他字段
    settings: {
      type: Object,
      default: {},
    },
    status: {
      type: String,
      default: "active",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password; // 确保password不会被返回
      },
    },
  }
);

// 添加一个预处理钩子，确保文档有_id字段并同步isAdmin与role字段
userSchema.pre("save", function (next) {
  // 确保文档有_id字段
  if (!this._id) {
    this._id = new mongoose.Types.ObjectId().toString();
  }
  
  // 如果迁移数据中有role字段但没有isAdmin字段，则根据role设置isAdmin
  if (this.role === "admin" && this.isAdmin === undefined) {
    this.isAdmin = true;
  }
  // 如果设置了isAdmin但没有role字段，则相应设置role
  else if (this.isAdmin && this.role === undefined) {
    this.role = "admin";
  }
  next();
});

// 创建mongoose模型
const User = mongoose.model("User", userSchema);

export default User;
