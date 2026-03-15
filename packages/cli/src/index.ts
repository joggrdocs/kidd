import { cli } from '@kidd-cli/core'

import { loadCLIManifest } from './manifest.js'

const [manifestError, manifest] = await loadCLIManifest(import.meta.dirname)
if (manifestError) {
  console.error(manifestError.message)
  process.exit(1)
}

await cli({
  commands: `${import.meta.dirname}/commands`,
  description: manifest.description,
  help: { header: `${manifest.name} v${manifest.version}` },
  name: manifest.name,
  version: manifest.version,
})
