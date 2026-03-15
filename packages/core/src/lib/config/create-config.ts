import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join } from 'node:path'

import { attemptAsync, err, match } from '@kidd-cli/utils/fp'
import { formatZodIssues } from '@kidd-cli/utils/validate'
import { loadConfig as c12LoadConfig } from 'c12'
import type { ZodTypeAny, output } from 'zod'

import { findDotfileConfig, getDotfileNames } from './find.js'
import { getExtension, getFormat, parseContent, serializeContent } from './parse.js'
import type {
  Config,
  ConfigOperationResult,
  ConfigOptions,
  ConfigResult,
  ConfigWriteOptions,
  ConfigWriteResult,
} from './types.js'

/**
 * Create a typed config client that loads, validates, and writes config files.
 *
 * Uses c12 as the primary loader for `name.config.*` files (supports TS, JS, JSON,
 * JSONC, YAML). Falls back to dotfile variants (`.name.json`, `.name.jsonc`, `.name.yaml`)
 * for backward compatibility.
 *
 * @param options - Config client options including name and Zod schema.
 * @returns A {@link Config} client instance.
 */
export function createConfigClient<TSchema extends ZodTypeAny>(
  options: ConfigOptions<TSchema>
): Config<output<TSchema>> {
  const { name, schema, searchPaths } = options
  const dotfileNames = getDotfileNames(name)

  /**
   * Load config via c12 (`name.config.*`), searching optional searchPaths first.
   *
   * @private
   * @param cwd - Working directory to search from.
   * @returns The c12 result, or null if nothing was found.
   */
  async function loadViaC12(cwd: string): Promise<{ config: unknown; configFile?: string } | null> {
    if (searchPaths) {
      const results = await Promise.all(
        searchPaths.map(async (dir) => {
          const [loadError, loaded] = await attemptAsync(() =>
            c12LoadConfig({
              cwd: dir,
              dotenv: false,
              globalRc: false,
              name,
              packageJson: false,
              rcFile: false,
            })
          )
          if (loadError || !loaded || !hasResolvedConfigFile(loaded.configFile)) {
            return null
          }
          return loaded
        })
      )
      const found = results.find((r): r is NonNullable<typeof r> => r !== null)
      if (found) {
        return found
      }
    }

    const [loadError, loaded] = await attemptAsync(() =>
      c12LoadConfig({
        cwd,
        dotenv: false,
        globalRc: false,
        name,
        packageJson: false,
        rcFile: false,
      })
    )

    if (loadError || !loaded || !hasResolvedConfigFile(loaded.configFile)) {
      return null
    }

    return loaded
  }

  /**
   * Find a config file in the given directory.
   *
   * Checks c12 `name.config.*` patterns first, then dotfile fallback.
   *
   * @private
   * @param cwd - Working directory to search from.
   * @returns The path to the config file, or null if not found.
   */
  async function find(cwd?: string): Promise<string | null> {
    const resolvedCwd = cwd ?? process.cwd()

    const c12Result = await loadViaC12(resolvedCwd)
    if (c12Result && hasResolvedConfigFile(c12Result.configFile)) {
      return c12Result.configFile
    }

    return findDotfileConfig({
      cwd: resolvedCwd,
      fileNames: dotfileNames,
      searchPaths,
    })
  }

  /**
   * Load and validate a config file.
   *
   * Tries c12 first (supports TS/JS/JSON/JSONC/YAML via `name.config.*`),
   * then falls back to dotfile patterns (`.name.json`, `.name.jsonc`, `.name.yaml`).
   *
   * @private
   * @param cwd - Working directory to search from.
   * @returns A ConfigOperationResult with the loaded config, or [null, null] if not found.
   */
  async function load(
    cwd?: string
  ): Promise<ConfigOperationResult<ConfigResult<output<TSchema>>> | readonly [null, null]> {
    const resolvedCwd = cwd ?? process.cwd()

    const c12Result = await loadViaC12(resolvedCwd)
    if (c12Result && hasResolvedConfigFile(c12Result.configFile)) {
      return validateAndReturn(c12Result.config, c12Result.configFile)
    }

    return loadFromDotfile(resolvedCwd)
  }

  /**
   * Validate and write config data to a file.
   *
   * Defaults to `name.config.jsonc` when no explicit path is given.
   *
   * @private
   * @param data - The config data to write.
   * @param writeOptions - Write options including path and format.
   * @returns A ConfigOperationResult with the write result.
   */
  async function write(
    data: output<TSchema>,
    writeOptions: ConfigWriteOptions = {}
  ): Promise<ConfigOperationResult<ConfigWriteResult>> {
    const result = schema.safeParse(data)
    if (!result.success) {
      const { message } = formatZodIssues(result.error.issues, '\n')
      return err(`Invalid config data:\n${message}`)
    }

    const resolvedFormat = match(writeOptions)
      .when(
        (opts) => opts.format !== null && opts.format !== undefined,
        (opts) => opts.format ?? ('jsonc' as const)
      )
      .when(
        (opts) => opts.filePath !== null && opts.filePath !== undefined,
        (opts) => getWriteFormat(opts.filePath ?? '')
      )
      .otherwise(() => 'jsonc' as const)

    const resolvedFilePath = match(writeOptions.filePath)
      .when(
        (fp) => fp !== null && fp !== undefined,
        (fp) => fp ?? ''
      )
      .otherwise(() => {
        const dir = writeOptions.dir ?? process.cwd()
        const ext = getExtension(resolvedFormat)
        return join(dir, `${name}.config${ext}`)
      })

    const serialized = serializeContent(result.data, resolvedFormat)

    const [mkdirError] = await attemptAsync(() =>
      mkdir(dirname(resolvedFilePath), { recursive: true })
    )
    if (mkdirError) {
      return err(`Failed to create directory for ${resolvedFilePath}: ${String(mkdirError)}`)
    }

    const [writeError] = await attemptAsync(() => writeFile(resolvedFilePath, serialized, 'utf8'))
    if (writeError) {
      return err(`Failed to write config to ${resolvedFilePath}: ${String(writeError)}`)
    }

    return [null, { filePath: resolvedFilePath, format: resolvedFormat }]
  }

  /**
   * Load config from a dotfile (`.name.json`, `.name.jsonc`, `.name.yaml`).
   *
   * @private
   * @param cwd - Working directory to search from.
   * @returns A ConfigOperationResult with the loaded config, or [null, null] if not found.
   */
  async function loadFromDotfile(
    cwd: string
  ): Promise<ConfigOperationResult<ConfigResult<output<TSchema>>> | readonly [null, null]> {
    const filePath = await findDotfileConfig({
      cwd,
      fileNames: dotfileNames,
      searchPaths,
    })
    if (!filePath) {
      return [null, null]
    }

    const [readError, content] = await attemptAsync(() => readFile(filePath, 'utf8'))
    if (readError || content === null) {
      const errorDetail = resolveReadErrorDetail(readError)
      return err(`Failed to read config at ${filePath}: ${errorDetail}`)
    }

    const format = getFormat(filePath)
    if (format === 'ts' || format === 'js') {
      return err(`Dotfile format not supported for ${filePath}: use name.config.ts instead`)
    }

    const parsedResult = parseContent({ content, filePath, format })
    if (parsedResult[0]) {
      return [parsedResult[0], null]
    }

    return validateAndReturn(parsedResult[1], filePath)
  }

  /**
   * Validate parsed config data and return a typed result.
   *
   * @private
   * @param data - The parsed config data.
   * @param filePath - Path to the config file.
   * @returns A ConfigOperationResult with the validated config.
   */
  function validateAndReturn(
    data: unknown,
    filePath: string
  ): ConfigOperationResult<ConfigResult<output<TSchema>>> {
    const result = schema.safeParse(data)
    if (!result.success) {
      const { message } = formatZodIssues(result.error.issues, '\n')
      return err(`Invalid config in ${filePath}:\n${message}`)
    }

    return [
      null,
      {
        config: result.data,
        filePath,
        format: getFormat(filePath),
      },
    ]
  }

  return Object.freeze({ find, load, write })
}

