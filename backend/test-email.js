#!/usr/bin/env node

/**
 * Gmail SMTP 测试脚本
 * 用于测试邮件发送功能是否正常工作
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '.env.local') });

// 导入邮件服务
import emailService from './services/emailService.js';

/**
 * 测试邮件发送功能
 */
async function testEmailService() {
  console.log('🧪 开始测试Gmail SMTP配置...\n');

  // 检查环境变量
  console.log('📋 检查环境变量配置:');
  console.log(`ENABLE_EMAIL_VERIFICATION: ${process.env.ENABLE_EMAIL_VERIFICATION}`);
  console.log(`SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`SMTP_PORT: ${process.env.SMTP_PORT}`);
  console.log(`SMTP_USER: ${process.env.SMTP_USER ? '已配置' : '未配置'}`);
  console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '已配置' : '未配置'}\n`);

  // 检查是否启用了邮件验证
  if (process.env.ENABLE_EMAIL_VERIFICATION !== 'true') {
    console.log('⚠️  邮件验证功能未启用');
    console.log('如要测试邮件功能，请在 .env.local 中设置 ENABLE_EMAIL_VERIFICATION=true');
    console.log('并配置正确的 SMTP_USER 和 SMTP_PASS\n');
    return;
  }

  // 检查SMTP配置
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('❌ SMTP配置不完整');
    console.log('请在 .env.local 中配置 SMTP_USER 和 SMTP_PASS\n');
    return;
  }

  try {
    // 测试发送验证邮件
    console.log('📧 测试发送验证邮件...');
    const testEmail = process.env.SMTP_USER; // 发送给自己进行测试
    const testUsername = 'Test User';
    const testToken = 'test-verification-token-123456';

    const result = await emailService.sendVerificationEmail(testEmail, testUsername, testToken);
    
    if (result.success) {
      console.log('✅ 验证邮件发送成功!');
      console.log(`📨 邮件ID: ${result.messageId}`);
      console.log(`📬 收件人: ${testEmail}`);
      console.log('\n请检查你的Gmail收件箱（可能在垃圾邮件文件夹中）\n');
    } else {
      console.log('❌ 验证邮件发送失败');
      console.log(`错误信息: ${result.message}\n`);
    }

    // 测试发送密码重置邮件
    console.log('🔑 测试发送密码重置邮件...');
    const resetResult = await emailService.sendPasswordResetEmail(testEmail, testUsername, testToken);
    
    if (resetResult.success) {
      console.log('✅ 密码重置邮件发送成功!');
      console.log(`📨 邮件ID: ${resetResult.messageId}`);
      console.log(`📬 收件人: ${testEmail}\n`);
    } else {
      console.log('❌ 密码重置邮件发送失败');
      console.log(`错误信息: ${resetResult.message}\n`);
    }

  } catch (error) {
    console.log('❌ 邮件发送测试失败');
    console.log(`错误信息: ${error.message}`);
    console.log('\n可能的原因:');
    console.log('1. Gmail应用密码不正确');
    console.log('2. Gmail账户未启用两步验证');
    console.log('3. 网络连接问题');
    console.log('4. SMTP配置错误\n');
  }
}

/**
 * 显示配置指南
 */
function showConfigGuide() {
  console.log('📖 Gmail SMTP 配置指南:\n');
  console.log('1. 访问 https://myaccount.google.com/security');
  console.log('2. 启用"两步验证"');
  console.log('3. 在"应用密码"中生成新密码');
  console.log('4. 选择"邮件"和"其他（自定义名称）"');
  console.log('5. 复制生成的16位密码');
  console.log('6. 在 .env.local 或 .env.production 中配置:\n');
  console.log('   ENABLE_EMAIL_VERIFICATION=true');
  console.log('   SMTP_USER=your_gmail@gmail.com');
  console.log('   SMTP_PASS=your_16_digit_app_password\n');
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showConfigGuide();
    return;
  }

  if (args.includes('--guide') || args.includes('-g')) {
    showConfigGuide();
    return;
  }

  await testEmailService();
}

// 运行测试
main().catch(console.error);
