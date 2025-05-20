// 动态添加内容安全策略
;(function () {
  // 创建CSP meta标签
  const cspMeta = document.createElement('meta')
  cspMeta.httpEquiv = 'Content-Security-Policy'

  // 构建CSP策略
  const cspContent = [
    // 默认限制所有内容来源
    "default-src 'self'",

    // 脚本来源限制
    "script-src 'self' https://vision.googleapis.com https://storage.googleapis.com https://cdnjs.cloudflare.com 'unsafe-inline'",

    // 样式来源限制
    "style-src 'self' 'unsafe-inline'",

    // 图片来源限制
    "img-src 'self' data: blob: https://vision.googleapis.com",

    // 连接来源限制
    "connect-src 'self' https://vision.googleapis.com",

    // 字体来源限制
    "font-src 'self'",

    // 媒体来源限制
    "media-src 'self'",

    // 对象来源限制
    "object-src 'none'",

    // 框架来源限制
    "frame-src 'self'",

    // 工作线程来源限制
    "worker-src 'self' blob:",

    // 表单操作限制
    "form-action 'self'",

    // 基础URI限制
    "base-uri 'self'",

    // 框架祖先限制
    "frame-ancestors 'self'",

    // 升级不安全请求
    'upgrade-insecure-requests',

    // 阻止混合内容
    'block-all-mixed-content',
  ].join('; ')

  // 设置CSP内容
  cspMeta.content = cspContent

  // 添加到文档头部
  document.head.appendChild(cspMeta)
})()
