/**
 * Compile-time CLI version injected by the kidd bundler.
 *
 * Set via `define: { __KIDD_VERSION__: JSON.stringify(version) }` during
 * the tsdown build. Falls back to `undefined` when building outside the
 * kidd bundler pipeline.
 */
declare const __KIDD_VERSION__: string | undefined
