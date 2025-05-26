module.exports = {
  apps: [
    {
      name: 'ocr-app-dev',
      script: 'start.js',
      args: 'dev',
      instances: 1,
      autorestart: true,
      watch: false, // 在开发环境中可以设置为 true 来启用文件监控
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        WATCH: true
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        WATCH: false
      },
      // 日志配置
      log_file: './logs/pm2/combined.log',
      out_file: './logs/pm2/out.log',
      error_file: './logs/pm2/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 进程管理
      min_uptime: '10s',
      max_restarts: 10,
      
      // 监控配置
      pmx: true,
      
      // 集群模式配置（生产环境可以启用）
      exec_mode: 'fork', // 或 'cluster' 用于集群模式
      
      // 忽略监控的文件/目录
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        '*.log'
      ],
      
      // 监控的文件扩展名
      watch_options: {
        followSymlinks: false,
        usePolling: false,
        interval: 1000
      }
    },
    {
      name: 'ocr-app-prod',
      script: 'start.js',
      args: 'prod',
      instances: 'max', // 使用所有CPU核心
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // 生产环境日志配置
      log_file: './logs/pm2/prod-combined.log',
      out_file: './logs/pm2/prod-out.log',
      error_file: './logs/pm2/prod-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 生产环境进程管理
      min_uptime: '30s',
      max_restarts: 5,
      
      // 性能监控
      pmx: true,
      
      // 优雅关闭
      kill_timeout: 5000,
      listen_timeout: 8000,
      
      // 健康检查
      health_check_grace_period: 3000
    }
  ],
  
  // 部署配置（可选）
  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/ocr-vue-app.git',
      path: '/var/www/ocr-vue-app',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
