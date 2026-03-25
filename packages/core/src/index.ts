export { cli } from './cli.js'
export { command } from './command.js'
export { compose } from './compose.js'
export { autoload } from './autoload.js'
export { decorateContext } from './context/decorate.js'
export { middleware } from './middleware.js'
export { defineConfig } from '@kidd-cli/config'
export type {
  CliConfig,
  Command,
  CommandsConfig,
  ConfigType,
  HelpOptions,
  MiddlewareEnv,
  Resolvable,
} from './types/index.js'
export type { Colors } from 'picocolors/types'
export type { CommandContext, Log, Prompts, Spinner } from './context/types.js'
export type {
  DotDirectory,
  DotDirectoryClient,
  DotDirectoryError,
  ProtectedFileEntry,
} from './lib/dotdir/types.js'
export type { Report } from './middleware/report/types.js'
