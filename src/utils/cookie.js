// Cloudflare Workers 兼容的 cookie 处理
import config from '../config.js'

// Cookie 缓存（使用 Map 替代 LRU）
const cookieCache = new Map()
const COOKIE_TTL = 1000 * 60 * 5 // 5分钟缓存过期

/**
 * 读取指定平台的 cookie（仅从环境变量）
 * @param {string} server - 平台名称 (netease, tencent 等)
 * @returns {Promise<string>} cookie 字符串，失败时返回空字符串
 */
export async function readCookieFile (server) {
  const now = Date.now()
  const cached = cookieCache.get(server)

  // 检查缓存是否有效
  if (cached && now - cached.timestamp < COOKIE_TTL) {
    return cached.value
  }

  // 从环境变量读取
  const envKey = `METING_COOKIE_${server.toUpperCase()}`
  const envCookie = globalThis[envKey]
  if (envCookie) {
    const value = envCookie.trim()
    // 更新缓存
    cookieCache.set(server, {
      value,
      timestamp: now
    })
    return value
  }

  // 无 cookie 时缓存空字符串
  cookieCache.set(server, {
    value: '',
    timestamp: now
  })
  return ''
}

/**
 * 验证 referrer 是否在允许的主机列表中
 * @param {string} referrer - 请求的 referrer
 * @returns {boolean} 是否允许
 */
export function isAllowedHost (referrer) {
  if (config.meting.cookie.allowHosts.length === 0) return true
  if (!referrer) return false

  try {
    const url = new URL(referrer)
    const hostname = url.hostname.toLowerCase()
    return config.meting.cookie.allowHosts.includes(hostname)
  } catch (error) {
    return false
  }
}
