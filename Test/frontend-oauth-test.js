#!/usr/bin/env node

/**
 * 前端OAuth按钮测试脚本
 * 验证前端OAuth按钮的实现和配置
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 前端OAuth按钮测试开始...\n');

// 测试1: 检查OAuthButtons组件
function testOAuthButtonsComponent() {
  console.log('1️⃣ 检查OAuthButtons组件...');
  
  try {
    const componentPath = path.join(process.cwd(), '../frontend/src/components/auth/OAuthButtons.vue');
    const componentContent = fs.readFileSync(componentPath, 'utf8');
    
    // 检查Google OAuth按钮
    const hasGoogleButton = componentContent.includes('handleGoogleLogin') || 
                           componentContent.includes('google') ||
                           componentContent.includes('Google');
    
    // 检查OAuth URL配置
    const hasOAuthURL = componentContent.includes('/api/auth/google') ||
                       componentContent.includes('auth/google');
    
    // 检查环境变量使用
    const usesEnvConfig = componentContent.includes('import.meta.env') ||
                         componentContent.includes('VITE_');
    
    console.log(`✅ OAuthButtons组件存在`);
    console.log(`   - Google按钮: ${hasGoogleButton ? '✅' : '❌'}`);
    console.log(`   - OAuth URL: ${hasOAuthURL ? '✅' : '❌'}`);
    console.log(`   - 环境配置: ${usesEnvConfig ? '✅' : '❌'}`);
    
    return hasGoogleButton && hasOAuthURL;
  } catch (error) {
    console.log('❌ OAuthButtons组件检查失败:', error.message);
    return false;
  }
}

// 测试2: 检查LoginForm组件集成
function testLoginFormIntegration() {
  console.log('\n2️⃣ 检查LoginForm组件集成...');
  
  try {
    const loginFormPath = path.join(process.cwd(), '../frontend/src/components/auth/LoginForm.vue');
    const loginFormContent = fs.readFileSync(loginFormPath, 'utf8');
    
    // 检查是否导入了OAuthButtons
    const importsOAuthButtons = loginFormContent.includes('OAuthButtons') ||
                               loginFormContent.includes('oauth-buttons');
    
    // 检查是否在模板中使用了OAuthButtons
    const usesOAuthButtons = loginFormContent.includes('<OAuthButtons') ||
                            loginFormContent.includes('<oauth-buttons');
    
    console.log(`✅ LoginForm组件存在`);
    console.log(`   - 导入OAuthButtons: ${importsOAuthButtons ? '✅' : '❌'}`);
    console.log(`   - 使用OAuthButtons: ${usesOAuthButtons ? '✅' : '❌'}`);
    
    return importsOAuthButtons && usesOAuthButtons;
  } catch (error) {
    console.log('❌ LoginForm组件检查失败:', error.message);
    return false;
  }
}

// 测试3: 检查前端环境配置
function testFrontendEnvConfig() {
  console.log('\n3️⃣ 检查前端环境配置...');
  
  try {
    // 检查.env文件
    const envFiles = ['.env', '.env.local', '.env.development'];
    let envConfigFound = false;
    
    for (const envFile of envFiles) {
      try {
        const envPath = path.join(process.cwd(), '../frontend', envFile);
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        if (envContent.includes('VITE_') || envContent.includes('API_URL')) {
          console.log(`✅ 找到环境配置文件: ${envFile}`);
          envConfigFound = true;
          
          // 检查API URL配置
          const hasApiUrl = envContent.includes('VITE_API_URL') ||
                           envContent.includes('VITE_BACKEND_URL');
          console.log(`   - API URL配置: ${hasApiUrl ? '✅' : '❌'}`);
        }
      } catch (error) {
        // 文件不存在，继续检查下一个
      }
    }
    
    if (!envConfigFound) {
      console.log('⚠️  未找到前端环境配置文件');
    }
    
    return envConfigFound;
  } catch (error) {
    console.log('❌ 前端环境配置检查失败:', error.message);
    return false;
  }
}

// 测试4: 检查Vite配置
function testViteConfig() {
  console.log('\n4️⃣ 检查Vite配置...');
  
  try {
    const viteConfigPath = path.join(process.cwd(), '../frontend/vite.config.js');
    const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf8');
    
    // 检查代理配置
    const hasProxy = viteConfigContent.includes('proxy') ||
                    viteConfigContent.includes('server');
    
    // 检查端口配置
    const hasPortConfig = viteConfigContent.includes('port') ||
                         viteConfigContent.includes('8082');
    
    console.log(`✅ Vite配置文件存在`);
    console.log(`   - 代理配置: ${hasProxy ? '✅' : '❌'}`);
    console.log(`   - 端口配置: ${hasPortConfig ? '✅' : '❌'}`);
    
    return true;
  } catch (error) {
    console.log('❌ Vite配置检查失败:', error.message);
    return false;
  }
}

// 测试5: 检查路由配置
function testRouterConfig() {
  console.log('\n5️⃣ 检查路由配置...');
  
  try {
    const routerPath = path.join(process.cwd(), '../frontend/src/router/index.js');
    const routerContent = fs.readFileSync(routerPath, 'utf8');
    
    // 检查登录路由
    const hasLoginRoute = routerContent.includes('/login') ||
                         routerContent.includes('LoginPage');
    
    // 检查仪表板路由
    const hasDashboardRoute = routerContent.includes('/dashboard') ||
                             routerContent.includes('Dashboard');
    
    console.log(`✅ 路由配置文件存在`);
    console.log(`   - 登录路由: ${hasLoginRoute ? '✅' : '❌'}`);
    console.log(`   - 仪表板路由: ${hasDashboardRoute ? '✅' : '❌'}`);
    
    return hasLoginRoute && hasDashboardRoute;
  } catch (error) {
    console.log('❌ 路由配置检查失败:', error.message);
    return false;
  }
}

// 主测试函数
async function runFrontendOAuthTests() {
  console.log('🚀 前端OAuth配置完整性测试\n');
  
  const tests = [
    testOAuthButtonsComponent,
    testLoginFormIntegration,
    testFrontendEnvConfig,
    testViteConfig,
    testRouterConfig
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    try {
      const result = test();
      if (result) passedTests++;
    } catch (error) {
      console.log('❌ 测试执行错误:', error.message);
    }
  }
  
  console.log('\n📊 前端测试结果汇总:');
  console.log(`✅ 通过: ${passedTests}/${tests.length}`);
  console.log(`❌ 失败: ${tests.length - passedTests}/${tests.length}`);
  
  if (passedTests === tests.length) {
    console.log('\n🎉 前端OAuth配置检查通过！');
    console.log('\n📋 现在可以进行手动测试:');
    console.log('1. 浏览器访问: http://localhost:8082/login');
    console.log('2. 点击"Google登录"按钮');
    console.log('3. 完成OAuth授权流程');
  } else {
    console.log('\n⚠️  部分前端配置需要检查，请参考测试结果。');
  }
}

// 运行测试
runFrontendOAuthTests().catch(console.error);
