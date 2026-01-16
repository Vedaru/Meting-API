import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requestLogger, logger } from './middleware/logger.js'
import errors from './middleware/errors.js'
import apiService from './service/api.js'
import demoService from './service/demo.js'
import config from './config.js'

const app = new Hono()
  .use(requestLogger)
  .use(cors())
  .use(errors)

app.get(`${config.http.prefix}/api`, apiService)
app.get(`${config.http.prefix}/demo`, demoService)

export default {
  fetch: app.fetch
}