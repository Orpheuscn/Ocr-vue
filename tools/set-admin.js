#!/usr/bin/env node

/**
 * MongoDB用户管理员权限设置工具
 *
 * 此脚本用于设置用户的管理员权限
 * 使用方式: node set-admin.js <email> [true|false]
 * 例如: node set-admin.js admin@example.com true
 */

import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 确定当前环境
const env = process.env.NODE_ENV || "development";

// 根据环境选择配置文件
let envFile = ".env.local";
if (env === "production") {
  envFile = ".env.production";
} else if (env === "test") {
  envFile = ".env.test";
}

// 尝试加载环境变量文件
const envPath = path.resolve(__dirname, `../backend/${envFile}`);
const defaultEnvPath = path.resolve(__dirname, "../backend/.env");

// 加载环境变量
if (fs.existsSync(envPath)) {
  console.log(`加载环境变量文件: ${envPath}`);
  dotenv.config({ path: envPath });
} else if (fs.existsSync(defaultEnvPath)) {
  console.log(`加载默认环境变量文件: ${defaultEnvPath}`);
  dotenv.config({ path: defaultEnvPath });
} else {
  console.log("未找到环境变量文件，使用默认设置");
  dotenv.config();
}

// 颜色定义
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
};

// 日志函数
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
};

// MongoDB 连接配置
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ocr_app";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "ocr_app";

// 连接 MongoDB
async function connectToMongoDB() {
  log.info(`正在连接 MongoDB: ${MONGODB_URI}`);
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    log.success("已成功连接到 MongoDB");
    return client;
  } catch (err) {
    log.error(`MongoDB 连接错误: ${err.message}`);
    process.exit(1);
  }
}

// 设置用户管理员权限
async function setAdminStatus(client, email, isAdmin) {
  const usersCollection = client.db(MONGODB_DB_NAME).collection("users");

  // 查找用户
  const user = await usersCollection.findOne({ email });
  if (!user) {
    log.error(`未找到邮箱为 ${email} 的用户`);
    return false;
  }

  // 更新用户权限
  const result = await usersCollection.updateOne(
    { email },
    {
      $set: {
        isAdmin: isAdmin,
        role: isAdmin ? "admin" : "user",
      },
    }
  );

  if (result.modifiedCount > 0) {
    log.success(`用户 ${user.username} (${email}) 的管理员状态已设置为: ${isAdmin ? "是" : "否"}`);
    return true;
  } else {
    log.warn(
      `用户 ${user.username} (${email}) 的管理员状态未变更，可能已经是 ${
        isAdmin ? "管理员" : "普通用户"
      }`
    );
    return false;
  }
}

// 列出所有用户及其管理员状态
async function listUsers(client) {
  const usersCollection = client.db(MONGODB_DB_NAME).collection("users");
  const users = await usersCollection.find({}).toArray();

  if (users.length === 0) {
    log.warn("没有找到任何用户");
    return;
  }

  log.info("\n所有用户信息：");
  console.log("=============================================");
  console.log(" ID   | 用户名         | 邮箱                  | 管理员");
  console.log("-----|--------------|---------------------|-------");

  users.forEach((user) => {
    const isAdmin = user.isAdmin === true;
    const role = user.role || "未设置";
    console.log(
      ` ${user._id.toString().padEnd(4)} | ${(user.username || "").padEnd(14)} | ${(
        user.email || ""
      ).padEnd(21)} | ${isAdmin ? "是" : "否"} (${role})`
    );
  });

  console.log("=============================================");
}

// 执行主函数
async function main() {
  let client;
  try {
    // 获取命令行参数
    const args = process.argv.slice(2);
    const email = args[0];
    const isAdminArg = args[1];

    // 连接 MongoDB
    client = await connectToMongoDB();

    // 如果没有参数，则列出所有用户
    if (!email) {
      await listUsers(client);
      log.info("用法: node set-admin.js <email> [true|false]");
      log.info("示例: node set-admin.js admin@example.com true");
      return;
    }

    // 设置管理员状态
    const isAdmin = isAdminArg === undefined ? true : isAdminArg.toLowerCase() === "true";
    await setAdminStatus(client, email, isAdmin);

    // 列出更新后的用户列表
    await listUsers(client);
  } catch (err) {
    log.error(`发生错误: ${err.message}`);
  } finally {
    // 关闭数据库连接
    if (client) {
      await client.close();
      log.info("MongoDB 连接已关闭");
    }
  }
}

// 执行主函数
main();
