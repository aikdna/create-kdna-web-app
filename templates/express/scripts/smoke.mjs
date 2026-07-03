import { createKDNARouter } from '@aikdna/kdna-web-server/express'

if (typeof createKDNARouter !== 'function') {
  throw new Error('@aikdna/kdna-web-server/express did not export createKDNARouter')
}

console.log('KDNA Express template smoke passed')
