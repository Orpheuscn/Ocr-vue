#!/usr/bin/env node

/**
 * 根据环境启动应用程序的脚本
 * 使用方法：
 * - 开发环境：node start.js dev
 * - 生产环境：node start.js prod
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 获取命令行参数
const args = process.argv.slice(2);
const env = args[0] || 'dev'; // 默认为开发环境

// 根据环境选择配置文件
let envFile = '.env.local';
let nodeEnv = 'development';

if (env === 'prod' || env === 'production') {
  envFile = '.env.production';
  nodeEnv = 'production';
} else if (env === 'test' || env === 'testing') {
  envFile = '.env.test';
  nodeEnv = 'test';
}

// 检查配置文件是否存在
const envPath = resolve(__dirname, envFile);
if (!fs.existsSync(envPath)) {
  console.error(`错误: 配置文件 ${envFile} 不存在`);
  process.exit(1);
}

// 加载环境变量
console.log(`加载 ${envFile} 配置文件`);
dotenv.config({ path: envPath });

console.log(`使用 ${envFile} 配置文件启动服务器 (NODE_ENV=${nodeEnv})`);

// 设置环境变量
process.env.NODE_ENV = nodeEnv;
// 设置一个环境变量，告诉 server.js 不要再加载其他 .env 文件
process.env.ENV_LOADED = 'true';

// 启动服务器
const server = spawn('node', ['server.js'], {
  env: { ...process.env, NODE_ENV: nodeEnv, ENV_LOADED: 'true' },
  stdio: 'inherit'
});

// 处理进程事件
server.on('close', (code) => {
  console.log(`服务器进程退出，退出码: ${code}`);
});

// 处理终止信号
process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  server.kill('SIGTERM');
}); 