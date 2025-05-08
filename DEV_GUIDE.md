# OCR应用开发指南

本指南介绍如何在Docker环境中开发和部署OCR应用。

## 开发环境

### 启动开发环境

开发环境配置了热重载功能，让您可以实时查看代码修改效果：

```bash
# 启动开发环境
docker compose up dev
```

开发环境将在以下地址可用：
- 前端: http://localhost:8081
- 后端API: http://localhost:3002

### 开发工作流

1. 修改前端代码（Vue组件、CSS等）
   - 修改保存后，前端会自动热重载

2. 修改后端代码（API路由、控制器等）
   - 保存后nodemon会自动重启后端服务

3. 修改配置文件或添加新依赖
   - 需要重新构建容器：`docker compose up -d --build dev`

## 生产环境

### 构建和部署生产环境

生产环境优化了性能，并使用构建后的静态文件：

```bash
# 构建并启动生产环境
docker compose up -d app
```

生产环境将在以下地址可用：
- 前端: http://localhost:8080
- 后端API: http://localhost:3001

### 生产环境管理

- 查看日志: `docker compose logs -f app`
- 重启服务: `docker compose restart app`
- 停止服务: `docker compose down`

## 切换环境

您可以同时运行开发和生产环境，因为它们使用不同的端口：

```bash
# 启动所有服务
docker compose up -d
```

或者单独启动特定环境：

```bash
# 只启动生产环境
docker compose up -d app mongo

# 只启动开发环境
docker compose up -d dev mongo
```

## 常见问题

1. **前端构建失败**
   - 手动构建: `docker exec ocr-vue-app npm run build`

2. **Node模块问题**
   - 重新安装依赖: `docker exec ocr-vue-app npm ci`

3. **数据库连接问题**
   - 检查MongoDB服务: `docker logs ocr-mongo` 