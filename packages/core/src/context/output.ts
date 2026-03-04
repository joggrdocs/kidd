import { jsonStringify } from '@kidd-cli/utils/json'

import type { Output, OutputOptions } from './types.js'

/**
 * Create the structured output methods for a context.
 *
 * @private
 * @param stream - The writable stream to write output to.
 * @returns An Output instance backed by the given stream.
 */
export function createContextOutput(stream: NodeJS.WriteStream): Output {
  return {
    markdown(content: string): void {
      stream.write(`${content}\n`)
    },
    raw(content: string): void {
      stream.write(content)
    },
    table(rows: Record<string, unknown>[], options?: OutputOptions): void {
      if (options && options.json) {
        const [, json] = jsonStringify(rows, { pretty: true })
        stream.write(`${json}\n`)
        return
      }
      if (rows.length === 0) {
        return
      }
      const [firstRow] = rows
      if (!firstRow) {
        return
      }
      writeTableToStream(stream, rows, Object.keys(firstRow))
    },
    write(data: unknown, options?: OutputOptions): void {
      if ((options && options.json) || (typeof data === 'object' && data !== null)) {
        const [, json] = jsonStringify(data, { pretty: true })
        stream.write(`${json}\n`)
      } else {
        stream.write(`${String(data)}\n`)
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Format an unknown value as a string for table cell display.
 *
 * @private
 * @param val - The value to format.
 * @returns The stringified value, or empty string for undefined.
 */
function formatStringValue(val: unknown): string {
  if (val === undefined) {
    return ''
  }
  return String(val)
}

/**
 * Options for creating a table header string.
 */
interface TableHeaderOptions {
  keys: string[]
  widths: (number | undefined)[]
}

/**
 * Create a padded header row string from column keys and widths.
 *
 * @private
 * @param options - The keys and column widths.
 * @returns A formatted header string.
 */
function createTableHeader(options: TableHeaderOptions): string {
  const { keys, widths } = options
  return keys
    .map((key, idx) => {
      const width = widths[idx]
      if (width === undefined) {
        return key
      }
      return key.padEnd(width)
    })
    .join('  ')
}

/**
 * Options for creating a table row string.
 */
interface TableRowOptions {
  row: Record<string, unknown>
  keys: string[]
  widths: (number | undefined)[]
}

/**
 * Create a padded row string from a data record, column keys, and widths.
 *
 * @private
 * @param options - The row data, keys, and column widths.
 * @returns A formatted row string.
 */
function createTableRow(options: TableRowOptions): string {
  const { row, keys, widths } = options
  return keys
    .map((key, idx) => {
      const width = widths[idx]
      const val = formatStringValue(row[key])
      if (width === undefined) {
        return val
      }
      return val.padEnd(width)
    })
    .join('  ')
}

/**
 * Compute the maximum column width for each key across all rows.
 *
 * @private
 * @param rows - The data rows.
 * @param keys - The column keys.
 * @returns An array of column widths.
 */
function computeColumnWidths(rows: Record<string, unknown>[], keys: string[]): number[] {
  return keys.map((key) => {
    const values = rows.map((row) => formatStringValue(row[key]))
    return Math.max(key.length, ...values.map((val) => val.length))
  })
}

/**
 * Write a formatted table (header, separator, rows) to a writable stream.
 *
 * @private
 * @param stream - The writable stream.
 * @param rows - The data rows.
 * @param keys - The column keys.
 */
function writeTableToStream(
  stream: NodeJS.WriteStream,
  rows: Record<string, unknown>[],
  keys: string[]
): void {
  const widths = computeColumnWidths(rows, keys)
  const header = createTableHeader({ keys, widths })
  const separator = widths.map((width) => '-'.repeat(width)).join('  ')
  const dataRows = rows.map((row) => createTableRow({ keys, row, widths }))
  const content = [header, separator, ...dataRows].join('\n')
  stream.write(`${content}\n`)
}
