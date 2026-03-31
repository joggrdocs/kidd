import { readFileSync } from 'node:fs'

import type { BunPlugin } from 'bun'

import { generateStaticAutoloader } from './generate-autoloader.js'
import { scanCommandsDir } from './scan-commands.js'

const VIRTUAL_MODULE_ID = 'virtual:kidd-static-commands'

const AUTOLOADER_REGION_START = '//#region src/autoload.ts'
const AUTOLOADER_REGION_END = '//#endregion'

/**
 * Parameters for creating the autoload plugin.
 */
interface CreateAutoloadPluginParams {
  readonly commandsDir: string
  readonly tagModulePath: string
  readonly coreDistDir: string
}

/**
 * Create a Bun plugin that replaces the runtime autoloader with a static version.
 *
 * Uses three hooks to break the circular dependency between kidd's dist and
 * user command files (which `import { command } from '@kidd-cli/core'`):
 *
 * 1. `onLoad` (core dist filter) — detects kidd's pre-bundled dist and replaces
 *    the autoloader region with a dynamic `import()` to a virtual module
 * 2. `onResolve` — resolves the virtual module identifier
 * 3. `onLoad` (kidd-autoload namespace) — scans the commands directory and
 *    generates a static autoloader module with all command imports pre-resolved
 *
 * @param params - The commands directory, tag module path, and core dist directory.
 * @returns A BunPlugin for static autoloading.
 */
export function createAutoloadPlugin(params: CreateAutoloadPluginParams): BunPlugin {
  const dirEscaped = params.coreDistDir.replaceAll('.', '\\.').replaceAll('/', '\\/')
  // oxlint-disable-next-line security/detect-non-literal-regexp
  const coreDistFilter = new RegExp(`${dirEscaped}\\/[^/]+\\.js$`)

  return {
    name: 'kidd-static-autoloader',
    setup(build) {
      build.onResolve({ filter: /^virtual:kidd-static-commands$/ }, () => ({
        namespace: 'kidd-autoload',
        path: VIRTUAL_MODULE_ID,
      }))

      build.onLoad({ filter: /.*/, namespace: 'kidd-autoload' }, async () => {
        const scan = await scanCommandsDir(params.commandsDir)
        const contents = generateStaticAutoloader({
          scan,
          tagModulePath: params.tagModulePath,
        })

        return { contents, loader: 'js' }
      })

      build.onLoad({ filter: coreDistFilter }, (args) => {
        const code = readFileSync(args.path, 'utf-8')
        const transformed = transformAutoloaderRegion(code)

        if (!transformed) {
          return undefined
        }

        return { contents: transformed, loader: 'js' }
      })
    },
  }
}

// ---------------------------------------------------------------------------

/**
 * Replace the autoloader region in kidd's dist with a static import delegation.
 *
 * @private
 * @param code - The source code to transform.
 * @returns The transformed code, or `undefined` if no region markers were found.
 */
function transformAutoloaderRegion(code: string): string | undefined {
  const regionStart = code.indexOf(AUTOLOADER_REGION_START)
  if (regionStart === -1) {
    return undefined
  }

  const regionEnd = code.indexOf(AUTOLOADER_REGION_END, regionStart)
  if (regionEnd === -1) {
    return undefined
  }

  const before = code.slice(0, regionStart)
  const after = code.slice(regionEnd + AUTOLOADER_REGION_END.length)
  const staticRegion = buildStaticRegion()

  return `${before}${staticRegion}${after}`
}

/**
 * Build the replacement autoloader region that delegates to the virtual module.
 *
 * @private
 * @returns The replacement region string with dynamic import.
 */
function buildStaticRegion(): string {
  return [
    '//#region src/autoload.ts (static)',
    'async function autoload() {',
    `  const mod = await import('${VIRTUAL_MODULE_ID}')`,
    '  return mod.autoload()',
    '}',
    '//#endregion',
  ].join('\n')
}
