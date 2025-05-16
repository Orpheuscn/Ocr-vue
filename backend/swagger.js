import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Swagger 定义
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OCR Vue 应用 API',
      version: '1.0.0',
      description: 'OCR Vue 应用的 API 文档',
      contact: {
        name: 'API 支持',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '开发服务器'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  // 指定 API 路由文件的路径
  apis: [
    resolve(__dirname, './routes/*.js'),
    resolve(__dirname, './controllers/*.js'),
    resolve(__dirname, './models/*.js')
  ]
};

// 简单的基本认证中间件
const basicAuth = (username, password) => {
  return (req, res, next) => {
    // 检查是否提供了认证信息
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Swagger API 文档"');
      return res.status(401).send('需要认证才能访问 API 文档');
    }
    
    // 解析认证信息
    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];
    
    // 验证用户名和密码
    if (user === username && pass === password) {
      return next();
    }
    
    // 认证失败
    res.setHeader('WWW-Authenticate', 'Basic realm="Swagger API 文档"');
    return res.status(401).send('认证失败');
  };
};

// IP 白名单检查中间件
const ipWhitelist = (allowedIps = ['127.0.0.1', '::1', 'localhost']) => {
  return (req, res, next) => {
    const clientIp = req.ip || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress || 
                    req.connection.socket.remoteAddress;
    
    // 检查是否在白名单中
    const isAllowed = allowedIps.some(ip => {
      if (ip === 'localhost') {
        return clientIp === '127.0.0.1' || clientIp === '::1';
      }
      return clientIp === ip || clientIp.includes(ip);
    });
    
    if (isAllowed) {
      return next();
    }
    
    // 如果不在白名单中，返回 403 禁止访问
    return res.status(403).send('禁止访问：IP 地址不在白名单中');
  };
};

// 配置 swagger-ui-express
const swaggerSetup = (app) => {
  // 获取环境变量
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const swaggerUser = process.env.SWAGGER_USER || 'admin';
  const swaggerPassword = process.env.SWAGGER_PASSWORD || 'admin123';
  const swaggerEnabled = process.env.SWAGGER_ENABLED === 'true';
  
  // 获取允许的 IP 地址（默认只允许本地访问）
  const allowedIps = (process.env.SWAGGER_ALLOWED_IPS || '127.0.0.1,::1').split(',');
  
  // 在生产环境中，除非明确启用，否则禁用 Swagger
  if (isProduction && !swaggerEnabled) {
    console.log(`生产环境中 Swagger 文档已禁用 (NODE_ENV=${nodeEnv}, SWAGGER_ENABLED=${swaggerEnabled})`);
    
    // 添加一个路由处理程序，返回 404 错误
    app.use('/api-docs', (req, res) => {
      res.status(404).send('在生产环境中，API 文档不可用');
    });
    
    return;
  }
  
  // 初始化 swagger-jsdoc
  const specs = swaggerJsdoc(options);
  
  // 设置 Swagger UI 选项
  const swaggerUiOptions = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "OCR Vue 应用 API 文档"
  };
  
  // 中间件链：IP 白名单 -> 基本认证 -> Swagger UI
  const middlewareChain = [
    ipWhitelist(allowedIps),
    basicAuth(swaggerUser, swaggerPassword),
    swaggerUi.serve
  ];
  
  // 添加 Swagger UI 路由
  app.use('/api-docs', ...middlewareChain, swaggerUi.setup(specs, swaggerUiOptions));
  
  // 提供 JSON 格式的 Swagger 规范（也需要认证）
  app.get('/api-docs.json', ipWhitelist(allowedIps), basicAuth(swaggerUser, swaggerPassword), (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
  
  console.log(`Swagger 文档已在 /api-docs 路径下可用（环境: ${nodeEnv}）`);
  console.log(`认证信息 - 用户名: ${swaggerUser}, 密码: ${swaggerPassword}`);
  console.log(`IP 白名单: ${allowedIps.join(', ')}`);
};

export default swaggerSetup; 