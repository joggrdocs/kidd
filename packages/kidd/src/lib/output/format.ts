import fs from 'node:fs'
import path from 'node:path'

import { attempt, err, ok } from '@kidd/utils/fp'
import type { Result } from '@kidd/utils/fp'
import { jsonStringify } from '@kidd/utils/json'

import { redactObject } from '@/context/redact.js'

import { resolveRenderError } from './renderer.js'
import type { JsonOutputOptions, WriteParams } from './types.js'

/**
 * Serialize data to a JSON string.
 *
 * @param data - The data to serialize.
 * @param opts - JSON output options.
 * @returns The JSON string.
 */
export function formatJson(data: unknown, opts: JsonOutputOptions = {}): string {
  const { pretty = true, redact = false } = opts
  const processed = resolveProcessed(data, redact)
  const [, json] = jsonStringify(processed, { pretty })
  return json || ''
}

/**
 * Write content to a file on disk, creating parent directories as needed.
 *
 * @param params - Write parameters (path and content).
 * @returns A Result indicating success or failure.
 */
export function writeToFile(params: WriteParams): Result<void, Error> {
  const [error] = attempt(() => {
    fs.mkdirSync(path.dirname(params.path), { recursive: true })
    fs.writeFileSync(params.path, params.content, 'utf8')
  })

  if (error) {
    const errorMessage = resolveRenderError(error)
    return err(new Error(`Failed to write file ${params.path}: ${errorMessage}`))
  }

  return ok()
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Resolve the processed data, optionally redacting sensitive fields.
 *
 * @private
 */
function resolveProcessed(data: unknown, redact: boolean): unknown {
  if (redact && data && typeof data === 'object') {
    return redactObject(data as object)
  }
  return data
}
