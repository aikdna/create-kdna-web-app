import { createKDNARouter } from '@aikdna/kdna-web-server/express'
import {
  KDNAAssetInspector,
  KDNAFileDropzone,
  KDNALoadPlanGate,
  KDNAPasswordUnlockDialog,
} from '@aikdna/kdna-react'

for (const [name, value] of Object.entries({
  createKDNARouter,
  KDNAAssetInspector,
  KDNAFileDropzone,
  KDNALoadPlanGate,
  KDNAPasswordUnlockDialog,
})) {
  if (typeof value !== 'function') {
    throw new Error(`KDNA Next.js Pages template dependency missing export: ${name}`)
  }
}

console.log('KDNA Next.js Pages template smoke passed')
