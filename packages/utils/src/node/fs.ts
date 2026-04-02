import * as fsNative from 'node:fs/promises'

import { attemptAsync } from 'es-toolkit'

import type { ResultAsync } from '../fp/result.js'
import { err, ok } from '../fp/result.js'

/**
 * Check whether a path exists and is accessible.
 *
 * Wraps `fs.access` into a boolean check — never throws.
 *
 * @param path - The absolute path to check.
 * @returns True when the path exists and is accessible.
 */
export async function exists(path: string): Promise<boolean> {
  const [error] = await attemptAsync(() => fsNative.access(path))
  return error === null
}

/**
 * Read a file's contents as a UTF-8 string.
 *
 * @param path - The absolute file path to read.
 * @returns A result tuple with the file contents or an Error.
 */
export async function read(path: string): ResultAsync<string> {
  const [error, contents] = await attemptAsync(() => fsNative.readFile(path, 'utf8'))
  if (error || contents === null) {
    return err(new Error(`failed to read ${path}`, { cause: error }))
  }

  return ok(contents)
}

/**
 * Write a UTF-8 string to a file.
 *
 * @param path - The absolute file path to write.
 * @param content - The string content to write.
 * @returns A result tuple with void on success or an Error.
 */
export async function write(path: string, content: string): ResultAsync<void> {
  const [error] = await attemptAsync(() => fsNative.writeFile(path, content, 'utf8'))
  if (error) {
    return err(new Error(`failed to write ${path}`, { cause: error }))
  }

  return ok()
}

/**
 * List filenames in a directory.
 *
 * @param path - The absolute directory path to list.
 * @returns A result tuple with filenames or an Error.
 */
export async function list(path: string): ResultAsync<readonly string[]> {
  const [error, entries] = await attemptAsync(() => fsNative.readdir(path))
  if (error || entries === null) {
    return err(new Error(`failed to list ${path}`, { cause: error }))
  }

  return ok(entries)
}

/**
 * Create a directory, including parent directories.
 *
 * @param path - The absolute directory path to create.
 * @returns A result tuple with void on success or an Error.
 */
export async function mkdir(path: string): ResultAsync<void> {
  const [error] = await attemptAsync(() => fsNative.mkdir(path, { recursive: true }))
  if (error) {
    return err(new Error(`failed to create directory ${path}`, { cause: error }))
  }

  return ok()
}

/**
 * Remove a file or directory. Silently succeeds if the path does not exist.
 *
 * @param path - The absolute path to remove.
 * @returns A result tuple with void on success or an Error.
 */
export async function remove(path: string): ResultAsync<void> {
  const [error] = await attemptAsync(() => fsNative.rm(path, { recursive: true, force: true }))
  if (error) {
    return err(new Error(`failed to remove ${path}`, { cause: error }))
  }

  return ok()
}
