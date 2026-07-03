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

export default function kdna(req, res) {
  return handler(req, res)
}
