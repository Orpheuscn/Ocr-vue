# 使用Node.js 20作为基础镜像
FROM node:20-alpine

# 安装基本工具和canvas依赖
RUN apk add --no-cache bash curl \
    # canvas依赖
    build-base g++ cairo-dev jpeg-dev pango-dev giflib-dev

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 安装开发工具
RUN npm install -g nodemon

# 复制源代码
COPY . .

# 赋予启动脚本执行权限
RUN chmod +x start.sh

# 构建前端应用（可以在启动时按需构建）
# RUN npm run build

# 暴露前端和API端口
EXPOSE 8080 3000

# 使用启动脚本
CMD ["./start.sh"] 