/**
 * Shared base options for all package tsdown configs.
 *
 * @example
 * ```ts
 * import { defineConfig } from 'tsdown'
 *
 * import { baseOptions } from '../../tsdown.base.mjs'
 *
 * export default defineConfig({
 *   ...baseOptions,
 *   entry: { index: 'src/index.ts' },
 * })
 * ```
 */
export const baseOptions = {
  clean: true,
  dts: true,
  fixedExtension: false,
  outDir: 'dist',
}
