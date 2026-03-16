export { createAutoloadPlugin } from './autoloader/autoload-plugin.js'
export { build } from './build/build.js'
export { compile, resolveTargetLabel } from './compile/compile.js'
export {
  generateAutoloaderParts,
  generateStaticAutoloader,
} from './autoloader/generate-autoloader.js'
export type { StaticAutoloaderParts } from './autoloader/generate-autoloader.js'
export { mapToBuildConfig, mapToWatchConfig } from './build/map-config.js'
export {
  detectBuildEntry,
  normalizeCompileOptions,
  resolveConfig,
} from './config/resolve-config.js'
export { scanCommandsDir } from './autoloader/scan-commands.js'
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
export { watch } from './build/watch.js'
