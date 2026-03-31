import type { BunPlugin } from 'bun'

import { NODE_BUILTINS } from '../constants.js'

/**
 * Create a Bun plugin that controls which modules are externalized.
 *
 * In normal mode: externalizes all bare specifiers EXCEPT those matching
 * the kidd namespace (which must be bundled for the autoload plugin).
 * In compile mode: only externalizes Node.js builtins and user-specified externals
 * (everything else is inlined for the standalone binary).
 *
 * @param params - The compile flag, user externals, and always-bundle patterns.
 * @returns A BunPlugin that handles externalization.
 */
export function createExternalsPlugin(params: {
  readonly compile: boolean
  readonly external: readonly string[]
  readonly alwaysBundlePatterns: readonly string[]
  readonly nodeBuiltins: readonly string[]
}): BunPlugin {
  const builtins = new Set(params.nodeBuiltins)
  const userExternals = new Set(params.external)
  const alwaysBundleRegexes = params.alwaysBundlePatterns.map((src) => new RegExp(src))

  return {
    name: 'kidd-externals',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (isRelativeOrAbsolute(args.path)) {
          return undefined
        }

        if (builtins.has(args.path)) {
          return { external: true, path: args.path }
        }

        if (userExternals.has(args.path)) {
          return { external: true, path: args.path }
        }

        if (params.compile) {
          return undefined
        }

        const shouldBundle = alwaysBundleRegexes.some((re) => re.test(args.path))
        if (shouldBundle) {
          return undefined
        }

        return { external: true, path: args.path }
      })
    },
  }
}

/**
 * Create a Bun plugin that replaces specified packages with empty modules.
 *
 * Libraries like c12 and ink have optional/conditional dependencies behind
 * dynamic `import()` calls or runtime guards. Stubbing at the resolve level
 * ensures the real package is never loaded during bundling.
 *
 * @param packages - Package names to replace with empty modules.
 * @returns A BunPlugin that stubs the specified packages.
 */
export function createStubPlugin(packages: readonly string[]): BunPlugin {
  const escaped = packages.map((pkg) => pkg.replaceAll('.', '\\.'))
  const filter = new RegExp(`^(${escaped.join('|')})$`)

  return {
    name: 'kidd-stub-packages',
    setup(build) {
      build.onResolve({ filter }, (args) => ({
        namespace: 'kidd-stub',
        path: args.path,
      }))

      build.onLoad({ filter: /.*/, namespace: 'kidd-stub' }, () => ({
        contents: 'export default undefined;',
        loader: 'js',
      }))
    },
  }
}

// ---------------------------------------------------------------------------

/**
 * Check whether a module specifier is relative or absolute (not a bare specifier).
 *
 * @private
 * @param specifier - The module specifier to check.
 * @returns `true` when the specifier starts with `.` or `/`.
 */
function isRelativeOrAbsolute(specifier: string): boolean {
  return specifier.startsWith('.') || specifier.startsWith('/')
}
