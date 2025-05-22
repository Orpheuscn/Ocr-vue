import { mongoose } from "../db/config.js";

/**
 * @swagger
 * components:
 *   schemas:
 *     SavedOcrResult:
 *       type: object
 *       required:
 *         - userId
 *         - text
 *       properties:
 *         id:
 *           type: string
 *           description: 自动生成的唯一ID
 *         userId:
 *           type: string
 *           description: 用户ID
 *         text:
 *           type: string
 *           description: OCR识别的文本内容
 *         language:
 *           type: string
 *           description: 识别的语言代码
 *         languageName:
 *           type: string
 *           description: 识别的语言名称
 *         preview:
 *           type: string
 *           description: 文本预览（前100个字符）
 *         wordCount:
 *           type: number
 *           description: 单词数量
 *         charCount:
 *           type: number
 *           description: 字符数量
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 *       example:
 *         userId: "60d0fe4f5311236168a109ca"
 *         text: "这是一段OCR识别的文本内容"
 *         language: "zh"
 *         languageName: "中文"
 *         preview: "这是一段OCR识别的文本内容"
 *         wordCount: 10
 *         charCount: 30
 */

const savedOcrResultSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      default: "und",
    },
    languageName: {
      type: String,
      default: "未知语言",
    },
    preview: {
      type: String,
      default: function () {
        // 自动生成预览，取前100个字符
        return this.text ? this.text.substring(0, 100) + (this.text.length > 100 ? "..." : "") : "";
      },
    },
    wordCount: {
      type: Number,
      default: function () {
        // 自动计算单词数量
        return this.text ? this.text.split(/\s+/).filter(Boolean).length : 0;
      },
    },
    charCount: {
      type: Number,
      default: function () {
        // 自动计算字符数量
        return this.text ? this.text.length : 0;
      },
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    publishStatus: {
      type: String,
      enum: ["published", "flagged", "removed", null],
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: String,
      ref: "User",
      default: null,
    },
    reviewNote: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

// 创建mongoose模型
// 明确指定集合名称为'savedocrresults'
const SavedOcrResult = mongoose.model("SavedOcrResult", savedOcrResultSchema, "savedocrresults");

export default SavedOcrResult;
