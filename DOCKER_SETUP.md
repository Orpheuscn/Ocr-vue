# Docker 部署指南

本文档说明如何使用 Docker 部署 OCR 文本识别应用。

## 先决条件

- 安装 [Docker](https://docs.docker.com/get-docker/)
- 安装 [Docker Compose](https://docs.docker.com/compose/install/)

## 快速部署

1. 克隆仓库并进入项目目录：

```bash
git clone <项目仓库地址>
cd ocr-vue-app
```

2. 使用 Docker Compose 构建并启动服务：

```bash
# 启动生产环境
docker compose up -d app

# 或者启动开发环境
docker compose up dev
```

3. 访问应用：
   - 生产环境:
     - 前端：http://localhost:8080
     - 后端 API：http://localhost:3001
   - 开发环境:
     - 前端：http://localhost:8081
     - 后端 API：http://localhost:3002

## 环境说明

### 生产环境 (app)
- 优化性能
- 使用构建后的静态文件
- 无热重载
- 适合线上部署

### 开发环境 (dev)
- 实时代码热重载
- 直接使用源文件
- 支持前端和后端的自动刷新
- 适合开发调试

## 服务说明

本 Docker 配置包含三个主要服务：

1. `app` - 生产环境OCR应用
2. `dev` - 开发环境OCR应用
3. `mongo` - MongoDB 数据库

## 数据持久化

- MongoDB 数据存储在 Docker 命名卷 `mongo-data` 中，确保数据在容器重启后仍然存在

## 常用命令

- 查看日志：
  ```bash
  docker compose logs -f [服务名称]
  ```

- 重新构建并启动服务：
  ```bash
  docker compose up -d --build [服务名称]
  ```

- 停止服务：
  ```bash
  docker compose down
  ```

- 停止服务并删除数据卷：
  ```bash
  docker compose down -v
  ```

## 自定义配置

如需自定义应用配置，可在 `docker-compose.yml` 中的 `environment` 部分添加环境变量。

## 代码修改

有关代码修改和开发流程的详细说明，请参考 [DEV_GUIDE.md](./DEV_GUIDE.md) 文件。

## 故障排除

- 如果遇到权限问题，尝试以下命令：
  ```bash
  chmod +x start.sh
  ```

- 如果前端构建失败，可以手动构建：
  ```bash
  docker exec ocr-vue-app npm run build
  ```

- 如果 MongoDB 连接失败，应用将自动降级使用内存数据库模式继续运行 