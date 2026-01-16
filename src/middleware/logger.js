// Cloudflare Workers 兼容的简单日志
const logger = {
  info: (obj, msg) => console.log(`[INFO] ${msg}`, obj),
  error: (obj, msg) => console.error(`[ERROR] ${msg}`, obj),
  debug: (obj, msg) => console.debug(`[DEBUG] ${msg}`, obj),
  warn: (obj, msg) => console.warn(`[WARN] ${msg}`, obj)
}

const generateRequestId = () => Math.random().toString(36).substring(7)

const requestLogger = async (c, next) => {
  const requestId = generateRequestId()
  const startTime = performance.now()

  const request = {
    method: c.req.method,
    url: c.req.path,
    headers: c.req.header()
  }

  logger.info({ req: request, reqId: requestId }, 'Request started')

  c.set('logger', logger)
  c.set('requestId', requestId)
  c.header('x-request-id', requestId)

  await next()

  const endTime = performance.now()
  const responseTime = Math.round(endTime - startTime)

  const responseHeaders = {}
  for (const [key, value] of c.res.headers.entries()) {
    responseHeaders[key] = value
  }

  const bindings = {
    reqId: requestId,
    res: {
      status: c.res.status,
      headers: responseHeaders
    },
    responseTime
  }

  const level = c.error ? 'error' : 'info'
  const message = c.error?.message || 'Request completed'

  logger[level](bindings, message)
}

export {
  requestLogger,
  logger
}
