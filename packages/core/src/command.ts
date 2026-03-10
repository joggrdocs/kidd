import { withTag } from '@kidd-cli/utils/tag'

import type {
  ArgsDef,
  CommandDef,
  Middleware,
  MiddlewareEnv,
  Command as CommandType,
} from './types.js'

/**
 * Define a CLI command with typed args, config, and handler.
 *
 * The `const TMiddleware` generic preserves the middleware tuple as a literal type,
 * enabling TypeScript to extract and intersect `Variables` from each middleware
 * element onto the handler's `ctx` type.
 *
 * @param def - Command definition including description, args schema, middleware, and handler.
 * @returns A resolved Command object for registration in the command map.
 */
export function command<
  TArgsDef extends ArgsDef = ArgsDef,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
  const TMiddleware extends readonly Middleware<MiddlewareEnv>[] =
    readonly Middleware<MiddlewareEnv>[],
>(def: CommandDef<TArgsDef, TConfig, TMiddleware>): CommandType {
  return withTag({ ...def }, 'Command') as CommandType
}
