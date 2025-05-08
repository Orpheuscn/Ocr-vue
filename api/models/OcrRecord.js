import mongoose from 'mongoose';

const ocrRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['image', 'pdf'],
    required: true
  },
  pageCount: {
    type: Number,
    default: 1 // 图片为1，PDF为实际页数
  },
  recognitionMode: {
    type: String,
    enum: ['text', 'table', 'mixed'],
    default: 'text'
  },
  language: {
    type: String,
    default: 'auto'
  },
  processingTime: {
    type: Number, // 处理时间(毫秒)
    default: 0
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'processing'],
    default: 'success'
  },
  textLength: {
    type: Number, // 识别出的文本长度
    default: 0
  }
}, {
  timestamps: true
});

const OcrRecord = mongoose.model('OcrRecord', ocrRecordSchema);

export default OcrRecord; 