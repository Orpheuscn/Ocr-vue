# OCR Vue 应用

这是一个使用Vue 3和Node.js构建的OCR（光学字符识别）应用程序。项目采用了模块化结构，将前端、后端、数据库和Nginx配置分离，便于维护和部署。

## 项目结构

```
/project-root
├── frontend/              # Vue前端应用
├── backend/               # Node.js后端服务
├── database/              # 数据库文件和迁移脚本
├── nginx/                 # Nginx配置
└── config/                # 项目整体配置
```

## 各模块说明

### frontend - 前端应用

前端使用Vue 3构建，包含OCR功能的用户界面。

- 技术栈：Vue 3、Pinia、Vue Router、Tailwind CSS

### backend - 后端服务

提供API服务，处理OCR请求和数据存储。

- 技术栈：Node.js、Express、Sequelize、SQLite

### database - 数据库

存储应用数据，使用SQLite本地数据库。

### nginx - Web服务器和反向代理

负责负载均衡和反向代理，将请求路由到前端和后端服务。

### config - 配置文件

存储全局配置和环境变量。

## 安装和运行

### 1. 安装前端依赖

```bash
cd frontend
npm install
```

### 2. 安装后端依赖

```bash
cd backend
npm install
```

### 3. 启动开发服务器

前端开发服务器：
```bash
cd frontend
npm run dev
```

后端服务器：
```bash
cd backend
npm run dev
```

## 生产环境部署

### 1. 构建前端

```bash
cd frontend
npm run build
```

### 2. 配置Nginx

将前端构建文件复制到Nginx静态文件目录：

```bash
cp -r frontend/dist/* /path/to/nginx/html/
```

使用nginx目录中的配置文件来设置Nginx：

```bash
cp nginx/nginx.conf /etc/nginx/nginx.conf
```

### 3. 启动后端服务器

```bash
cd backend
npm start
```

### 4. 启动Nginx服务

```bash
nginx -s reload
```

## 环境变量配置

项目使用config/.env文件存储环境变量。您可以根据需要进行修改。 