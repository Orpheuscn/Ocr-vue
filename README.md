# TextIsText OCR - 专业的文本识别工具

一个基于 Vue.js 和 Node.js 的现代化 OCR（光学字符识别）应用程序，支持多语言文本识别和智能文档处理。

## 🌟 功能特性

- **智能文本识别**: 基于 Google Cloud Vision API 的高精度 OCR
- **多语言支持**: 支持中文、英文、日文等多种语言识别
- **文档布局分析**: 智能识别文档结构和布局
- **用户认证系统**: 安全的用户注册、登录和权限管理
- **结果保存管理**: 识别结果保存、编辑和导出
- **响应式设计**: 支持桌面和移动设备
- **PWA 支持**: 可安装的渐进式 Web 应用
- **实时处理**: 支持实时图像处理和预览

## 🏗️ 技术架构

### 前端技术栈
- **Vue.js 3** - 现代化前端框架
- **Vite** - 快速构建工具
- **Tailwind CSS** - 实用优先的 CSS 框架
- **DaisyUI** - 美观的 UI 组件库
- **Pinia** - 状态管理
- **Vue Router** - 路由管理

### 后端技术栈
- **Node.js** - JavaScript 运行时
- **Express.js** - Web 应用框架
- **MongoDB Atlas** - 云数据库
- **Google Cloud Vision API** - OCR 服务
- **JWT** - 身份认证
- **Winston** - 日志管理

### 部署架构
- **Google Cloud Run** - 容器化部署
- **Google Cloud Load Balancing** - 负载均衡
- **Google Cloud DNS** - 域名解析
- **GitHub Actions** - CI/CD 自动化

## 🚀 快速部署

### 一键部署到 Google Cloud

1. **准备工作**
   - Google Cloud Platform 账户
   - MongoDB Atlas 账户
   - 域名 (textistext.com)
   - Google Cloud CLI

2. **运行部署脚本**
   ```bash
   ./deploy.sh
   ```

3. **按提示输入**
   - MongoDB Atlas 连接字符串
   - Google Vision API 密钥

4. **等待部署完成**
   - 自动创建 Google Cloud 资源
   - 构建和部署 Docker 镜像
   - 配置负载均衡器和 SSL

### 手动部署

详细的手动部署指南请参考 [部署文档](docs/deployment-guide.md)。

## 🛠️ 本地开发

### 前置要求

- Node.js 18+
- MongoDB 或 MongoDB Atlas
- Google Cloud Vision API 密钥

### 安装和运行

1. **克隆仓库**
   ```bash
   git clone https://github.com/your-username/ocr-vue-app.git
   cd ocr-vue-app
   ```

2. **安装依赖**
   ```bash
   # 安装前端依赖
   cd frontend
   npm install
   
   # 安装后端依赖
   cd ../backend
   npm install
   ```

3. **配置环境变量**
   ```bash
   cd backend
   cp .env.production.template .env.local
   # 编辑 .env.local 文件，填入必要的配置
   ```

4. **启动开发服务器**
   ```bash
   # 启动后端 (端口 3000)
   cd backend
   npm run dev
   
   # 启动前端 (端口 8082)
   cd ../frontend
   npm run dev
   ```

5. **访问应用**
   - 前端: http://localhost:8082
   - 后端 API: http://localhost:3000/api

## 📁 项目结构

```
ocr-vue-app/
├── frontend/                 # Vue.js 前端应用
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   └── nginx.conf
├── backend/                  # Node.js 后端应用
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── Dockerfile
├── cloud-run/               # Cloud Run 配置
├── scripts/                 # 部署脚本
├── docs/                    # 文档
└── .github/workflows/       # GitHub Actions
```

## 🔧 配置说明

### 环境变量

主要环境变量配置：

```env
# 数据库
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=textistext_ocr

# API 密钥
GOOGLE_VISION_API_KEY=your-api-key
JWT_SECRET=your-jwt-secret

# 应用配置
NODE_ENV=production
PORT=3000
CORS_ORIGINS=https://textistext.com
```

### MongoDB Atlas 设置

1. 创建集群
2. 设置数据库用户
3. 配置网络访问 (0.0.0.0/0)
4. 获取连接字符串

## 🚀 部署到生产环境

### GitHub Actions 自动部署

1. **设置 GitHub Secrets**
   - `GCP_SA_KEY`: Google Cloud 服务账户密钥

2. **推送代码触发部署**
   ```bash
   git push origin main
   ```

### 监控和维护

```bash
# 查看服务状态
gcloud run services list --region=us-central1

# 查看日志
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# 更新密钥
echo "new-value" | gcloud secrets versions add secret-name --data-file=-
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如有问题或建议，请：

1. 查看 [部署指南](docs/deployment-guide.md)
2. 提交 [Issue](https://github.com/your-username/ocr-vue-app/issues)
3. 查看项目文档

## 🎯 路线图

- [ ] 支持更多文件格式 (PDF, DOCX)
- [ ] 批量处理功能
- [ ] API 接口文档
- [ ] 移动端 App
- [ ] 多租户支持

---

**TextIsText OCR** - 让文本识别更简单、更智能！
