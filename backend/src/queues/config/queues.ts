/**
 * RabbitMQ队列配置
 * 定义了所有队列、交换机和路由的配置
 */

// RabbitMQ连接配置
export interface RabbitMQConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  vhost: string;
  heartbeat: number;
  connectionTimeout: number;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  prefetchCount: number;
}

// 队列配置接口
export interface QueueConfig {
  name: string;
  durable: boolean;
  exclusive: boolean;
  autoDelete: boolean;
  arguments?: Record<string, any>;
}

// 交换机配置接口
export interface ExchangeConfig {
  name: string;
  type: 'direct' | 'topic' | 'fanout' | 'headers';
  durable: boolean;
  autoDelete: boolean;
  arguments?: Record<string, any>;
}

// 绑定配置接口
export interface BindingConfig {
  queue: string;
  exchange: string;
  routingKey: string;
  arguments?: Record<string, any>;
}

// 从环境变量获取RabbitMQ配置
export function getRabbitMQConfig(): RabbitMQConfig {
  return {
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: parseInt(process.env.RABBITMQ_PORT || '5672'),
    username: process.env.RABBITMQ_USERNAME || 'guest',
    password: process.env.RABBITMQ_PASSWORD || 'guest',
    vhost: process.env.RABBITMQ_VHOST || '/',
    heartbeat: parseInt(process.env.RABBITMQ_HEARTBEAT || '60'),
    connectionTimeout: parseInt(process.env.RABBITMQ_CONNECTION_TIMEOUT || '30000'),
    reconnectDelay: parseInt(process.env.RABBITMQ_RECONNECT_DELAY || '5000'),
    maxReconnectAttempts: parseInt(process.env.RABBITMQ_MAX_RECONNECT_ATTEMPTS || '5'),
    prefetchCount: parseInt(process.env.RABBITMQ_PREFETCH_COUNT || '10')
  };
}

// 交换机配置
export const EXCHANGES: Record<string, ExchangeConfig> = {
  // 主要的直接交换机
  OCR_DIRECT: {
    name: 'ocr.direct',
    type: 'direct',
    durable: true,
    autoDelete: false
  },
  
  // 主题交换机，用于复杂路由
  OCR_TOPIC: {
    name: 'ocr.topic',
    type: 'topic',
    durable: true,
    autoDelete: false
  },
  
  // 通知交换机
  NOTIFICATION: {
    name: 'notification.fanout',
    type: 'fanout',
    durable: true,
    autoDelete: false
  },
  
  // 死信交换机
  DEAD_LETTER: {
    name: 'dlx.direct',
    type: 'direct',
    durable: true,
    autoDelete: false
  },
  
  // 延迟交换机（需要rabbitmq-delayed-message-exchange插件）
  DELAYED: {
    name: 'delayed.direct',
    type: 'direct',
    durable: true,
    autoDelete: false,
    arguments: {
      'x-delayed-type': 'direct'
    }
  }
};

