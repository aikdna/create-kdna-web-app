import {
  KDNAAssetInspector,
  KDNAFileDropzone,
  KDNALoadPlanGate,
  KDNAPasswordUnlockDialog,
} from '@aikdna/kdna-react'
import { useState } from 'react'

function AssetFlow({ fileId, inspect }) {
  const [unlockedContent, setUnlockedContent] = useState(null)

  return (
    <section>
      <KDNAAssetInspector inspect={inspect} />
      <KDNALoadPlanGate fileId={fileId} endpoint="/api/kdna">
        {({ status, content, error }) => {
          if (status === 'locked' && !unlockedContent) {
            return (
              <KDNAPasswordUnlockDialog
                fileId={fileId}
                endpoint="/api/kdna"
                onUnlock={(result) => setUnlockedContent(result.content)}
              />
            )
          }
          const visibleContent = unlockedContent ?? content
          return (
            <>
              <p id="kdna-status">{visibleContent ? 'loaded' : status}</p>
              {error ? <p role="alert">{error.message}</p> : null}
              {visibleContent ? (
                <pre id="kdna-runtime-capsule">
                  {JSON.stringify(visibleContent, null, 2)}
                </pre>
              ) : null}
            </>
          )
        }}
      </KDNALoadPlanGate>
    </section>
  )
}

export default function Page() {
  const [uploadError, setUploadError] = useState(null)

  return (
    <main>
      <h1>KDNA Runtime Capsule viewer</h1>
      <KDNAFileDropzone endpoint="/api/kdna" onError={setUploadError}>
        {({ fileId, inspect, loading }) => (
          <section>
            <p>{loading ? 'Uploading...' : 'Drop or choose a .kdna file'}</p>
            {uploadError ? <p role="alert">{uploadError.message}</p> : null}
            {fileId && inspect ? (
              <AssetFlow key={fileId} fileId={fileId} inspect={inspect} />
            ) : null}
          </section>
        )}
      </KDNAFileDropzone>
    </main>
  )
}
