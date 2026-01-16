// Cloudflare Workers 环境变量配置
const toBoolean = value => {
  if (value === undefined) return false
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

const toNumber = (value, fallback) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

export default {
  http: {
    prefix: globalThis.HTTP_PREFIX || '',
    port: 80 // Workers 不需要端口
  },
  https: {
    enabled: false, // Workers 自动处理 HTTPS
    port: 443,
    keyPath: '',
    certPath: ''
  },
  meting: {
    // 默认指向站点的 Meting 专用子域，避免生成相对 /api 路径导致客户端使用站点根域调用 API
    url: globalThis.METING_URL || 'https://api.vedaru.cn',
    token: globalThis.METING_TOKEN || 'token',
    cookie: {
      allowHosts: globalThis.METING_COOKIE_ALLOW_HOSTS
        ? globalThis.METING_COOKIE_ALLOW_HOSTS.split(',').map(h => h.trim().toLowerCase())
        : []
    }
  }
}
