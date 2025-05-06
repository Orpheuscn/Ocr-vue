# OCR文本识别工具分享指南

## 方案一：分享构建后的应用（适合非开发人员使用）

如果您想让对方直接使用应用，而不需要他们了解代码或安装开发环境：

1. 运行构建命令：
```
npm run build
```

2. 将整个`dist`目录压缩成ZIP文件
```
zip -r ocr-app-dist.zip dist
```

3. 发送ZIP文件给对方

4. 对方需要：
   - 解压ZIP文件
   - 按照dist目录中的README.md文件说明运行HTTP服务器
   - 通过浏览器访问应用

## 方案二：分享源代码（适合开发人员）

如果您想分享整个项目源代码，让对方可以进行开发或修改：

1. 清理不必要的文件（可选）：
```
# 删除node_modules和dist目录（不需要分享）
rm -rf node_modules dist
```

2. 压缩整个项目目录：
```
cd ..
zip -r ocr-app-source.zip ocr-vue-app --exclude="ocr-vue-app/node_modules/*" --exclude="ocr-vue-app/dist/*" --exclude="ocr-vue-app/.git/*"
```

3. 发送ZIP文件给对方

4. 对方需要：
   - 解压ZIP文件
   - 安装Node.js（如果尚未安装）
   - 进入项目目录
   - 运行 `npm install` 安装依赖
   - 运行 `npm run dev` 启动开发服务器
   - 浏览器会自动打开应用

## 方案三：部署到Web服务器（最方便的方式）

如果您有访问Web服务器的权限，可以直接部署应用，让任何人通过网址访问：

1. 构建应用：
```
npm run build
```

2. 将`dist`目录中的所有文件上传到Web服务器的适当目录

3. 确保服务器配置正确（对于单页应用，需要设置所有路由都指向index.html）

4. 分享应用的URL给他人

## 注意事项

1. PWA功能仅在HTTPS环境下完全可用，本地测试时部分功能可能受限
2. 如果应用依赖于特定的后端API，请确保在分享说明中包含相关信息
3. 对于保存在浏览器中的数据，每个用户的环境是独立的 