// api/test-api.js
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3000';

// 测试获取语言列表API
async function testGetLanguages() {
  try {
    console.log('测试获取语言列表API...');
    const response = await fetch(`${API_BASE_URL}/api/ocr/languages`);
    const result = await response.json();
    
    if (result.success) {
      console.log('获取语言列表成功:');
      console.log(`共 ${result.data.length} 种语言`);
      // 展示前5种语言示例
      console.log('示例语言:', result.data.slice(0, 5));
    } else {
      console.error('获取语言列表失败:', result.message);
    }
  } catch (error) {
    console.error('测试获取语言列表API时出错:', error.message);
  }
}

// 执行测试
async function runTests() {
  console.log('开始测试API...');

  // 先启动服务器
  console.log('确保API服务器已启动在 http://localhost:3000');
  
  // 等待服务器启动
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 测试获取语言列表
  await testGetLanguages();
  
  console.log('API测试完成！');
}

runTests().catch(console.error); 