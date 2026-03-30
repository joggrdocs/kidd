export { createAutoloadPlugin } from './autoloader/autoload-plugin.js'
export { build } from './build/build.js'
export { compile, resolveTargetLabel } from './compile/compile.js'
export type {
  BuildOptions,
  BuildOutput,
  BuildParams,
  CompileOptions,
  CompileOutput,
  CompileParams,
  CompileTarget,
  CompiledBinary,
  KiddConfig,
  WatchParams,
} from './types.js'
export { watch } from './build/watch.js'
