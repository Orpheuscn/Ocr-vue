#!/usr/bin/env node

/**
 * OAuth错误诊断脚本
 * 详细检查OAuth配置和可能的错误原因
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 OAuth错误诊断开始...\n');

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

// 诊断1: 检查OAuth配置详情
function diagnoseOAuthConfig() {
  console.log('1️⃣ OAuth配置详细诊断...');
  
  const clientId = envVars.GOOGLE_CLIENT_ID;
  const clientSecret = envVars.GOOGLE_CLIENT_SECRET;
  const enableOAuth = envVars.ENABLE_OAUTH;
  
  console.log(`✅ OAuth配置状态:`);
  console.log(`   - ENABLE_OAUTH: ${enableOAuth}`);
  console.log(`   - GOOGLE_CLIENT_ID: ${clientId ? clientId.substring(0, 30) + '...' : '未配置'}`);
  console.log(`   - GOOGLE_CLIENT_SECRET: ${clientSecret ? '已配置 (长度: ' + clientSecret.length + ')' : '未配置'}`);
  
  // 检查Client ID格式
  if (clientId) {
    const isValidFormat = clientId.includes('-') && clientId.includes('.apps.googleusercontent.com');
    console.log(`   - Client ID格式: ${isValidFormat ? '✅ 正确' : '❌ 格式可能不正确'}`);
    
    if (!isValidFormat) {
      console.log('   ⚠️  Google Client ID应该类似: 123456789-abcdef.apps.googleusercontent.com');
    }
  }
  
  // 检查Client Secret格式
  if (clientSecret) {
    const isValidLength = clientSecret.length >= 20;
    console.log(`   - Client Secret长度: ${isValidLength ? '✅ 正常' : '❌ 可能太短'}`);
  }
  
  return !!(clientId && clientSecret && enableOAuth === 'true');
}

// 诊断2: 检查重定向URI配置
function diagnoseRedirectURI() {
  console.log('\n2️⃣ 重定向URI配置诊断...');
  
  const backendUrl = envVars.BACKEND_URL || 'http://localhost:3000';
  const frontendUrl = envVars.FRONTEND_URL || 'http://localhost:8082';
  const nodeEnv = envVars.NODE_ENV || 'development';
  
  console.log(`✅ 环境配置:`);
  console.log(`   - NODE_ENV: ${nodeEnv}`);
  console.log(`   - BACKEND_URL: ${backendUrl}`);
  console.log(`   - FRONTEND_URL: ${frontendUrl}`);
  
  const expectedCallbackURL = `${backendUrl}/api/auth/google/callback`;
  console.log(`\n✅ 预期的回调URL: ${expectedCallbackURL}`);
  
  console.log('\n📝 Google Cloud Console配置检查清单:');
  console.log('   1. 打开 Google Cloud Console');
  console.log('   2. 进入 APIs & Services > Credentials');
  console.log('   3. 找到你的OAuth 2.0客户端ID');
  console.log('   4. 检查"已获授权的重定向URI"部分');
  console.log('   5. 确保包含以下URI:');
  console.log(`      - ${expectedCallbackURL}`);
  console.log('   6. 如果是生产环境，还需要:');
  console.log('      - https://textistext.com/api/auth/google/callback');
  
  return true;
}

// 诊断3: 检查Passport配置
function diagnosePassportConfig() {
  console.log('\n3️⃣ Passport配置诊断...');
  
  try {
    const passportConfigPath = path.join(process.cwd(), '../backend/middleware/passportConfig.js');
    const passportContent = fs.readFileSync(passportConfigPath, 'utf8');
    
    const hasGoogleStrategy = passportContent.includes('GoogleStrategy') ||
                             passportContent.includes('passport-google-oauth20');
    
    const hasOAuthInit = passportContent.includes('initializeOAuth');
    
    console.log(`✅ Passport配置检查:`);
    console.log(`   - Google策略导入: ${hasGoogleStrategy ? '✅' : '❌'}`);
    console.log(`   - OAuth初始化: ${hasOAuthInit ? '✅' : '❌'}`);
    
    return hasGoogleStrategy && hasOAuthInit;
  } catch (error) {
    console.log('❌ Passport配置检查失败:', error.message);
    return false;
  }
}

// 诊断4: 检查OAuth路由配置
function diagnoseOAuthRoutes() {
  console.log('\n4️⃣ OAuth路由配置诊断...');
  
  try {
    const authRoutesPath = path.join(process.cwd(), '../backend/routes/authRoutes.js');
    const authRoutesContent = fs.readFileSync(authRoutesPath, 'utf8');
    
    const hasGoogleRoute = authRoutesContent.includes('/google');
    const hasCallbackRoute = authRoutesContent.includes('/google/callback');
    const hasErrorHandling = authRoutesContent.includes('oauth_error');
    
    console.log(`✅ OAuth路由检查:`);
    console.log(`   - Google登录路由: ${hasGoogleRoute ? '✅' : '❌'}`);
    console.log(`   - Google回调路由: ${hasCallbackRoute ? '✅' : '❌'}`);
    console.log(`   - 错误处理: ${hasErrorHandling ? '✅' : '❌'}`);
    
    return hasGoogleRoute && hasCallbackRoute;
  } catch (error) {
    console.log('❌ OAuth路由检查失败:', error.message);
    return false;
  }
}

// 诊断5: 生成测试URL
function generateTestURLs() {
  console.log('\n5️⃣ 生成测试URL...');
  
  const backendUrl = envVars.BACKEND_URL || 'http://localhost:3000';
  const clientId = envVars.GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    console.log('❌ 无法生成测试URL，Client ID未配置');
    return false;
  }
  
  const callbackURL = `${backendUrl}/api/auth/google/callback`;
  const googleAuthURL = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `response_type=code&` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(callbackURL)}&` +
    `scope=${encodeURIComponent('profile email')}`;
  
  console.log(`✅ 测试URL生成:`);
  console.log(`   - 后端OAuth启动: ${backendUrl}/api/auth/google`);
  console.log(`   - 回调URL: ${callbackURL}`);
  console.log(`   - Google授权URL: ${googleAuthURL.substring(0, 100)}...`);
  
  console.log('\n🔧 手动测试步骤:');
  console.log('1. 在浏览器中访问后端OAuth启动URL');
  console.log('2. 检查是否正确重定向到Google');
  console.log('3. 完成Google授权');
  console.log('4. 检查回调处理是否正常');
  
  return true;
}

// 诊断6: 常见错误解决方案
function provideErrorSolutions() {
  console.log('\n6️⃣ 常见OAuth错误解决方案...');
  
  console.log('🔧 oauth_error错误的可能原因和解决方案:');
  console.log('\n❌ 错误1: redirect_uri_mismatch');
  console.log('   原因: Google Cloud Console中的重定向URI与实际不匹配');
  console.log('   解决: 确保重定向URI完全匹配，包括协议、域名、端口和路径');
  
  console.log('\n❌ 错误2: invalid_client');
  console.log('   原因: Client ID或Client Secret不正确');
  console.log('   解决: 重新检查Google Cloud Console中的凭据');
  
  console.log('\n❌ 错误3: access_denied');
  console.log('   原因: 用户拒绝了授权或应用未通过验证');
  console.log('   解决: 检查OAuth同意屏幕配置');
  
  console.log('\n❌ 错误4: unauthorized_client');
  console.log('   原因: 客户端未被授权使用此授权方式');
  console.log('   解决: 检查OAuth客户端类型配置');
  
  console.log('\n✅ 推荐的调试步骤:');
  console.log('1. 检查浏览器开发者工具的Network标签');
  console.log('2. 查看OAuth请求和响应的详细信息');
  console.log('3. 检查后端日志中的详细错误信息');
  console.log('4. 验证Google Cloud Console配置');
  
  return true;
}

// 主诊断函数
async function runOAuthDiagnosis() {
  console.log('🚀 OAuth错误详细诊断\n');
  
  const diagnostics = [
    diagnoseOAuthConfig,
    diagnoseRedirectURI,
    diagnosePassportConfig,
    diagnoseOAuthRoutes,
    generateTestURLs,
    provideErrorSolutions
  ];
  
  let passedDiagnostics = 0;
  
  for (const diagnostic of diagnostics) {
    try {
      const result = diagnostic();
      if (result) passedDiagnostics++;
    } catch (error) {
      console.log('❌ 诊断执行错误:', error.message);
    }
  }
  
  console.log('\n📊 诊断结果汇总:');
  console.log(`✅ 通过: ${passedDiagnostics}/${diagnostics.length}`);
  
  console.log('\n🎯 下一步行动建议:');
  console.log('1. 仔细检查Google Cloud Console的重定向URI配置');
  console.log('2. 验证Client ID和Client Secret的正确性');
  console.log('3. 检查后端日志中的详细错误信息');
  console.log('4. 使用浏览器开发者工具调试OAuth流程');
}

// 运行诊断
runOAuthDiagnosis().catch(console.error);
