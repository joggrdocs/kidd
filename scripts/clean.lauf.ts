import { lauf, z } from 'laufen'
import { rimraf } from 'rimraf'
import { match } from 'ts-pattern'

const DIST_GLOBS = ['packages/*/dist', 'examples/*/dist']
const CACHE_GLOBS = ['**/.turbo']
const DEPS_GLOBS = ['**/node_modules']
const COVERAGE_GLOBS = ['coverage']

export default lauf({
  args: {
    build: z.boolean().default(false).describe('Remove dist directories'),
    cache: z.boolean().default(false).describe('Remove .turbo cache directories'),
    coverage: z.boolean().default(false).describe('Remove coverage output'),
    deps: z.boolean().default(false).describe('Remove node_modules directories'),
    nuke: z.boolean().default(false).describe('Remove everything (deps, build, cache, coverage)'),
    verbose: z.boolean().default(false).describe('Enable verbose logging'),
  },
  description: 'Clean build artifacts, caches, and dependencies',
  async run(ctx) {
    const globs = match(ctx.args)
      .with({ nuke: true }, () => [...DIST_GLOBS, ...CACHE_GLOBS, ...DEPS_GLOBS, ...COVERAGE_GLOBS])
      .otherwise(({ build, cache, coverage, deps }) => {
        const entries: readonly (readonly [boolean, readonly string[]])[] = [
          [build, DIST_GLOBS],
          [cache, CACHE_GLOBS],
          [coverage, COVERAGE_GLOBS],
          [deps, DEPS_GLOBS],
        ]

        return entries.filter(([enabled]) => enabled).flatMap(([, patterns]) => patterns)
      })

    if (globs.length === 0) {
      ctx.logger.warn(
        'No clean target specified. Use --nuke, --build, --cache, --deps, or --coverage.'
      )
      return
    }

    if (ctx.args.verbose) {
      ctx.logger.info(`Cleaning: ${globs.join(', ')}`)
    }

    await rimraf(globs, { glob: true })

    ctx.logger.success('Clean complete')
  },
})
