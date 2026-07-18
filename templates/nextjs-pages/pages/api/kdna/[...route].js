import { createKDNARouter } from '@aikdna/kdna-web-server/express'

export const config = {
  api: {
    bodyParser: false,
  },
}

const handler = createKDNARouter({
  basePath: '/api/kdna',
  storageDir: process.env.KDNA_STORAGE_DIR ?? '/tmp/kdna-web',
  activationServerUrl: process.env.KDNA_ACTIVATION_URL,
})

export default async function kdna(req, res) {
  const incomingUrl = req.url
  const route = Array.isArray(req.query.route) ? req.query.route : []
  req.url = `/${route.join('/')}`
  try {
    await handler(req, res)
  } finally {
    req.url = incomingUrl
  }
}