// 队列配置
export const QUEUES: Record<string, QueueConfig> = {
  // OCR处理队列
  OCR_PROCESS: {
    name: 'ocr.process.queue',
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: {
      'x-message-ttl': 3600000, // 1小时TTL
      'x-max-priority': 10, // 支持优先级
      'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER.name,
      'x-dead-letter-routing-key': 'ocr.failed'
    }
  },
  
  // 高优先级OCR队列
  OCR_PROCESS_HIGH: {
    name: 'ocr.process.high.queue',
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: {
      'x-message-ttl': 1800000, // 30分钟TTL
      'x-max-priority': 10,
      'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER.name,
      'x-dead-letter-routing-key': 'ocr.failed'
    }
  },
  
  // 任务状态更新队列
  TASK_STATUS: {
    name: 'task.status.queue',
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: {
      'x-message-ttl': 600000, // 10分钟TTL
      'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER.name,
      'x-dead-letter-routing-key': 'status.failed'
    }
  },
  
  // 用户通知队列
  USER_NOTIFICATION: {
    name: 'user.notification.queue',
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: {
      'x-message-ttl': 86400000, // 24小时TTL
      'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER.name,
      'x-dead-letter-routing-key': 'notification.failed'
    }
  },
  
  // WebSocket通知队列
  WEBSOCKET_NOTIFICATION: {
    name: 'websocket.notification.queue',
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: {
      'x-message-ttl': 300000, // 5分钟TTL
      'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER.name,
      'x-dead-letter-routing-key': 'websocket.failed'
    }
  },
  
  // 邮件通知队列
  EMAIL_NOTIFICATION: {
    name: 'email.notification.queue',
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: {
      'x-message-ttl': 3600000, // 1小时TTL
      'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER.name,
      'x-dead-letter-routing-key': 'email.failed'
    }
  },
  
  // 图像处理队列
  IMAGE_PROCESSING: {
    name: 'image.processing.queue',
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: {
      'x-message-ttl': 1800000, // 30分钟TTL
      'x-max-priority': 5,
      'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER.name,
      'x-dead-letter-routing-key': 'image.failed'
    }
  },
  
  // 批量处理队列
  BATCH_PROCESSING: {
    name: 'batch.processing.queue',
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: {
      'x-message-ttl': 7200000, // 2小时TTL
      'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER.name,
      'x-dead-letter-routing-key': 'batch.failed'
    }
  },
  
  // 系统监控队列
  SYSTEM_MONITORING: {
    name: 'system.monitoring.queue',
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: {
      'x-message-ttl': 300000, // 5分钟TTL
      'x-max-length': 1000, // 最大消息数量
      'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER.name,
      'x-dead-letter-routing-key': 'monitoring.failed'
    }
  },
  
  // 错误报告队列
  ERROR_REPORTING: {
    name: 'error.reporting.queue',
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: {
      'x-message-ttl': 86400000, // 24小时TTL
      'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER.name,
      'x-dead-letter-routing-key': 'error.failed'
    }
  },
  
  // 死信队列
  DEAD_LETTER: {
    name: 'dlx.queue',
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: {
      'x-message-ttl': 604800000 // 7天TTL
    }
  },
  
  // 重试队列
  RETRY: {
    name: 'retry.queue',
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: {
      'x-message-ttl': 60000, // 1分钟TTL
      'x-dead-letter-exchange': EXCHANGES.OCR_DIRECT.name,
      'x-dead-letter-routing-key': 'ocr.process'
    }
  }
};

// 路由键配置
export const ROUTING_KEYS = {
  // OCR相关路由
  OCR_PROCESS: 'ocr.process',
  OCR_PROCESS_HIGH: 'ocr.process.high',
  OCR_COMPLETED: 'ocr.completed',
  OCR_FAILED: 'ocr.failed',
  
  // 任务状态路由
  TASK_STATUS_UPDATE: 'task.status.update',
  TASK_PROGRESS: 'task.progress',
  
  // 通知路由
  USER_NOTIFICATION: 'user.notification',
  WEBSOCKET_NOTIFICATION: 'websocket.notification',
  EMAIL_NOTIFICATION: 'email.notification',
  
  // 图像处理路由
  IMAGE_DETECTION: 'image.detection',
  IMAGE_CROPPING: 'image.cropping',
  IMAGE_ENHANCEMENT: 'image.enhancement',
  
  // 批量处理路由
  BATCH_START: 'batch.start',
  BATCH_PROGRESS: 'batch.progress',
  BATCH_COMPLETED: 'batch.completed',
  
  // 系统监控路由
  SYSTEM_METRICS: 'system.metrics',
  HEALTH_CHECK: 'health.check',
  
  // 错误报告路由
  ERROR_REPORT: 'error.report',
  
  // 死信路由
  DEAD_LETTER: 'dlx'
} as const;

