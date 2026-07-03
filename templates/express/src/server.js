import express from 'express'
import { createKDNARouter } from '@aikdna/kdna-web-server/express'

const app = express()
const port = Number(process.env.PORT || 3000)

app.use('/api/kdna', createKDNARouter({
  storageDir: process.env.KDNA_STORAGE_DIR ?? '/tmp/kdna-web',
  activationServerUrl: process.env.KDNA_ACTIVATION_URL,
}))
app.use(express.static('public'))

app.listen(port, () => {
  console.log(`KDNA web app running on http://localhost:${port}`)
})
