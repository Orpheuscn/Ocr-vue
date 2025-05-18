# OCR 应用后端

这是 OCR 文本识别应用的后端服务，提供用户认证、图像处理和 OCR 文本识别功能。

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

- `JWT_SECRET` - 用于签名 JWT 令牌的密钥，**必须设置且保密**
- `GOOGLE_VISION_API_KEY` - Google Vision API 密钥，用于 OCR 功能

### JWT 密钥安全建议

生产环境中，请使用强随机字符串作为 JWT 密钥。可以使用以下命令生成：

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

## API 文档

开发环境中，API 文档可通过 Swagger UI 访问：

http://localhost:3000/api-docs

在生产环境中，Swagger 文档默认是禁用的，可以通过设置环境变量 `SWAGGER_ENABLED=true` 启用。

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

## API 端点

### 1. 处理图像文件

**端点：** `POST /api/ocr/process`

**描述：** 上传并处理图像文件，执行 OCR 识别

**请求参数：**

- `file` (必需) - 图像文件（不支持 PDF）
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

**描述：** 获取 OCR 支持的语言列表

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

在 Vue 前端应用中，可以使用 `src/services/apiClient.js`

# OCR 应用环境变量配置说明

本项目使用环境变量来配置不同运行环境下的参数。所有环境变量文件都集中存放在 backend 目录下。

## 环境变量文件

项目使用以下环境变量文件：

- `.env.local` - 本地开发环境配置
- `.env.test` - 测试环境配置
- `.env.production` - 生产环境配置
- `.env` - 默认配置(可选)，当特定环境的配置文件不存在时使用

## 环境变量加载顺序

系统会根据当前运行环境(`NODE_ENV`)自动选择合适的配置文件：

1. 如果设置了`NODE_ENV=production`，则加载`.env.production`
2. 如果设置了`NODE_ENV=test`，则加载`.env.test`
3. 默认情况下，加载`.env.local`
4. 如果指定的环境配置文件不存在，尝试加载`.env`
5. 如果所有配置文件都不存在，使用代码中的默认值

## 主要环境变量说明

| 变量名                  | 描述                      | 示例值                              |
| ----------------------- | ------------------------- | ----------------------------------- |
| `PORT`                  | 后端服务器端口            | `3000`                              |
| `NODE_ENV`              | 运行环境                  | `development`/`production`/`test`   |
| `MONGODB_URI`           | MongoDB 连接 URI          | `mongodb://localhost:27017/ocr_app` |
| `MONGODB_DB_NAME`       | MongoDB 数据库名称        | `ocr_app`                           |
| `JWT_SECRET`            | JWT 令牌签名密钥          | `your_secret_key`                   |
| `JWT_EXPIRES_IN`        | JWT 令牌有效期            | `24h`                               |
| `GOOGLE_VISION_API_KEY` | Google Vision API 密钥    | `your_api_key`                      |
| `SWAGGER_ENABLED`       | 是否启用 Swagger API 文档 | `true`/`false`                      |

## 环境变量使用示例

```javascript
// 使用环境变量配置工具
import config from "./utils/envConfig.js";

// 使用预先解析的配置
const port = config.port;
const jwtSecret = config.jwtSecret;

// 或直接使用process.env(不推荐)
const port = process.env.PORT || 3000;
```

## 添加新的环境变量

添加新的环境变量时，请遵循以下步骤：

1. 在所有相关的环境文件(`.env.local`, `.env.test`, `.env.production`)中添加该变量
2. 在`utils/envConfig.js`中添加该变量的导出
3. 优先使用`config`对象访问环境变量，而不是直接使用`process.env`

## 敏感信息处理

不要将包含敏感信息(如 API 密钥、数据库密码等)的环境变量文件提交到代码库。应使用`.env.example`作为模板，在实际部署时创建真实的环境变量文件。
