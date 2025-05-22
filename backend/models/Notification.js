import mongoose from "mongoose";

/**
 * 通知模型
 * 用于存储用户通知
 */
const notificationSchema = new mongoose.Schema(
  {
    // 通知接收者ID
    userId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    // 通知类型
    type: {
      type: String,
      enum: ["info", "success", "warning", "error"],
      default: "info",
    },
    // 通知标题
    title: {
      type: String,
      required: true,
    },
    // 通知内容
    message: {
      type: String,
      required: true,
    },
    // 相关资源ID（如OCR结果ID）
    resourceId: {
      type: String,
      default: null,
    },
    // 相关资源类型
    resourceType: {
      type: String,
      default: null,
    },
    // 通知链接
    link: {
      type: String,
      default: null,
    },
    // 是否已读
    isRead: {
      type: Boolean,
      default: false,
    },
    // 是否已删除
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// 创建索引
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

// 虚拟字段：已读状态文本
notificationSchema.virtual("readStatusText").get(function () {
  return this.isRead ? "已读" : "未读";
});

// 虚拟字段：创建时间文本
notificationSchema.virtual("createdAtText").get(function () {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffMs = now - created;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    return `${diffDay}天前`;
  } else if (diffHour > 0) {
    return `${diffHour}小时前`;
  } else if (diffMin > 0) {
    return `${diffMin}分钟前`;
  } else {
    return "刚刚";
  }
});

// 转换为JSON时包含虚拟字段
notificationSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Notification = mongoose.model("Notification", notificationSchema);
