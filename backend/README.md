# OCR 应用后端

这是OCR文本识别应用的后端服务，提供用户认证、图像处理和OCR文本识别功能。

## 环境设置

项目使用多环境配置方式，根据不同的运行环境加载不同的配置文件：

- `.env.local` - 本地开发环境配置
- `.env.production` - 生产环境配置
- `.env.test` - 测试环境配置
- `.env` - 默认配置（如果特定环境配置不存在）

### 配置新环境

1. 复制 `.env.example` 文件并重命名为相应的环境文件（如 `.env.local`）
2. 编辑文件，设置所需的环境变量

### 必要的环境变量

- `JWT_SECRET` - 用于签名JWT令牌的密钥，**必须设置且保密**
- `GOOGLE_VISION_API_KEY` - Google Vision API密钥，用于OCR功能

### JWT密钥安全建议

生产环境中，请使用强随机字符串作为JWT密钥。可以使用以下命令生成：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 启动服务

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 生产环境

```bash
# 安装依赖
npm install

# 启动生产服务器
npm run prod
```

## API文档

开发环境中，API文档可通过Swagger UI访问：

http://localhost:3000/api-docs

在生产环境中，Swagger文档默认是禁用的，可以通过设置环境变量 `SWAGGER_ENABLED=true` 启用。

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

## 前端集成

在Vue前端应用中，可以使用 `src/services/apiClient.js`