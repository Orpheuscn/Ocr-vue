#!/usr/bin/env node

/**
 * 进程管理脚本
 * 用于管理 OCR 应用的进程
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class ProcessManager {
  constructor() {
    this.appName = 'ocr-vue-app';
    this.port = 3000;
  }

  /**
   * 检查端口是否被占用
   */
  async checkPort(port = this.port) {
    try {
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      return stdout.trim().split('\n').filter(pid => pid);
    } catch (error) {
      return [];
    }
  }

  /**
   * 杀掉指定端口的进程
   */
  async killPort(port = this.port) {
    try {
      const pids = await this.checkPort(port);
      if (pids.length > 0) {
        console.log(`🔪 杀掉端口 ${port} 上的进程: ${pids.join(', ')}`);
        await execAsync(`kill -9 ${pids.join(' ')}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ 杀掉端口 ${port} 进程失败:`, error.message);
      return false;
    }
  }

  /**
   * 查找相关的 Node.js 进程
   */
  async findNodeProcesses() {
    try {
      const { stdout } = await execAsync(`ps aux | grep -E 'node.*(server|start)' | grep -v grep`);
      return stdout.trim().split('\n').filter(line => line);
    } catch (error) {
      return [];
    }
  }

  /**
   * 杀掉所有相关进程
   */
  async killAllProcesses() {
    try {
      console.log('🔪 杀掉所有相关的 Node.js 进程...');
      
      // 杀掉 server.js 进程
      try {
        await execAsync(`pkill -f 'node.*server.js'`);
      } catch (e) {
        // 忽略错误，可能没有进程在运行
      }
      
      // 杀掉 start.js 进程
      try {
        await execAsync(`pkill -f 'node.*start.js'`);
      } catch (e) {
        // 忽略错误，可能没有进程在运行
      }
      
      // 杀掉端口占用
      await this.killPort();
      
      console.log('✅ 所有进程已清理');
      return true;
    } catch (error) {
      console.error('❌ 清理进程失败:', error.message);
      return false;
    }
  }

  /**
   * 显示进程状态
   */
  async showStatus() {
    console.log('📊 进程状态检查...\n');
    
    // 检查端口占用
    const portPids = await this.checkPort();
    if (portPids.length > 0) {
      console.log(`🔴 端口 ${this.port} 被占用，PID: ${portPids.join(', ')}`);
    } else {
      console.log(`🟢 端口 ${this.port} 空闲`);
    }
    
    // 检查 Node.js 进程
    const nodeProcesses = await this.findNodeProcesses();
    if (nodeProcesses.length > 0) {
      console.log('\n🔴 发现相关的 Node.js 进程:');
      nodeProcesses.forEach((process, index) => {
        console.log(`  ${index + 1}. ${process}`);
      });
    } else {
      console.log('\n🟢 没有发现相关的 Node.js 进程');
    }
    
    // 检查 PM2 状态
    try {
      const { stdout } = await execAsync('pm2 jlist');
      const pm2Processes = JSON.parse(stdout);
      const ocrProcesses = pm2Processes.filter(p => p.name && p.name.includes('ocr'));
      
      if (ocrProcesses.length > 0) {
        console.log('\n🔵 PM2 进程:');
        ocrProcesses.forEach(p => {
          console.log(`  - ${p.name}: ${p.pm2_env.status} (PID: ${p.pid})`);
        });
      } else {
        console.log('\n🟢 没有发现 PM2 进程');
      }
    } catch (error) {
      console.log('\n⚪ PM2 未安装或无进程运行');
    }
  }

  /**
   * 启动开发服务器
   */
  async startDev(useNodemon = false) {
    await this.killAllProcesses();
    
    console.log(`🚀 启动开发服务器 ${useNodemon ? '(使用 nodemon)' : ''}...`);
    
    const command = useNodemon ? 'npm run dev:nodemon' : 'npm run dev';
    const child = spawn('npm', useNodemon ? ['run', 'dev:nodemon'] : ['run', 'dev'], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      console.log(`服务器进程退出，退出码: ${code}`);
    });
    
    return child;
  }

  /**
   * 使用 PM2 启动
   */
  async startPM2(env = 'development') {
    await this.killAllProcesses();
    
    console.log(`🚀 使用 PM2 启动服务器 (${env})...`);
    
    try {
      const command = env === 'production' ? 'npm run prod:pm2' : 'npm run dev:pm2';
      await execAsync(command);
      console.log('✅ PM2 启动成功');
    } catch (error) {
      console.error('❌ PM2 启动失败:', error.message);
    }
  }
}

// 命令行接口
const manager = new ProcessManager();
const command = process.argv[2];

switch (command) {
  case 'status':
    manager.showStatus();
    break;
  case 'clean':
  case 'kill':
    manager.killAllProcesses();
    break;
  case 'dev':
    manager.startDev(false);
    break;
  case 'dev:nodemon':
    manager.startDev(true);
    break;
  case 'pm2:dev':
    manager.startPM2('development');
    break;
  case 'pm2:prod':
    manager.startPM2('production');
    break;
  default:
    console.log(`
🛠️  OCR 应用进程管理器

用法: node scripts/process-manager.js <command>

命令:
  status        - 显示进程状态
  clean/kill    - 清理所有进程
  dev           - 启动开发服务器
  dev:nodemon   - 使用 nodemon 启动开发服务器
  pm2:dev       - 使用 PM2 启动开发环境
  pm2:prod      - 使用 PM2 启动生产环境

示例:
  node scripts/process-manager.js status
  node scripts/process-manager.js clean
  node scripts/process-manager.js dev:nodemon
    `);
}

export default ProcessManager;
