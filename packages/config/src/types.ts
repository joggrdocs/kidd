/**
 * Build options passed to tsdown during `kidd build`.
 */
export interface BuildOptions {
  /**
   * Build output directory. Default: './dist'.
   */
  out?: string
  /**
   * Node target version. Default: 'node18'.
   */
  target?: string
  /**
   * Minify the output. Default: false.
   */
  minify?: boolean
  /**
   * Generate source maps. Default: true.
   */
  sourcemap?: boolean
  /**
   * Additional external packages (beyond kidd's defaults).
   */
  external?: string[]
  /**
   * Clean build artifacts before building. Default: true.
   *
   * When enabled, only files created by kidd are removed (`.js`, `.mjs`,
   * `.map` files). Foreign files in the output directory are preserved
   * and a warning is printed.
   */
  clean?: boolean
}

/**
 * Binary compilation options for `kidd compile`.
 */
export interface CompileOptions {
  /**
   * Compile output directory. Default: './dist'.
   */
  out?: string
  /**
   * Cross-compilation targets. Default: current platform only.
   */
  targets?: CompileTarget[]
  /**
   * Binary name. Defaults to cli name.
   */
  name?: string
}

/**
 * Supported cross-compilation targets for `kidd compile`.
 */
export type CompileTarget =
  | 'darwin-arm64'
  | 'darwin-x64'
  | 'linux-x64'
  | 'linux-arm64'
  | 'linux-x64-musl'
  | 'windows-x64'
  | 'windows-arm64'

/**
 * Configuration for kidd.config.ts.
 */
export interface KiddConfig {
  /**
   * Entry point for the CLI. Default: './index.ts'.
   */
  entry?: string
  /**
   * Where commands live. Default: './commands'.
   */
  commands?: string
  /**
   * Build options for kidd build.
   */
  build?: BuildOptions
  /**
   * Binary compilation options for kidd build --compile.
   *
   * - `true` enables compilation with default options.
   * - An object provides explicit compile options (targets, output dir, name).
   * - `false` or omitted disables compilation.
   */
  compile?: boolean | CompileOptions
  /**
   * Extra file globs to include in the bundle.
   */
  include?: string[]
}
