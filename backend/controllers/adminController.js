import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import { sequelize } from '../db/config.js';
import User from '../models/User.js';
import OcrRecord from '../models/OcrRecord.js';

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
  
  res.send = function(body) {
    const responseTime = Date.now() - req.startTime;
    
    // 添加到日志
    apiLogs.unshift({
      timestamp: new Date(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      responseTime,
      ip: req.ip
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
        version: '1.0.0',
        uptime: Math.floor(startTime),
        environment: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    console.error('获取服务器状态失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取服务器状态失败',
      error: error.message
    });
  }
}

// 获取数据库状态
export async function getDbStatus(req, res) {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    
    // 获取数据库路径和大小
    const dbPath = process.env.SQLITE_PATH || resolve(__dirname, '../../database/ocr_app.sqlite');
    let dbSize = 'Unknown';
    
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      dbSize = formatFileSize(stats.size);
    }
    
    return res.json({
      success: true,
      status: {
        connected: true,
        type: 'SQLite',
        path: dbPath,
        size: dbSize
      }
    });
  } catch (error) {
    console.error('获取数据库状态失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取数据库状态失败',
      error: error.message,
      status: {
        connected: false,
        type: 'SQLite',
        path: '',
        size: ''
      }
    });
  }
}

// 获取API统计数据
export async function getApiStatus(req, res) {
  try {
    // 计算API请求成功率和平均响应时间
    let totalRequests = apiLogs.length;
    let successfulRequests = apiLogs.filter(log => log.status < 400).length;
    let totalResponseTime = apiLogs.reduce((sum, log) => sum + log.responseTime, 0);
    
    const successRate = totalRequests > 0 
      ? `${Math.round((successfulRequests / totalRequests) * 100)}%` 
      : '0%';
    
    const avgResponseTime = totalRequests > 0 
      ? `${Math.round(totalResponseTime / totalRequests)}ms` 
      : '0ms';
    
    return res.json({
      success: true,
      status: {
        totalRequests,
        successRate,
        avgResponseTime
      }
    });
  } catch (error) {
    console.error('获取API状态失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取API状态失败',
      error: error.message
    });
  }
}

// 获取所有用户
export async function getUsers(req, res) {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'createdAt', 'updatedAt']
    });
    
    return res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('获取用户数据失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取用户数据失败',
      error: error.message
    });
  }
}

// 获取所有OCR记录
export async function getOcrRecords(req, res) {
  try {
    const records = await OcrRecord.findAll({
      attributes: ['id', 'userId', 'filename', 'language', 'createdAt']
    });
    
    return res.json({
      success: true,
      records
    });
  } catch (error) {
    console.error('获取OCR记录失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取OCR记录失败',
      error: error.message
    });
  }
}

// 获取API日志
export async function getLogs(req, res) {
  try {
    return res.json({
      success: true,
      logs: apiLogs
    });
  } catch (error) {
    console.error('获取API日志失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取API日志失败',
      error: error.message
    });
  }
}

// 清除API日志
export async function clearLogs(req, res) {
  try {
    apiLogs.length = 0;
    
    return res.json({
      success: true,
      message: '日志已清除'
    });
  } catch (error) {
    console.error('清除API日志失败:', error);
    return res.status(500).json({
      success: false,
      message: '清除API日志失败',
      error: error.message
    });
  }
}

// 执行SQL查询
export async function executeQuery(req, res) {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: '无效的查询语句',
        executionTime: 0,
        rows: []
      });
    }
    
    // 简单的SQL注入保护
    if (query.toLowerCase().includes('drop') || 
        query.toLowerCase().includes('delete') || 
        query.toLowerCase().includes('update') || 
        query.toLowerCase().includes('insert')) {
      return res.status(403).json({
        success: false,
        error: '不允许执行修改数据的操作',
        executionTime: 0,
        rows: []
      });
    }
    
    const startTime = Date.now();
    const [rows] = await sequelize.query(query);
    const executionTime = Date.now() - startTime;
    
    return res.json({
      success: true,
      executionTime,
      rows: rows || []
    });
  } catch (error) {
    console.error('执行SQL查询失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      executionTime: 0,
      rows: []
    });
  }
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 将用户提升为管理员
export async function promoteUserToAdmin(req, res) {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '未提供用户ID'
      });
    }
    
    // 查找用户
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 更新用户为管理员
    user.isAdmin = true;
    await user.save();
    
    return res.json({
      success: true,
      message: '用户已成功提升为管理员',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('提升管理员失败:', error);
    return res.status(500).json({
      success: false,
      message: '提升管理员失败',
      error: error.message
    });
  }
} 