# Nginx 配置说明

这个目录包含了OCR Vue应用的Nginx服务器配置。

## 目录结构

```
nginx/
├── nginx.conf            - Nginx 配置文件
├── ssl/                  - SSL 证书目录
│   ├── cert.pem          - SSL 证书（由mkcert生成）
│   └── key.pem           - SSL 私钥（由mkcert生成）
├── start-nginx-dev.sh    - 启动脚本
└── stop-nginx.sh         - 停止脚本
```

## 功能

这个Nginx配置提供以下功能：

1. 静态文件服务 - 为前端Vue应用提供静态文件服务
2. API请求代理 - 将API请求代理到后端服务
3. HTTPS支持 - 使用mkcert生成的本地受信任证书提供HTTPS服务
4. 资源缓存 - 为静态资源设置适当的缓存策略

## 默认端口

- HTTP: `8000`
- HTTPS: `8443`

## 使用方法

### 准备工作 - 安装mkcert并生成证书

为了获得浏览器信任的本地证书，我们使用mkcert工具：

```bash
# 安装mkcert
brew install mkcert

# 安装本地CA根证书
mkcert -install

# 为本地域名生成证书
mkcert -key-file nginx/ssl/key.pem -cert-file nginx/ssl/cert.pem localhost 127.0.0.1 ::1
```

### 启动Nginx

```bash
./nginx/start-nginx-dev.sh
```

启动脚本会自动执行以下操作：
- 检查Nginx是否已安装
- 检查前端构建是否存在，如不存在会询问是否构建
- 检查后端服务是否运行，如未运行会询问是否启动
- 检查SSL证书是否存在
- 启动Nginx服务器

### 停止Nginx

```bash
./nginx/stop-nginx.sh
```

### 重新加载配置

如果修改了配置文件，可以通过以下命令重新加载配置：

```bash
nginx -s reload
```

## 访问应用

- HTTP: [http://localhost:8000](http://localhost:8000)
- HTTPS: [https://localhost:8443](https://localhost:8443)

## 证书信息

与自签名证书不同，mkcert生成的证书会被浏览器信任，不会显示安全警告。这是因为mkcert会：

1. 创建一个本地证书颁发机构(CA)
2. 将该CA添加到系统和浏览器的信任存储中
3. 使用该CA签发证书

这使得本地开发更加顺畅，没有讨厌的安全警告，同时保持与生产环境类似的安全模型。

## 注意事项

1. mkcert生成的证书仅在本地设备上受信任
2. 在生产环境中，应使用Let's Encrypt等服务获取公开信任的证书
3. 生产环境中，还应该调整性能参数和日志配置

## 常见问题

### Nginx启动失败

如果Nginx启动失败，可能有以下原因：

1. 端口已被占用：可以修改`nginx.conf`中的端口号
2. 权限问题：确保有足够的权限访问配置文件和日志目录
3. 配置错误：检查`nginx.conf`文件的语法

### 无法访问前端应用

1. 确保前端已经构建：`cd frontend && npm run build`
2. 检查前端构建目录：`frontend/dist`必须存在
3. 确认Nginx配置中的路径正确

### 无法访问API

1. 确保后端服务已启动：`cd backend && npm start`
2. 检查后端是否在3000端口监听
3. 确认Nginx配置中的代理设置正确

### 使用Let's Encrypt（生产环境）

对于生产环境，您应该使用Let's Encrypt获取免费的受信任证书：

```bash
# 安装certbot
brew install certbot

# 获取证书（需要公网域名）
sudo certbot certonly --standalone -d 您的域名.com

# 证书存放在 /etc/letsencrypt/live/您的域名.com/ 目录下
```

## 自定义配置

如需修改配置，编辑`nginx.conf`文件，主要可以修改以下部分：

1. 端口号 - 修改`listen`指令
2. 静态文件目录 - 修改`root`指令
3. 后端API地址 - 修改`proxy_pass`指令
4. 缓存设置 - 修改`expires`指令 