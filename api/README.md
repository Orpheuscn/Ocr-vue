# OCR Vue App API

这是OCR Vue应用程序的后端API服务，提供OCR文本识别功能。

## 目录结构

```
api/
├── server.js            # Express服务器入口
├── routes/              # API路由定义
│   └── ocrRoutes.js     # OCR相关路由
├── controllers/         # 控制器逻辑
│   └── ocrController.js # OCR控制器
├── services/            # 服务实现
│   └── ocrService.js    # OCR服务
└── README.md            # 本文档
```

## API端点

### 1. 处理图像文件

**端点：** `POST /api/ocr/process`

**描述：** 上传并处理图像文件，执行OCR识别

**请求参数：**
- `file` (必需) - 图像文件（不支持PDF）
- `languageHints` - 可选的语言提示数组
- `recognitionDirection` - 识别方向，'horizontal'或'vertical'，默认为'horizontal'
- `recognitionMode` - 识别模式，'text'或'table'，默认为'text'

**响应：**
```json
{
  "success": true,
  "text": "识别出的文本内容",
  "language": "检测到的语言代码"
}
```

### 2. 获取支持的语言列表

**端点：** `GET /api/ocr/languages`

**描述：** 获取OCR支持的语言列表

**响应：**
```json
{
  "success": true,
  "data": [
    { "code": "zh", "name": "中文" },
    { "code": "en", "name": "英语" },
    ...
  ]
}
```

## 启动服务器

### 安装依赖
```bash
npm install
```

### 启动API服务器
```bash
npm run server
```

服务器将在 http://localhost:3000 上运行。

### 启动完整应用（前端+后端）
```bash
npm run dev:all
```

## 前端集成

在Vue前端应用中，可以使用 `src/services/apiClient.js` 中提供的函数来与API通信：

```javascript
import { processSimple, getSupportedLanguages } from '@/services/apiClient';

// 处理图像文件
const result = await processSimple(file, ['zh', 'en'], 'horizontal', 'text');
console.log(result.text); // 输出识别的文本

// 获取支持的语言列表
const languages = await getSupportedLanguages();
```

## 注意事项

1. 目前简化版API仅支持图像文件，不支持PDF处理
2. 为了简化实现，API没有使用实际的OCR引擎，返回的是模拟数据
3. 要集成实际的OCR功能，可以考虑使用Tesseract.js或其他开源OCR库 