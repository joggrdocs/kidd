import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { attemptAsync, ok, toError } from '@kidd-cli/utils/fp'
import type { AsyncResult } from '@kidd-cli/utils/fp'
import { fileExists } from '@kidd-cli/utils/fs'
import { jsonParse } from '@kidd-cli/utils/json'

import type { GenerateError, ProjectInfo } from './types.js'

/**
 * Detect whether the given directory contains a kidd-based CLI project.
 *
 * Looks for a `package.json` with `@kidd-cli/core` listed in `dependencies` or
 * `devDependencies`, and checks for a `src/commands/` directory.
 *
 * @param cwd - The directory to inspect.
 * @returns An async Result containing project info or null when no kidd project is found.
 */
export async function detectProject(cwd: string): AsyncResult<ProjectInfo | null, GenerateError> {
  const packageJsonPath = join(cwd, 'package.json')
  const exists = await fileExists(packageJsonPath)
  if (!exists) {
    return ok(null)
  }

  const [readError, pkg] = await readPackageJson(packageJsonPath)
  if (readError) {
    return [readError, null]
  }

  const deps = pkg.dependencies ?? {}
  const devDeps = pkg.devDependencies ?? {}
  const hasKiddDep = '@kidd-cli/core' in deps || '@kidd-cli/core' in devDeps

  if (!hasKiddDep) {
    return ok(null)
  }

  const commandsPath = join(cwd, 'src', 'commands')
  const commandsDirExists = await fileExists(commandsPath)

  if (commandsDirExists) {
    return ok({
      commandsDir: commandsPath,
      hasKiddDep,
      rootDir: cwd,
    })
  }

  return ok({
    commandsDir: null,
    hasKiddDep,
    rootDir: cwd,
  })
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Minimal package.json shape needed for detection.
 *
 * Only includes dependency fields used during project detection.
 */
interface PackageJson {
  readonly dependencies?: Record<string, string>
  readonly devDependencies?: Record<string, string>
}

/**
 * Read and parse a package.json file.
 *
 * @param filePath - Absolute path to the package.json.
 * @returns A Result tuple with the parsed package data or a GenerateError.
 * @private
 */
async function readPackageJson(filePath: string): AsyncResult<PackageJson, GenerateError> {
  const [readError, content] = await attemptAsync(() => readFile(filePath, 'utf8'))
  if (readError) {
    return [
      {
        message: `Failed to read package.json: ${toError(readError).message}`,
        path: filePath,
        type: 'read_error' as const,
      },
      null,
    ]
  }

  const [parseError, data] = jsonParse(content as string)
  if (parseError) {
    return [
      {
        message: `Failed to parse package.json: ${toError(parseError).message}`,
        path: filePath,
        type: 'read_error' as const,
      },
      null,
    ]
  }

  return ok(data as PackageJson)
}
