import User from "./User.js";
import OcrRecord from "./OcrRecord.js";
import SavedOcrResult from "./SavedOcrResult.js";
import { Notification } from "./Notification.js";
import { mongoose } from "../db/config.js";

// MongoDB中的关联是通过引用字段实现的
// OcrRecord模型中的userId字段引用了User模型
// SavedOcrResult模型中的userId字段引用了User模型

export { mongoose, User, OcrRecord, SavedOcrResult, Notification };