// 队列绑定配置
export const BINDINGS: BindingConfig[] = [
  // OCR处理绑定
  {
    queue: QUEUES.OCR_PROCESS.name,
    exchange: EXCHANGES.OCR_DIRECT.name,
    routingKey: ROUTING_KEYS.OCR_PROCESS
  },
  {
    queue: QUEUES.OCR_PROCESS_HIGH.name,
    exchange: EXCHANGES.OCR_DIRECT.name,
    routingKey: ROUTING_KEYS.OCR_PROCESS_HIGH
  },
  
  // 任务状态绑定
  {
    queue: QUEUES.TASK_STATUS.name,
    exchange: EXCHANGES.OCR_DIRECT.name,
    routingKey: ROUTING_KEYS.TASK_STATUS_UPDATE
  },
  
  // 通知绑定
  {
    queue: QUEUES.USER_NOTIFICATION.name,
    exchange: EXCHANGES.NOTIFICATION.name,
    routingKey: ''
  },
  {
    queue: QUEUES.WEBSOCKET_NOTIFICATION.name,
    exchange: EXCHANGES.OCR_DIRECT.name,
    routingKey: ROUTING_KEYS.WEBSOCKET_NOTIFICATION
  },
  {
    queue: QUEUES.EMAIL_NOTIFICATION.name,
    exchange: EXCHANGES.OCR_DIRECT.name,
    routingKey: ROUTING_KEYS.EMAIL_NOTIFICATION
  },
  
  // 图像处理绑定
  {
    queue: QUEUES.IMAGE_PROCESSING.name,
    exchange: EXCHANGES.OCR_DIRECT.name,
    routingKey: ROUTING_KEYS.IMAGE_DETECTION
  },
  
  // 批量处理绑定
  {
    queue: QUEUES.BATCH_PROCESSING.name,
    exchange: EXCHANGES.OCR_DIRECT.name,
    routingKey: ROUTING_KEYS.BATCH_START
  },
  
  // 系统监控绑定
  {
    queue: QUEUES.SYSTEM_MONITORING.name,
    exchange: EXCHANGES.OCR_DIRECT.name,
    routingKey: ROUTING_KEYS.SYSTEM_METRICS
  },
  
  // 错误报告绑定
  {
    queue: QUEUES.ERROR_REPORTING.name,
    exchange: EXCHANGES.OCR_DIRECT.name,
    routingKey: ROUTING_KEYS.ERROR_REPORT
  },
  
  // 死信绑定
  {
    queue: QUEUES.DEAD_LETTER.name,
    exchange: EXCHANGES.DEAD_LETTER.name,
    routingKey: ROUTING_KEYS.DEAD_LETTER
  }
];

// 队列优先级配置
export const QUEUE_PRIORITIES = {
  HIGH: 10,
  NORMAL: 5,
  LOW: 1
} as const;

// 消息TTL配置（毫秒）
export const MESSAGE_TTL = {
  URGENT: 300000,    // 5分钟
  NORMAL: 1800000,   // 30分钟
  LOW: 3600000,      // 1小时
  BATCH: 7200000,    // 2小时
  NOTIFICATION: 86400000 // 24小时
} as const;

// 重试策略配置
export const RETRY_STRATEGIES = {
  OCR_PROCESSING: {
    maxRetries: 3,
    initialDelay: 5000,
    maxDelay: 60000,
    backoffMultiplier: 2,
    jitter: true
  },
  NOTIFICATION: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 1.5,
    jitter: true
  },
  IMAGE_PROCESSING: {
    maxRetries: 2,
    initialDelay: 10000,
    maxDelay: 120000,
    backoffMultiplier: 3,
    jitter: false
  }
} as const;

// 队列监控配置
export const MONITORING_CONFIG = {
  healthCheckInterval: 30000, // 30秒
  metricsCollectionInterval: 60000, // 1分钟
  alertThresholds: {
    queueLength: 1000,
    processingTime: 300000, // 5分钟
    errorRate: 0.1 // 10%
  }
} as const;
