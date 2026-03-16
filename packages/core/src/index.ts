export { cli } from './cli.js'
export { command } from './command.js'
export { compose } from './compose.js'
export { autoload } from './autoload.js'
export { decorateContext } from './context/decorate.js'
export { middleware } from './middleware.js'
export { defineConfig } from '@kidd-cli/config'
export type {
  CliConfig,
  CliHelpOptions,
  Command,
  CommandsConfig,
  ConfigType,
  MiddlewareEnv,
} from './types/index.js'
export type { Colors } from 'picocolors/types'
export type { Context } from './context/types.js'
