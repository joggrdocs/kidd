export { createAutoloadPlugin } from './autoload-plugin.js'
export { build } from './build.js'
export { compile, resolveTargetLabel } from './compile.js'
export { generateAutoloaderParts, generateStaticAutoloader } from './generate-autoloader.js'
export type { StaticAutoloaderParts } from './generate-autoloader.js'
export { mapToBuildConfig, mapToWatchConfig } from './map-config.js'
export { readVersion } from './read-version.js'
export { detectBuildEntry, normalizeCompileOptions, resolveConfig } from './resolve-config.js'
export { scanCommandsDir } from './scan-commands.js'
export type {
  AsyncBundlerResult,
  BuildOptions,
  BuildOutput,
  BuildParams,
  BundlerResult,
  CompileOptions,
  CompileOutput,
  CompileParams,
  CompileTarget,
  CompiledBinary,
  KiddConfig,
  ResolvedBuildOptions,
  ResolvedBundlerConfig,
  ResolvedCompileOptions,
  ScanResult,
  ScannedDir,
  ScannedFile,
  WatchParams,
} from './types.js'
export { watch } from './watch.js'
