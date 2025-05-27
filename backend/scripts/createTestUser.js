import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// 用户模型
const userSchema = new mongoose.Schema({
  _id: {
    type: String,
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
    required: function () {
      return !this.isOAuthUser;
    },
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
  settings: {
    type: Object,
    default: {},
  },
  status: {
    type: String,
    default: "active",
  },
  googleId: {
    type: String,
    sparse: true,
  },
  appleId: {
    type: String,
    sparse: true,
  },
  avatar: {
    type: String,
  },
  isOAuthUser: {
    type: Boolean,
    default: false,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
  },
  emailVerificationExpires: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
    },
  },
});

// 预处理钩子
userSchema.pre("save", function (next) {
  if (!this._id) {
    this._id = new mongoose.Types.ObjectId().toString();
  }
  
  if (this.role === "admin" && this.isAdmin === undefined) {
    this.isAdmin = true;
  } else if (this.isAdmin && this.role === undefined) {
    this.role = "admin";
  }
  next();
});

const User = mongoose.model("User", userSchema);

async function createTestUsers() {
  try {
    // 连接数据库
    console.log('连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: process.env.MONGODB_DB_NAME,
    });
    console.log('数据库连接成功');

    // 检查现有用户
    const existingUsers = await User.find({});
    console.log(`当前数据库中有 ${existingUsers.length} 个用户`);
    
    if (existingUsers.length > 0) {
      console.log('现有用户:');
      existingUsers.forEach(user => {
        console.log(`- ${user.email} (${user.username})`);
      });
    }

    // 创建测试用户
    const testUsers = [
      {
        username: 'testuser',
        email: '123@123.com',
        password: '123456',
        isAdmin: false,
        emailVerified: true
      },
      {
        username: 'admin',
        email: '624160037@qq.com',
        password: '123456',
        isAdmin: true,
        role: 'admin',
        emailVerified: true
      }
    ];

    for (const userData of testUsers) {
      try {
        // 检查用户是否已存在
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
          console.log(`用户 ${userData.email} 已存在，跳过创建`);
          continue;
        }

        // 加密密码
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        // 创建用户
        const newUser = new User({
          ...userData,
          password: hashedPassword
        });

        await newUser.save();
        console.log(`✅ 成功创建用户: ${userData.email} (${userData.username})`);
      } catch (error) {
        console.error(`❌ 创建用户 ${userData.email} 失败:`, error.message);
      }
    }

    // 验证创建结果
    const allUsers = await User.find({});
    console.log(`\n数据库中现在有 ${allUsers.length} 个用户:`);
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.username}) - ${user.isAdmin ? '管理员' : '普通用户'}`);
    });

  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 运行脚本
createTestUsers();
