import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { attempt } from '@kidd-cli/utils/fp'
import type { Result } from '@kidd-cli/utils/fp'
import { jsonParse, jsonStringify } from '@kidd-cli/utils/json'

import type {
  AccessOptions,
  DotDirectoryClient,
  DotDirectoryError,
  DotDirectoryLocation,
  ProtectionRegistry,
  ReadJsonOptions,
  WriteOptions,
} from './types.js'

/**
 * Create a scoped {@link DotDirectoryClient} for a single resolved directory.
 *
 * All filesystem operations are synchronous (consistent with {@link FileStore}).
 * Protected files are checked against the shared {@link ProtectionRegistry}.
 *
 * @param options - Directory path, location scope, and protection registry.
 * @returns A frozen DotDirectoryClient instance.
 */
export function createDotDirectoryClient(options: {
  readonly dir: string
  readonly location: DotDirectoryLocation
  readonly registry: ProtectionRegistry
}): DotDirectoryClient {
  const { dir, location, registry } = options

  /**
   * Check whether a file is protected and access was not explicitly opted-in.
   *
   * @private
   * @param filename - The filename to check.
   * @param accessOptions - Access options that may include the bypass flag.
   * @returns A DotDirectoryError if the file is protected, or null.
   */
  function checkProtection(
    filename: string,
    accessOptions?: AccessOptions
  ): DotDirectoryError | null {
    if (accessOptions !== undefined && accessOptions.dangerouslyAccessProtectedFile === true) {
      return null
    }

    if (registry.has(location, filename)) {
      return {
        message: `File "${filename}" is protected in ${location} scope. Pass { dangerouslyAccessProtectedFile: true } to access it.`,
        type: 'protected_file',
      }
    }

    return null
  }

  /**
   * Ensure the directory exists, creating it with mode 0o700 if needed.
   *
   * @private
   * @returns A Result with the directory path on success.
   */
  function ensure(): Result<string, DotDirectoryError> {
    const [error] = attempt<void, Error>(() => {
      mkdirSync(dir, { mode: 0o700, recursive: true })
    })

    if (error) {
      return [
        { message: `Failed to create directory "${dir}": ${error.message}`, type: 'fs_error' },
        null,
      ]
    }

    return [null, dir]
  }

  /**
   * Read a file as a raw string.
   *
   * @private
   * @param filename - The filename to read.
   * @param accessOptions - Access options.
   * @returns A Result with the file content on success.
   */
  function read(
    filename: string,
    accessOptions?: AccessOptions
  ): Result<string, DotDirectoryError> {
    const protectionError = checkProtection(filename, accessOptions)
    if (protectionError) {
      return [protectionError, null]
    }

    const filePath = join(dir, filename)
    const [error, content] = attempt<string, Error>(() => readFileSync(filePath, 'utf8'))

    if (error) {
      return [{ message: `Failed to read "${filePath}": ${error.message}`, type: 'fs_error' }, null]
    }

    return [null, content] as const
  }

  /**
   * Write a raw string to a file (mode 0o600). Creates the directory if needed.
   *
   * @private
   * @param filename - The filename to write.
   * @param content - The string content.
   * @param writeOptions - Write options.
   * @returns A Result with the written file path on success.
   */
  function write(
    filename: string,
    content: string,
    writeOptions?: WriteOptions
  ): Result<string, DotDirectoryError> {
    const protectionError = checkProtection(filename, writeOptions)
    if (protectionError) {
      return [protectionError, null]
    }

    const filePath = join(dir, filename)
    const [error] = attempt<void, Error>(() => {
      mkdirSync(dir, { mode: 0o700, recursive: true })
      writeFileSync(filePath, content, { encoding: 'utf8', mode: 0o600 })
    })

    if (error) {
      return [
        { message: `Failed to write "${filePath}": ${error.message}`, type: 'fs_error' },
        null,
      ]
    }

    return [null, filePath]
  }

  /**
   * Read and parse a JSON file, optionally validating with a Zod schema.
   *
   * @private
   * @param filename - The filename to read.
   * @param readOptions - Read options with optional schema.
   * @returns A Result with the parsed (and optionally validated) data.
   */
  function readJson<T = unknown>(
    filename: string,
    readOptions?: ReadJsonOptions<T>
  ): Result<T, DotDirectoryError> {
    const [readError, content] = read(filename, readOptions)
    if (readError) {
      return [readError, null]
    }

    const [parseError, parsed] = jsonParse(content)
    if (parseError) {
      return [
        { message: `Failed to parse "${filename}": ${parseError.message}`, type: 'parse_error' },
        null,
      ]
    }

    if (readOptions !== undefined && readOptions.schema !== undefined) {
      const result = readOptions.schema.safeParse(parsed)
      if (!result.success) {
        return [
          {
            message: `Validation failed for "${filename}": ${result.error.message}`,
            type: 'parse_error',
          },
          null,
        ]
      }
      return [null, result.data]
    }

    return [null, parsed as T]
  }

  /**
   * Serialize data to JSON and write it to a file.
   *
   * @private
   * @param filename - The filename to write.
   * @param data - The data to serialize.
   * @param writeOptions - Write options.
   * @returns A Result with the written file path on success.
   */
  function writeJson(
    filename: string,
    data: unknown,
    writeOptions?: WriteOptions
  ): Result<string, DotDirectoryError> {
    const [stringifyError, json] = jsonStringify(data, { pretty: true })
    if (stringifyError) {
      return [
        {
          message: `Failed to serialize "${filename}": ${stringifyError.message}`,
          type: 'parse_error',
        },
        null,
      ]
    }

    return write(filename, json, writeOptions)
  }

  /**
   * Check whether a file exists in the directory.
   *
   * @private
   * @param filename - The filename to check.
   * @returns True if the file exists.
   */
  function fileExists(filename: string): boolean {
    return existsSync(join(dir, filename))
  }

  /**
   * Remove a file from the directory. Idempotent — succeeds if the file does not exist.
   *
   * @private
   * @param filename - The filename to remove.
   * @param accessOptions - Access options.
   * @returns A Result with the file path on success.
   */
  function remove(
    filename: string,
    accessOptions?: AccessOptions
  ): Result<string, DotDirectoryError> {
    const protectionError = checkProtection(filename, accessOptions)
    if (protectionError) {
      return [protectionError, null]
    }

    const filePath = join(dir, filename)

    if (!existsSync(filePath)) {
      return [null, filePath]
    }

    const [error] = attempt<void, Error>(() => {
      unlinkSync(filePath)
    })

    if (error) {
      return [
        { message: `Failed to remove "${filePath}": ${error.message}`, type: 'fs_error' },
        null,
      ]
    }

    return [null, filePath]
  }

  /**
   * Resolve the full absolute path for a filename within the directory.
   *
   * @private
   * @param filename - The filename to resolve.
   * @returns The absolute path.
   */
  function resolvePath(filename: string): string {
    return join(dir, filename)
  }

  return Object.freeze({
    dir,
    ensure,
    exists: fileExists,
    path: resolvePath,
    read,
    readJson,
    remove,
    write,
    writeJson,
  })
}
