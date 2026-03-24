import type { Result } from '@kidd-cli/utils/fp'

import { resolveGlobalPath, resolveLocalPath } from '@/lib/project/index.js'
import type { ResolvedDirs } from '@/types/index.js'

import { createDotDirectory } from './create-dot-directory.js'
import { createProtectionRegistry } from './protection.js'
import type {
  DotDirectory,
  DotDirectoryClient,
  DotDirectoryError,
  ProtectedFileEntry,
} from './types.js'

/**
 * Create a {@link DotDirectoryClient} that returns scoped {@link DotDirectory}
 * handles and manages a shared protection registry.
 *
 * @param options - The resolved directory names from `ctx.meta.dirs`.
 * @returns A frozen DotDirectoryClient instance.
 */
export function createDotDirectoryClient(options: {
  readonly dirs: ResolvedDirs
}): DotDirectoryClient {
  const { dirs } = options
  const registry = createProtectionRegistry()

  /**
   * Get a DotDirectory scoped to the global home directory.
   *
   * @private
   * @returns A DotDirectory for the global scope.
   */
  function global(): DotDirectory {
    const dir = resolveGlobalPath({ dirName: dirs.global })
    return createDotDirectory({ dir, location: 'global', registry })
  }

  /**
   * Get a DotDirectory scoped to the project-local directory.
   *
   * @private
   * @returns A Result with a DotDirectory on success, or a no_project_root error.
   */
  function local(): Result<DotDirectory, DotDirectoryError> {
    const dir = resolveLocalPath({ dirName: dirs.local })
    if (dir === null) {
      return [{ message: 'No project root found', type: 'no_project_root' }, null]
    }
    return [null, createDotDirectory({ dir, location: 'local', registry })]
  }

  /**
   * Register a file as protected in the shared registry.
   *
   * @private
   * @param entry - The file entry to protect.
   */
  function protect(entry: ProtectedFileEntry): void {
    registry.add(entry)
  }

  return Object.freeze({
    global,
    local,
    protect,
  })
}
