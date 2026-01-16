import Meting from '@meting/core'
import { HTTPException } from 'hono/http-exception'
import config from '../config.js'
import { format as lyricFormat } from '../utils/lyric.js'
import { readCookieFile, isAllowedHost } from '../utils/cookie.js'

// 简单的内存缓存（替代 LRU Cache）
const cache = new Map()
const CACHE_MAX_SIZE = 1000

const METING_METHODS = {
  search: 'search',
  song: 'song',
  album: 'album',
  artist: 'artist',
  playlist: 'playlist',
  lrc: 'lyric',
  url: 'url',
  pic: 'pic'
}

// HMAC-SHA1 实现（使用 Web Crypto API）
async function hmacSha1(key, message) {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  const messageData = encoder.encode(message)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export default async (c) => {
  // 1. 初始化参数
  const query = c.req.query()
  const server = query.server || 'netease'
  const type = query.type || 'search'
  const id = query.id || 'hello'
  const token = query.token || query.auth || 'token'

  // 2. 校验参数
  if (!['netease', 'tencent', 'kugou', 'baidu', 'kuwo'].includes(server)) {
    throw new HTTPException(400, { message: 'server 参数不合法' })
  }
  if (!['song', 'album', 'search', 'artist', 'playlist', 'lrc', 'url', 'pic'].includes(type)) {
    throw new HTTPException(400, { message: 'type 参数不合法' })
  }

  // 3. 鉴权
  if (['lrc', 'url', 'pic'].includes(type)) {
    if ((await auth(server, type, id)) !== token) {
      throw new HTTPException(401, { message: '鉴权失败,非法调用' })
    }
  }

  // 4. 调用 API
  const cacheKey = `${server}/${type}/${id}`
  let cachedItem = cache.get(cacheKey)
  let data

  if (cachedItem && Date.now() - cachedItem.timestamp < cachedItem.ttl) {
    data = cachedItem.data
    c.header('x-cache', 'hit')
  } else {
    c.header('x-cache', 'miss')
    const meting = new Meting(server)
    meting.format(true)

    // 检查 referrer 并配置 cookie
    const referrer = c.req.header('referer')
    if (isAllowedHost(referrer)) {
      const cookie = await readCookieFile(server)
      if (cookie) {
        meting.cookie(cookie)
      }
    }

    const method = METING_METHODS[type]
    let response
    try {
      response = await meting[method](id)
    } catch (error) {
      throw new HTTPException(500, { message: '上游 API 调用失败' })
    }
    try {
      data = JSON.parse(response)
    } catch (error) {
      throw new HTTPException(500, { message: '上游 API 返回格式异常' })
    }

    // 缓存数据
    const ttl = type === 'url' ? 1000 * 60 * 10 : 1000 * 60 * 60
    cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    })

    // 限制缓存大小
    if (cache.size > CACHE_MAX_SIZE) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }
  }

  // 5. 组装结果
  if (type === 'url') {
    let url = data.url
    // 空结果返回 404
    if (!url) {
      return c.body(null, 404)
    }
    // 链接转换
    if (server === 'netease') {
      url = url
        .replace('://m7c.', '://m7.')
        .replace('://m8c.', '://m8.')
        .replace('http://', 'https://')
      if (url.includes('vuutv=')) {
        const tempUrl = new URL(url)
        tempUrl.search = ''
        url = tempUrl.toString()
      }
    }
    if (server === 'tencent') {
      url = url
        .replace('http://', 'https://')
        .replace('://ws.stream.qqmusic.qq.com', '://dl.stream.qqmusic.qq.com')
    }
    if (server === 'baidu') {
      url = url
        .replace('http://zhangmenshiting.qianqian.com', 'https://gss3.baidu.com/y0s1hSulBw92lNKgpU_Z2jR7b2w6buu')
    }
    return c.redirect(url)
  }

  if (type === 'pic') {
    const url = data.url
    // 空结果返回 404
    if (!url) {
      return c.body(null, 404)
    }
    return c.redirect(url)
  }

  if (type === 'lrc') {
    return c.text(lyricFormat(data.lyric, data.tlyric || ''))
  }

  return c.json(await Promise.all(data.map(async x => {
    const urlAuth = await auth(server, 'url', x.url_id)
    const picAuth = await auth(server, 'pic', x.pic_id)
    const lrcAuth = await auth(server, 'lrc', x.lyric_id)
    return {
      title: x.name,
      author: x.artist.join(' / '),
      url: `${config.meting.url}/api?server=${server}&type=url&id=${x.url_id}&auth=${urlAuth}`,
      pic: `${config.meting.url}/api?server=${server}&type=pic&id=${x.pic_id}&auth=${picAuth}`,
      lrc: `${config.meting.url}/api?server=${server}&type=lrc&id=${x.lyric_id}&auth=${lrcAuth}`
    }
  })))
}

const auth = async (server, type, id) => {
  return await hmacSha1(config.meting.token, `${server}${type}${id}`)
}
