#!/bin/bash

# RabbitMQ设置脚本
# 用于快速设置RabbitMQ开发环境（本地安装版本）

set -e

echo "🐰 OCR应用 RabbitMQ设置脚本"
echo "================================"

# 配置变量
RABBITMQ_USER="ocr-user"
RABBITMQ_PASS="ocr-password"
RABBITMQ_VHOST="/ocr-app"

echo ""
echo "💻 本地安装RabbitMQ..."

# 检测操作系统
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command -v brew &> /dev/null; then
        echo "🍺 使用Homebrew安装RabbitMQ..."
        brew install rabbitmq
        brew services start rabbitmq
    else
        echo "❌ 请先安装Homebrew: https://brew.sh/"
        exit 1
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v apt-get &> /dev/null; then
        echo "📦 使用apt-get安装RabbitMQ..."
        sudo apt-get update
        sudo apt-get install -y rabbitmq-server
        sudo systemctl start rabbitmq-server
        sudo systemctl enable rabbitmq-server
    elif command -v yum &> /dev/null; then
        echo "📦 使用yum安装RabbitMQ..."
        sudo yum install -y rabbitmq-server
        sudo systemctl start rabbitmq-server
        sudo systemctl enable rabbitmq-server
    else
        echo "❌ 不支持的Linux发行版"
        exit 1
    fi
else
    echo "❌ 不支持的操作系统: $OSTYPE"
    exit 1
fi

echo ""
echo "🔧 配置RabbitMQ..."

# 等待RabbitMQ完全启动
echo "⏳ 等待RabbitMQ服务就绪..."
for i in {1..30}; do
    if curl -s http://localhost:15672 > /dev/null 2>&1; then
        echo "✅ RabbitMQ管理界面已就绪"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ RabbitMQ启动超时"
        exit 1
    fi
    sleep 2
done

# 配置RabbitMQ用户和虚拟主机
echo "👤 配置RabbitMQ用户和虚拟主机..."

# 启用管理插件
sudo rabbitmq-plugins enable rabbitmq_management

# 创建用户
sudo rabbitmqctl add_user $RABBITMQ_USER $RABBITMQ_PASS 2>/dev/null || true
sudo rabbitmqctl set_user_tags $RABBITMQ_USER administrator

# 创建虚拟主机
sudo rabbitmqctl add_vhost $RABBITMQ_VHOST 2>/dev/null || true
sudo rabbitmqctl set_permissions -p $RABBITMQ_VHOST $RABBITMQ_USER ".*" ".*" ".*"

# 删除默认guest用户（安全考虑）
sudo rabbitmqctl delete_user guest 2>/dev/null || true

echo ""
echo "📝 创建环境配置文件..."

# 创建或更新.env.local文件
ENV_FILE="../.env.local"
if [ ! -f "$ENV_FILE" ]; then
    cp ../.env.example "$ENV_FILE"
    echo "✅ 已创建 .env.local 文件"
else
    echo "ℹ️  .env.local 文件已存在，请手动更新RabbitMQ配置"
fi

echo ""
echo "🎉 RabbitMQ设置完成!"
echo ""
echo "📊 管理界面: http://localhost:15672"
echo "👤 用户名: $RABBITMQ_USER"
echo "🔑 密码: $RABBITMQ_PASS"
echo "🏠 虚拟主机: $RABBITMQ_VHOST"
echo ""
echo "🚀 现在可以启动应用了:"
echo "   cd .."
echo "   npm install"
echo "   npm run dev:ts"
echo ""

# 可选：测试连接
read -p "是否要测试RabbitMQ连接? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔍 测试RabbitMQ连接..."

    # 创建简单的测试脚本
    cat > test-rabbitmq.js << 'EOF'
const amqp = require('amqplib');

async function testConnection() {
    try {
        const connection = await amqp.connect('amqp://ocr-user:ocr-password@localhost:5672/ocr-app');
        const channel = await connection.createChannel();

        console.log('✅ RabbitMQ连接测试成功!');

        await channel.close();
        await connection.close();
    } catch (error) {
        console.error('❌ RabbitMQ连接测试失败:', error.message);
        process.exit(1);
    }
}

testConnection();
EOF

    # 运行测试
    if command -v node &> /dev/null; then
        cd ..
        if [ -f "node_modules/amqplib/package.json" ]; then
            node scripts/test-rabbitmq.js
        else
            echo "⚠️  请先运行 'npm install' 安装依赖"
        fi
        cd scripts
    else
        echo "⚠️  未检测到Node.js，跳过连接测试"
    fi

    # 清理测试文件
    rm -f test-rabbitmq.js
fi

echo ""
echo "✨ 设置完成! 享受使用RabbitMQ吧!"
