import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// One public setup operation, two independent lockfiles. Never run dependency
// lifecycle hooks or merge the Host's Core/Read graph into the application.
for (const [label, cwd] of [['application', app], ['Host', path.join(app, 'host')]]) {
  console.log(`Installing ${label} from its lockfile…`)
  const result = spawnSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd, stdio: 'inherit' })
  if (result.error || result.status !== 0) {
    console.error(`${label} installation failed${result.error ? ': ' + result.error.message : '.'}`)
    process.exitCode = result.status || 1
    break
  }
}
