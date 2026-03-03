import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { attemptAsync, err, match } from '@kidd/utils/fp'
import { formatZodIssues } from '@kidd/utils/validate'
import type { ZodTypeAny, output } from 'zod'

import { findConfig, getConfigFileNames } from './find.js'
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
 * @param options - Config client options including name and Zod schema.
 * @returns A {@link Config} client instance.
 */
export function createConfigClient<TSchema extends ZodTypeAny>(
  options: ConfigOptions<TSchema>
): Config<output<TSchema>> {
  const { name, schema, searchPaths } = options
  const fileNames = getConfigFileNames(name)

  /**
   * Find a config file in the given directory.
   *
   * @private
   * @param cwd - Working directory to search from.
   * @returns The path to the config file, or null if not found.
   */
  async function find(cwd?: string): Promise<string | null> {
    return findConfig({
      cwd: cwd ?? process.cwd(),
      fileNames,
      searchPaths,
    })
  }

  /**
   * Load and validate a config file.
   *
   * @private
   * @param cwd - Working directory to search from.
   * @returns A ConfigOperationResult with the loaded config, or [null, null] if not found.
   */
  async function load(
    cwd?: string
  ): Promise<ConfigOperationResult<ConfigResult<output<TSchema>>> | readonly [null, null]> {
    const filePath = await find(cwd)
    if (!filePath) {
      return [null, null]
    }

    const [readError, content] = await attemptAsync(() => readFile(filePath, 'utf8'))
    if (readError || content === null) {
      const errorDetail = resolveReadErrorDetail(readError)
      return err(`Failed to read config at ${filePath}: ${errorDetail}`)
    }

    const format = getFormat(filePath)
    const parsedResult = parseContent({ content, filePath, format })

    if (parsedResult[0]) {
      return [parsedResult[0], null]
    }

    const result = schema.safeParse(parsedResult[1])
    if (!result.success) {
      const { message } = formatZodIssues(result.error.issues, '\n')
      return err(`Invalid config in ${filePath}:\n${message}`)
    }

    return [
      null,
      {
        config: result.data,
        filePath,
        format,
      },
    ]
  }

  /**
   * Validate and write config data to a file.
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
        (opts) => getFormat(opts.filePath ?? '')
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
        return join(dir, `.${name}${ext}`)
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

  return { find, load, write }
}

// ---------------------------------------------------------------------------

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