// ---------------------------------------------------------------------------

/**
 * Check whether c12 resolved to an actual config file on disk.
 *
 * c12 returns just the config name (e.g. `'myapp.config'`) when no file is
 * found, so an absolute path indicates a real resolution.
 *
 * @private
 * @param configFile - The `configFile` value from c12's result.
 * @returns `true` when the value is an absolute file path.
 */
function hasResolvedConfigFile(configFile: string | undefined): configFile is string {
  return configFile !== undefined && isAbsolute(configFile)
}

/**
 * Resolve the error detail string from a read error.
 *
 * @private
 * @param readError - The error from the read operation, or null.
 * @returns A descriptive error string.
 */
function resolveReadErrorDetail(readError: unknown): string {
  if (readError) {
    return String(readError)
  }
  return 'empty file'
}

/**
 * Extract a write-safe format from a file path extension.
 *
 * Falls back to 'jsonc' for non-writable formats (ts, js).
 *
 * @private
 * @param filePath - The file path to inspect.
 * @returns A write-compatible format.
 */
function getWriteFormat(filePath: string): 'json' | 'jsonc' | 'yaml' {
  const format = getFormat(filePath)
  return match(format)
    .with('json', () => 'json' as const)
    .with('jsonc', () => 'jsonc' as const)
    .with('yaml', () => 'yaml' as const)
    .otherwise(() => 'jsonc' as const)
}
