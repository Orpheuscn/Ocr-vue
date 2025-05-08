#!/bin/sh

# 确保脚本在错误时退出
set -e

# 显示启动信息
echo "启动OCR应用..."

# 如果是生产环境，使用构建好的前端
if [ "$NODE_ENV" = "production" ]; then
  echo "以生产模式启动服务..."

  # 确保dist目录存在，如果不存在则构建
  if [ ! -d "/app/dist" ]; then
    echo "生产环境dist目录不存在，开始构建..."
    npm run build
  fi

  # 启动后端API服务
  node api/server.js &
  API_PID=$!

  # 使用Vite预览服务来提供构建好的前端
  npm run preview

  # 如果前端退出，也终止后端进程
  kill $API_PID
else
  # 开发环境，使用热重载功能
  echo "以开发模式启动服务..."
  
  # 启动后端服务（使用nodemon如果可用）
  if command -v nodemon >/dev/null 2>&1; then
    echo "使用nodemon启动后端（支持自动重载）..."
    nodemon api/server.js &
  else
    echo "使用node启动后端..."
    node api/server.js &
  fi
  
  # 启动前端开发服务器（支持热重载）
  echo "启动前端开发服务器（支持热重载）..."
  npm run dev
fi 