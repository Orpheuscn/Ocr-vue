import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  tags: {
    type: [String],
    default: []
  },
  ocrStats: {
    totalImages: {
      type: Number,
      default: 0
    }
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // 自动添加createdAt和updatedAt字段
});

// 移除密码等敏感信息的方法
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User; 