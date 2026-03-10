import type { BuildOptions, CompileOptions, CompileTarget, KiddConfig } from '@kidd-cli/config'
import type { AsyncResult, Result } from '@kidd-cli/utils/fp'

// ---------------------------------------------------------------------------
// Resolved config types (all fields required, paths absolute)
// ---------------------------------------------------------------------------

/**
 * Fully resolved build options with all defaults applied.
 */
export interface ResolvedBuildOptions {
  readonly target: string
  readonly minify: boolean
  readonly sourcemap: boolean
  readonly external: readonly string[]
}

/**
 * Fully resolved compile options with all defaults applied.
 */
export interface ResolvedCompileOptions {
  readonly targets: readonly CompileTarget[]
  readonly name: string
}

/**
 * Fully resolved bundler configuration with absolute paths and all defaults filled.
 */
export interface ResolvedBundlerConfig {
  readonly entry: string
  readonly commands: string
  readonly buildOutDir: string
  readonly compileOutDir: string
  readonly build: ResolvedBuildOptions
  readonly compile: ResolvedCompileOptions
  readonly include: readonly string[]
  readonly cwd: string
}

// ---------------------------------------------------------------------------
// Result aliases
// ---------------------------------------------------------------------------

/**
 * Synchronous result from a bundler operation.
 */
export type BundlerResult<T> = Result<T, Error>

/**
 * Asynchronous result from a bundler operation.
 */
export type AsyncBundlerResult<T> = AsyncResult<T, Error>

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

/**
 * Output of a successful build operation.
 */
export interface BuildOutput {
  readonly outDir: string
  readonly entryFile: string
  readonly version: string | undefined
}

/**
 * A single compiled binary for a specific target platform.
 */
export interface CompiledBinary {
  readonly target: CompileTarget
  readonly label: string
  readonly path: string
}

/**
 * Output of a successful compile operation.
 */
export interface CompileOutput {
  readonly binaries: readonly CompiledBinary[]
}

// ---------------------------------------------------------------------------
// Param types
// ---------------------------------------------------------------------------

/**
 * Parameters for the build function.
 */
export interface BuildParams {
  readonly config: KiddConfig
  readonly cwd: string
}

/**
 * Parameters for the watch function.
 */
export interface WatchParams {
  readonly config: KiddConfig
  readonly cwd: string
  readonly onSuccess?: () => void | Promise<void>
}

/**
 * Parameters for the compile function.
 */
export interface CompileParams {
  readonly config: KiddConfig
  readonly cwd: string
  readonly onTargetStart?: (target: CompileTarget) => void | Promise<void>
  readonly onTargetComplete?: (target: CompileTarget) => void | Promise<void>
}

// ---------------------------------------------------------------------------
// Scan types (used by the autoload plugin)
// ---------------------------------------------------------------------------

/**
 * A single command file discovered during a directory scan.
 */
export interface ScannedFile {
  readonly name: string
  readonly filePath: string
}

/**
 * A subdirectory of commands discovered during a directory scan.
 */
export interface ScannedDir {
  readonly name: string
  readonly index?: string
  readonly files: readonly ScannedFile[]
  readonly dirs: readonly ScannedDir[]
}

/**
 * The result of scanning a commands directory tree.
 */
export interface ScanResult {
  readonly files: readonly ScannedFile[]
  readonly dirs: readonly ScannedDir[]
}

// ---------------------------------------------------------------------------
// Re-exports from @kidd-cli/config for convenience
// ---------------------------------------------------------------------------

export type { BuildOptions, CompileOptions, CompileTarget, KiddConfig }
