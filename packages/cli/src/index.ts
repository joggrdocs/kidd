import { cli } from '@kidd-cli/core'

import { loadCLIManifest } from './manifest.js'

const manifest = await loadCLIManifest(import.meta.dirname)

await cli({
  commands: `${import.meta.dirname}/commands`,
  description: manifest.description,
  help: { banner: `${manifest.name} v${manifest.version}` },
  name: manifest.name,
  version: manifest.version,
})
