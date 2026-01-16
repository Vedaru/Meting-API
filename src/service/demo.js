import config from '../config.js'
import { html } from 'hono/html'

export default async (c) => {
  // 1. 初始化参数
  const query = c.req.query()
  const server = query.server || 'tencent'
  const type = query.type || 'playlist'
  const id = query.id || '9647979018'

  // 2. 生成 HTML
  return c.html(html`
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css">
  <script src="https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/meting@2.0.2/dist/Meting.min.js"></script>
</head>
<body>
  <meting-js
    server="${server}"
    type="${type}"
    id="${id}"
    api="${config.meting.url}/api?server=:server&type=:type&id=:id&r=:r"
  />
</body>
</html>
  `)
}
