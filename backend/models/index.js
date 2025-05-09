import User from './User.js';
import OcrRecord from './OcrRecord.js';
import { sequelize } from '../db/config.js';

// 确保模型关联已经建立
OcrRecord.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(OcrRecord, { foreignKey: 'userId' });

export {
  sequelize,
  User,
  OcrRecord
}; 