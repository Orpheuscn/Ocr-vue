import mongoose from "mongoose";

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
 *           type: string
 *           description: OCR 记录 ID（自动生成）
 *         userId:
 *           type: string
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
 *           enum: [text, table, mixed, image_recognition]
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
 *         userId: "60d0fe4f5311236168a109ca"
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

const ocrRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
      enum: ["image", "pdf"],
    },
    pageCount: {
      type: Number,
      required: true,
      default: 1,
    },
    recognitionMode: {
      type: String,
      required: true,
      default: "text",
      enum: ["text", "table", "mixed", "image_recognition"],
    },
    language: {
      type: String,
      required: true,
      default: "auto",
    },
    processingTime: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      required: true,
      default: "success",
      enum: ["success", "error", "processing"],
    },
    textLength: {
      type: Number,
      required: true,
      default: 0,
    },
    extractedText: {
      type: String,
      default: "",
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
// 明确指定集合名称为'ocrrecords'，确保所有记录存储在同一个集合中
const OcrRecord = mongoose.model("OcrRecord", ocrRecordSchema, "ocrrecords");

export default OcrRecord;
