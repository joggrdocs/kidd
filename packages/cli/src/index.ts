import { cli } from '@kidd-cli/core'
import { logger } from '@kidd-cli/core/logger'

import { readCLIManifest } from './manifest.js'

const [manifestError, manifest] = await readCLIManifest(import.meta.dirname)
if (manifestError) {
  console.error(manifestError.message)
  process.exit(1)
}

await cli({
  commands: `${import.meta.dirname}/commands`,
  description: manifest.description,
  help: { header: `${manifest.name} v${manifest.version}` },
  middleware: [logger()],
  name: manifest.name,
  version: manifest.version,
})
