#!/usr/bin/env node

/**
 * OAuth流程测试脚本
 * 测试Google OAuth配置和流程
 */

import fs from "fs";
import path from "path";

// 手动读取环境变量文件
function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), "../backend/.env.local");
    const envContent = fs.readFileSync(envPath, "utf8");
    const envVars = {};

    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join("=").trim();
        }
      }
    });

    return envVars;
  } catch (error) {
    console.log("⚠️  无法读取环境变量文件:", error.message);
    return {};
  }
}

const envVars = loadEnvFile();
const BACKEND_URL = envVars.BACKEND_URL || "http://localhost:3000";
const FRONTEND_URL = envVars.FRONTEND_URL || "http://localhost:8082";

console.log("🔍 OAuth配置测试开始...\n");

// 测试1: 检查OAuth配置
async function testOAuthConfig() {
  console.log("1️⃣ 检查OAuth配置...");

  const requiredEnvVars = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "ENABLE_OAUTH"];

  const missingVars = requiredEnvVars.filter((varName) => !envVars[varName]);

  if (missingVars.length > 0) {
    console.log("❌ 缺少必要的环境变量:", missingVars.join(", "));
    return false;
  }

  console.log("✅ OAuth环境变量配置完整");
  console.log(`   - ENABLE_OAUTH: ${envVars.ENABLE_OAUTH}`);
  console.log(`   - GOOGLE_CLIENT_ID: ${envVars.GOOGLE_CLIENT_ID?.substring(0, 20)}...`);
  console.log(`   - GOOGLE_CLIENT_SECRET: ${envVars.GOOGLE_CLIENT_SECRET ? "已配置" : "未配置"}`);
  return true;
}

// 测试2: 检查OAuth路由可访问性
async function testOAuthRoutes() {
  console.log("\n2️⃣ 检查OAuth路由...");

  try {
    // 测试Google OAuth启动路由
    const response = await fetch(`${BACKEND_URL}/api/auth/google`, {
      method: "GET",
      redirect: "manual", // 不自动跟随重定向
    });

    if (response.status === 302) {
      const location = response.headers.get("location");
      if (location && location.includes("accounts.google.com")) {
        console.log("✅ Google OAuth启动路由正常");
        console.log(`   重定向到: ${location.substring(0, 80)}...`);
        return true;
      } else {
        console.log("❌ OAuth重定向URL不正确:", location);
        return false;
      }
    } else {
      console.log("❌ OAuth路由响应异常:", response.status);
      return false;
    }
  } catch (error) {
    console.log("❌ OAuth路由测试失败:", error.message);
    return false;
  }
}

// 测试3: 检查服务器健康状态
async function testServerHealth() {
  console.log("\n3️⃣ 检查服务器健康状态...");

  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    if (response.ok) {
      const data = await response.json();
      console.log("✅ 后端服务器运行正常");
      console.log(`   状态: ${data.status}`);
      console.log(`   时间: ${data.timestamp}`);
      return true;
    } else {
      console.log("❌ 服务器健康检查失败:", response.status);
      return false;
    }
  } catch (error) {
    console.log("❌ 无法连接到后端服务器:", error.message);
    return false;
  }
}

// 测试4: 检查前端可访问性
async function testFrontendAccess() {
  console.log("\n4️⃣ 检查前端可访问性...");

  try {
    const response = await fetch(FRONTEND_URL);
    if (response.ok) {
      console.log("✅ 前端服务器运行正常");
      console.log(`   URL: ${FRONTEND_URL}`);
      return true;
    } else {
      console.log("❌ 前端服务器响应异常:", response.status);
      return false;
    }
  } catch (error) {
    console.log("❌ 无法连接到前端服务器:", error.message);
    return false;
  }
}

// 测试5: 检查重定向URI配置
function testRedirectURIConfig() {
  console.log("\n5️⃣ 检查重定向URI配置...");

  const expectedCallbackURL = `${BACKEND_URL}/api/auth/google/callback`;
  console.log("✅ 预期的回调URL配置:");
  console.log(`   开发环境: ${expectedCallbackURL}`);
  console.log(`   生产环境: https://textistext.com/api/auth/google/callback`);
  console.log("\n📝 请确保在Google Cloud Console中配置了以下重定向URI:");
  console.log(`   1. ${expectedCallbackURL} (开发环境)`);
  console.log(`   2. https://textistext.com/api/auth/google/callback (生产环境)`);

  return true;
}

// 主测试函数
async function runOAuthTests() {
  console.log("🚀 OAuth流程完整性测试\n");
  console.log(`后端URL: ${BACKEND_URL}`);
  console.log(`前端URL: ${FRONTEND_URL}\n`);

  const tests = [
    testOAuthConfig,
    testServerHealth,
    testFrontendAccess,
    testOAuthRoutes,
    testRedirectURIConfig,
  ];

  let passedTests = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) passedTests++;
    } catch (error) {
      console.log("❌ 测试执行错误:", error.message);
    }
  }

  console.log("\n📊 测试结果汇总:");
  console.log(`✅ 通过: ${passedTests}/${tests.length}`);
  console.log(`❌ 失败: ${tests.length - passedTests}/${tests.length}`);

  if (passedTests === tests.length) {
    console.log("\n🎉 所有测试通过！OAuth配置正确，可以开始手动测试流程。");
    console.log("\n📋 下一步手动测试步骤:");
    console.log("1. 访问前端登录页面: http://localhost:8082/login");
    console.log('2. 点击"Google登录"按钮');
    console.log("3. 完成Google授权");
    console.log("4. 验证回调处理和用户登录状态");
  } else {
    console.log("\n⚠️  部分测试失败，请检查配置后重试。");
  }
}

// 运行测试
runOAuthTests().catch(console.error);
