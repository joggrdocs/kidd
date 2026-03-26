import { attemptAsync, err, ok } from '@kidd-cli/utils/fp'
import type { AsyncResult } from '@kidd-cli/utils/fp'
import type { z } from 'zod'

import { createContext } from '@/context/index.js'
import type { CommandContext, Log } from '@/context/types.js'
import { createConfigClient } from '@/lib/config/index.js'
import type { CliConfigOptions, Middleware } from '@/types/index.js'

import { createArgsParser } from './args/index.js'
import { createMiddlewareExecutor } from './runner.js'
import type { ResolvedExecution, Runtime, RuntimeOptions } from './types.js'

/**
 * Create a runtime that orchestrates config loading and middleware execution.
 *
 * Loads config up front, then captures it in a closure alongside a runner.
 * The returned `runtime.execute` method handles arg parsing, context creation,
 * and middleware chain execution for each command invocation.
 *
 * @param options - Runtime configuration including name, version, config, and middleware.
 * @returns An AsyncResult containing the runtime or an error.
 */
export async function createRuntime<TSchema extends z.ZodType>(
  options: RuntimeOptions<TSchema>
): AsyncResult<Runtime, Error> {
  const config = await resolveConfig({
    configOptions: options.config,
    defaultName: options.name,
    log: options.log,
  })

  const middleware: Middleware[] = options.middleware ?? []
  const runner = createMiddlewareExecutor(middleware)

  const runtime = {
    async execute(command: ResolvedExecution): AsyncResult<void, Error> {
      const parser = createArgsParser({
        options: command.options,
        positionals: command.positionals,
      })
      const [argsError, validatedArgs] = parser.parse(command.rawArgs)
      if (argsError) {
        return err(argsError)
      }

      const ctx = createContext({
        args: validatedArgs,
        config,
        log: options.log,
        meta: {
          command: [...command.commandPath],
          dirs: options.dirs,
          name: options.name,
          version: options.version,
        },
        prompts: options.prompts,
        spinner: options.spinner,
      })

      const finalHandler = command.render ?? command.handler ?? (async () => {})

      // Accepted exception: generic context assembly requires type assertions.
      // The generics are validated at the createContext call site.
      const [execError] = await attemptAsync(() =>
        runner.execute({
          ctx: ctx as CommandContext,
          handler: finalHandler as (ctx: CommandContext) => Promise<void> | void,
          middleware: command.middleware,
        })
      )
      if (execError) {
        return err(execError)
      }

      return ok()
    },
  } satisfies Runtime

  return ok(runtime)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Load and validate a config file via the config client.
 *
 * Returns the validated config record or an empty object when no config
 * options are provided or when no config file is found. Logs a warning
 * when a config file is found but fails to load.
 *
 * @private
 * @param options - Object containing configOptions, defaultName, and optional log.
 * @returns The loaded config record or an empty object.
 */
async function resolveConfig<TSchema extends z.ZodType>({
  configOptions,
  defaultName,
  log,
}: {
  readonly configOptions: CliConfigOptions<TSchema> | undefined
  readonly defaultName: string
  readonly log: Log | undefined
}): Promise<Record<string, unknown>> {
  if (!configOptions || !configOptions.schema) {
    return {}
  }
  const client = createConfigClient({
    name: configOptions.name ?? defaultName,
    resolve: configOptions.resolve,
    schema: configOptions.schema,
    searchPaths: configOptions.searchPaths,
  })
  const [configError, configResult] = await client.load()
  if (configError) {
    log?.warn(`Failed to load config: ${String(configError)}`)
    return {}
  }
  if (!configResult) {
    return {}
  }
  // Accepted exception: configResult.config is generic TOutput from zod schema.
  // The cast bridges the generic boundary to the internal Record type.
  return configResult.config as Record<string, unknown>
}
