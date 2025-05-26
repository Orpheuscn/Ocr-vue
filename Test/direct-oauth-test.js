#!/usr/bin/env node

/**
 * 直接OAuth测试脚本
 * 直接访问OAuth URL并检查响应
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 直接OAuth测试开始...\n');

// 读取环境变量
function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '../backend/.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.log('⚠️  无法读取环境变量文件:', error.message);
    return {};
  }
}

const envVars = loadEnvFile();
const BACKEND_URL = envVars.BACKEND_URL || 'http://localhost:3000';

// 测试OAuth启动URL
async function testOAuthStartURL() {
  console.log('1️⃣ 测试OAuth启动URL...');
  
  try {
    const oauthURL = `${BACKEND_URL}/api/auth/google`;
    console.log(`访问URL: ${oauthURL}`);
    
    const response = await fetch(oauthURL, {
      method: 'GET',
      redirect: 'manual' // 不自动跟随重定向
    });
    
    console.log(`响应状态: ${response.status}`);
    console.log(`响应状态文本: ${response.statusText}`);
    
    if (response.status === 302) {
      const location = response.headers.get('location');
      console.log(`✅ 重定向到: ${location}`);
      
      if (location && location.includes('accounts.google.com')) {
        console.log('✅ 正确重定向到Google OAuth');
        
        // 解析重定向URL参数
        const url = new URL(location);
        console.log('\n📋 OAuth参数:');
        console.log(`   - client_id: ${url.searchParams.get('client_id')}`);
        console.log(`   - redirect_uri: ${url.searchParams.get('redirect_uri')}`);
        console.log(`   - scope: ${url.searchParams.get('scope')}`);
        console.log(`   - response_type: ${url.searchParams.get('response_type')}`);
        
        return true;
      } else {
        console.log('❌ 重定向URL不正确');
        return false;
      }
    } else if (response.status === 404) {
      console.log('❌ OAuth路由未找到 (404)');
      const text = await response.text();
      console.log('响应内容:', text);
      return false;
    } else {
      console.log('❌ 意外的响应状态');
      const text = await response.text();
      console.log('响应内容:', text);
      return false;
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
    return false;
  }
}

// 检查Google Cloud Console配置
function checkGoogleCloudConfig() {
  console.log('\n2️⃣ Google Cloud Console配置检查...');
  
  const clientId = envVars.GOOGLE_CLIENT_ID;
  const expectedRedirectURI = `${BACKEND_URL}/api/auth/google/callback`;
  
  console.log('📝 请在Google Cloud Console中验证以下配置:');
  console.log('\n🔧 OAuth 2.0客户端ID配置:');
  console.log(`   1. 客户端ID: ${clientId}`);
  console.log(`   2. 已获授权的重定向URI必须包含:`);
  console.log(`      - ${expectedRedirectURI}`);
  console.log('\n🔧 OAuth同意屏幕配置:');
  console.log('   1. 应用类型: 外部');
  console.log('   2. 应用状态: 测试中 (开发阶段)');
  console.log('   3. 授权域: localhost');
  console.log('   4. 范围: profile, email');
  
  console.log('\n⚠️  常见配置错误:');
  console.log('   1. 重定向URI缺少 /api 前缀');
  console.log('   2. 重定向URI协议不匹配 (http vs https)');
  console.log('   3. 重定向URI端口不匹配');
  console.log('   4. OAuth同意屏幕未配置测试用户');
  
  return true;
}

// 生成手动测试指令
function generateManualTestInstructions() {
  console.log('\n3️⃣ 手动测试指令...');
  
  const oauthURL = `${BACKEND_URL}/api/auth/google`;
  
  console.log('🔧 手动测试步骤:');
  console.log(`1. 在浏览器中打开: ${oauthURL}`);
  console.log('2. 观察是否重定向到Google OAuth页面');
  console.log('3. 如果出现错误，记录错误信息');
  console.log('4. 检查浏览器开发者工具的Network标签');
  console.log('5. 查看请求和响应的详细信息');
  
  console.log('\n📱 浏览器开发者工具检查:');
  console.log('1. 打开开发者工具 (F12)');
  console.log('2. 切换到Network标签');
  console.log('3. 清除网络日志');
  console.log('4. 访问OAuth URL');
  console.log('5. 检查所有网络请求');
  console.log('6. 特别关注状态码和响应头');
  
  return true;
}

// 检查后端日志
function checkBackendLogs() {
  console.log('\n4️⃣ 后端日志检查建议...');
  
  console.log('📋 需要检查的日志信息:');
  console.log('1. OAuth策略配置日志');
  console.log('2. Passport初始化日志');
  console.log('3. OAuth请求处理日志');
  console.log('4. 错误和异常日志');
  
  console.log('\n🔍 关键日志关键词:');
  console.log('- "Google OAuth策略配置完成"');
  console.log('- "OAuth配置初始化完成"');
  console.log('- "Google OAuth回调处理"');
  console.log('- "Google OAuth错误"');
  console.log('- "passport"');
  console.log('- "oauth"');
  
  return true;
}

// 主测试函数
async function runDirectOAuthTest() {
  console.log('🚀 直接OAuth测试\n');
  console.log(`后端URL: ${BACKEND_URL}\n`);
  
  const tests = [
    testOAuthStartURL,
    checkGoogleCloudConfig,
    generateManualTestInstructions,
    checkBackendLogs
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) passedTests++;
    } catch (error) {
      console.log('❌ 测试执行错误:', error.message);
    }
  }
  
  console.log('\n📊 测试结果汇总:');
  console.log(`✅ 通过: ${passedTests}/${tests.length}`);
  
  if (passedTests >= 3) {
    console.log('\n🎯 下一步建议:');
    console.log('1. 仔细检查Google Cloud Console的重定向URI配置');
    console.log('2. 确保重定向URI完全匹配，包括协议、域名、端口和路径');
    console.log('3. 在Google Cloud Console中添加测试用户（如果应用处于测试状态）');
    console.log('4. 检查OAuth同意屏幕的配置');
  } else {
    console.log('\n⚠️  需要先解决基础配置问题');
  }
}

// 运行测试
runDirectOAuthTest().catch(console.error);
