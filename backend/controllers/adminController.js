import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";
import mongoose from "mongoose";
import User from "../models/User.js";
import OcrRecord from "../models/OcrRecord.js";

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 记录API请求日志
const apiLogs = [];
const MAX_LOGS = 100;

// 记录请求开始时间
export function logRequest(req, res, next) {
  req.startTime = Date.now();
  next();
}

// 记录请求结束时间和状态
export function logResponse(req, res, next) {
  const originalSend = res.send;

  res.send = function (body) {
    const responseTime = Date.now() - req.startTime;

    // 添加到日志
    apiLogs.unshift({
      timestamp: new Date(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      responseTime,
      ip: req.ip,
    });

    // 保持日志数量在限制之内
    if (apiLogs.length > MAX_LOGS) {
      apiLogs.pop();
    }

    // 调用原始的send方法
    return originalSend.call(this, body);
  };

  next();
}

// 获取服务器状态
export async function getServerStatus(req, res) {
  try {
    const startTime = process.uptime();

    return res.json({
      success: true,
      status: {
        online: true,
        version: "1.0.0",
        uptime: Math.floor(startTime),
        environment: process.env.NODE_ENV || "development",
      },
    });
  } catch (error) {
    console.error("获取服务器状态失败:", error);
    return res.status(500).json({
      success: false,
      message: "获取服务器状态失败",
      error: error.message,
    });
  }
}

// 获取数据库状态
export async function getDbStatus(req, res) {
  try {
    // 测试数据库连接状态
    const connected = mongoose.connection.readyState === 1;

    return res.json({
      success: true,
      status: {
        connected,
        type: "MongoDB",
        uri: process.env.MONGODB_URI,
        name: mongoose.connection.name,
      },
    });
  } catch (error) {
    console.error("获取数据库状态失败:", error);
    return res.status(500).json({
      success: false,
      message: "获取数据库状态失败",
      error: error.message,
      status: {
        connected: false,
        type: "MongoDB",
        uri: "",
        name: "",
      },
    });
  }
}

// 获取API统计数据
export async function getApiStatus(req, res) {
  try {
    // 计算API请求成功率和平均响应时间
    let totalRequests = apiLogs.length;
    let successfulRequests = apiLogs.filter((log) => log.status < 400).length;
    let totalResponseTime = apiLogs.reduce((sum, log) => sum + log.responseTime, 0);

    const successRate =
      totalRequests > 0 ? `${Math.round((successfulRequests / totalRequests) * 100)}%` : "0%";

    const avgResponseTime =
      totalRequests > 0 ? `${Math.round(totalResponseTime / totalRequests)}ms` : "0ms";

    return res.json({
      success: true,
      status: {
        totalRequests,
        successRate,
        avgResponseTime,
      },
    });
  } catch (error) {
    console.error("获取API状态失败:", error);
    return res.status(500).json({
      success: false,
      message: "获取API状态失败",
      error: error.message,
    });
  }
}

// 获取所有用户
export async function getUsers(req, res) {
  try {
    const users = await User.find({}, "username email createdAt updatedAt");

    return res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("获取用户数据失败:", error);
    return res.status(500).json({
      success: false,
      message: "获取用户数据失败",
      error: error.message,
    });
  }
}

// 获取所有OCR记录
export async function getOcrRecords(req, res) {
  try {
    const records = await OcrRecord.find({}, "_id userId filename language createdAt");
    
    // 将记录转换为普通对象并使用数字ID
    const formattedRecords = records.map(record => {
      const plainRecord = record.toObject();
      // 如果记录有_id属性，将其转换为id
      if (plainRecord._id) {
        plainRecord.id = plainRecord._id.toString();
        // 尝试将id转换为数字，如果可以的话
        if (!isNaN(plainRecord.id)) {
          plainRecord.id = parseInt(plainRecord.id, 10);
        }
        delete plainRecord._id;
      }
      return plainRecord;
    });

    return res.json({
      success: true,
      records: formattedRecords,
    });
  } catch (error) {
    console.error("获取OCR记录失败:", error);
    return res.status(500).json({
      success: false,
      message: "获取OCR记录失败",
      error: error.message,
    });
  }
}

// 获取API日志
export async function getLogs(req, res) {
  try {
    return res.json({
      success: true,
      logs: apiLogs,
    });
  } catch (error) {
    console.error("获取API日志失败:", error);
    return res.status(500).json({
      success: false,
      message: "获取API日志失败",
      error: error.message,
    });
  }
}

// 清除API日志
export async function clearLogs(req, res) {
  try {
    apiLogs.length = 0;

    return res.json({
      success: true,
      message: "日志已清除",
    });
  } catch (error) {
    console.error("清除API日志失败:", error);
    return res.status(500).json({
      success: false,
      message: "清除API日志失败",
      error: error.message,
    });
  }
}

// 执行MongoDB查询
export async function executeQuery(req, res) {
  try {
    const { collection, query, projection, limit = 10 } = req.body;

    if (!collection || !query) {
      return res.status(400).json({
        success: false,
        error: "无效的查询参数，需要指定集合和查询条件",
        executionTime: 0,
        results: [],
      });
    }

    // 执行查询
    const startTime = Date.now();
    const db = mongoose.connection.db;

    // 确保查询和投影是对象而不是字符串
    const queryObj = typeof query === 'string' ? JSON.parse(query) : query;
    const projectionObj = projection ? (typeof projection === 'string' ? JSON.parse(projection) : projection) : {};

    // 执行查询，限制最多返回的文档
    let results = await db
      .collection(collection)
      .find(queryObj)
      .project(projectionObj)
      .limit(limit)
      .toArray();
      
    // 如果是OCR记录集合，处理ID和用户名
    if (collection.toLowerCase() === 'ocrrecords') {
      // 获取所有用户ID和用户名的映射
      const users = await db.collection('users').find({}, { projection: { _id: 1, username: 1 } }).toArray();
      const userMap = {};
      users.forEach(user => {
        userMap[user._id.toString()] = user.username;
      });
      
      // 处理每个记录
      results = results.map(record => {
        const formattedRecord = { ...record };
        
        // 处理ID，将ObjectId转换为数字ID
        if (formattedRecord._id) {
          formattedRecord.id = formattedRecord._id.toString();
          // 尝试将id转换为数字
          if (!isNaN(formattedRecord.id)) {
            formattedRecord.id = parseInt(formattedRecord.id, 10);
          }
          delete formattedRecord._id;
        }
        
        // 将用户ID替换为用户名
        if (formattedRecord.userId && userMap[formattedRecord.userId.toString()]) {
          formattedRecord.username = userMap[formattedRecord.userId.toString()];
          // 保留原始用户ID作为参考
          formattedRecord.userId = formattedRecord.userId.toString();
        }
        
        return formattedRecord;
      });
    }

    const executionTime = Date.now() - startTime;

    return res.json({
      success: true,
      executionTime,
      results: results || [],
    });
  } catch (error) {
    console.error("执行MongoDB查询失败:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      executionTime: 0,
      results: [],
    });
  }
}

// 将用户提升为管理员
export async function promoteUserToAdmin(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "未提供用户ID",
      });
    }

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    // 更新用户为管理员
    user.isAdmin = true;
    await user.save();

    return res.json({
      success: true,
      message: "用户已成功提升为管理员",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("提升管理员失败:", error);
    return res.status(500).json({
      success: false,
      message: "提升管理员失败",
      error: error.message,
    });
  }
}
