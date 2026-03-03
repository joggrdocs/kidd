import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'

import type { LoadConfigResult } from '@kidd-cli/config/loader'
import { attemptAsync, err, ok } from '@kidd-cli/utils/fp'
import type { AsyncResult } from '@kidd-cli/utils/fp'
import { jsonParse, jsonStringify } from '@kidd-cli/utils/json'
import type { Manifest } from '@kidd-cli/utils/manifest'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Default entry point for the CLI source.
 */
const DEFAULT_ENTRY = './src/index.ts'

/**
 * Default directory for CLI commands.
 */
const DEFAULT_COMMANDS = './commands'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Outcome status for a single diagnostic check.
 */
export type CheckStatus = 'fail' | 'pass' | 'warn'

/**
 * The result of running a single diagnostic check.
 */
export interface CheckResult {
  readonly name: string
  readonly status: CheckStatus
  readonly message: string
  readonly hint: string | null
}

/**
 * The result of running an auto-fix for a diagnostic check.
 */
export interface FixResult {
  readonly name: string
  readonly fixed: boolean
  readonly message: string
}

/**
 * A named diagnostic check with an async runner and optional fix.
 */
export interface DiagnosticCheck {
  readonly name: string
  readonly run: (context: CheckContext) => Promise<CheckResult>
  readonly fix?: (context: CheckContext) => Promise<FixResult>
}

/**
 * Context shared across all diagnostic checks.
 */
export interface CheckContext {
  readonly cwd: string
  readonly configResult: LoadConfigResult | null
  readonly configError: Error | null
  readonly manifest: Manifest | null
  readonly rawPackageJson: RawPackageJson | null
}

/**
 * Minimal package.json shape for fields not exposed by Manifest.
 */
export interface RawPackageJson {
  readonly type?: string
  readonly dependencies?: Readonly<Record<string, string>>
  readonly devDependencies?: Readonly<Record<string, string>>
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a CheckContext from the gathered project data.
 *
 * @param params - The context parameters.
 * @returns A frozen CheckContext.
 */
export function createCheckContext(params: {
  readonly cwd: string
  readonly configResult: LoadConfigResult | null
  readonly configError: Error | null
  readonly manifest: Manifest | null
  readonly rawPackageJson: RawPackageJson | null
}): CheckContext {
  return {
    configError: params.configError,
    configResult: params.configResult,
    cwd: params.cwd,
    manifest: params.manifest,
    rawPackageJson: params.rawPackageJson,
  }
}

// ---------------------------------------------------------------------------
// Result helpers
// ---------------------------------------------------------------------------

/**
 * Create a CheckResult with the given status.
 *
 * @private
 * @param params - The check result parameters.
 * @returns A CheckResult.
 */
function checkResult(params: {
  readonly name: string
  readonly status: CheckStatus
  readonly message: string
  readonly hint?: string | null
}): CheckResult {
  return {
    hint: params.hint ?? null,
    message: params.message,
    name: params.name,
    status: params.status,
  }
}

/**
 * Create a FixResult.
 *
 * @private
 * @param params - The fix result parameters.
 * @returns A FixResult.
 */
function fixResult(params: {
  readonly name: string
  readonly fixed: boolean
  readonly message: string
}): FixResult {
  return {
    fixed: params.fixed,
    message: params.message,
    name: params.name,
  }
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

/**
 * Check whether a kidd config file exists.
 *
 * @private
 * @param context - The diagnostic check context.
 * @returns A CheckResult indicating pass or fail.
 */
async function checkKiddConfig(context: CheckContext): Promise<CheckResult> {
  if (context.configResult && context.configResult.configFile) {
    const rel = relative(context.cwd, context.configResult.configFile)
    return checkResult({
      message: `Config file found at ./${rel}`,
      name: 'kidd.config',
      status: 'pass',
    })
  }

  return checkResult({
    hint: 'Run "kidd init" to scaffold a config file',
    message: 'No config file found',
    name: 'kidd.config',
    status: 'fail',
  })
}

/**
 * Check whether the loaded config schema is valid.
 *
 * @private
 * @param context - The diagnostic check context.
 * @returns A CheckResult indicating pass, warn, or fail.
 */
async function checkConfigSchema(context: CheckContext): Promise<CheckResult> {
  if (context.configResult) {
    return checkResult({ message: 'Config is valid', name: 'config schema', status: 'pass' })
  }

  if (context.configError) {
    return checkResult({
      hint: 'Check your kidd.config.ts for syntax or schema errors',
      message: `Config validation failed: ${context.configError.message}`,
      name: 'config schema',
      status: 'fail',
    })
  }

  return checkResult({
    message: 'No config file, using defaults',
    name: 'config schema',
    status: 'warn',
  })
}

/**
 * Check whether package.json exists in the project.
 *
 * @private
 * @param context - The diagnostic check context.
 * @returns A CheckResult indicating pass or fail.
 */
async function checkPackageJson(context: CheckContext): Promise<CheckResult> {
  if (context.rawPackageJson) {
    return checkResult({ message: 'Found', name: 'package.json', status: 'pass' })
  }

  return checkResult({
    hint: 'Run "pnpm init" to create a package.json',
    message: 'Not found',
    name: 'package.json',
    status: 'fail',
  })
}

/**
 * Check whether the package.json has a version field.
 *
 * @private
 * @param context - The diagnostic check context.
 * @returns A CheckResult indicating pass or warn.
 */
async function checkPackageVersion(context: CheckContext): Promise<CheckResult> {
  if (context.manifest && context.manifest.version) {
    return checkResult({
      message: context.manifest.version,
      name: 'package version',
      status: 'pass',
    })
  }

  return checkResult({
    hint: 'Add a "version" field to package.json',
    message: 'No version field',
    name: 'package version',
    status: 'warn',
  })
}

/**
 * Check whether the package.json declares ESM via `"type": "module"`.
 *
 * @private
 * @param context - The diagnostic check context.
 * @returns A CheckResult indicating pass or fail.
 */
async function checkModuleType(context: CheckContext): Promise<CheckResult> {
  if (context.rawPackageJson && context.rawPackageJson.type === 'module') {
    return checkResult({ message: 'ESM ("type": "module")', name: 'module type', status: 'pass' })
  }

  return checkResult({
    hint: 'Add "type": "module" to package.json (fixable with --fix)',
    message: 'Missing or wrong "type" field (expected "module")',
    name: 'module type',
    status: 'fail',
  })
}

/**
 * Check whether kidd is listed as a dependency or devDependency.
 *
 * @private
 * @param context - The diagnostic check context.
 * @returns A CheckResult indicating pass or fail.
 */
async function checkKiddDependency(context: CheckContext): Promise<CheckResult> {
  if (!context.rawPackageJson) {
    return checkResult({
      hint: 'Run "pnpm init" to create a package.json first',
      message: 'No package.json found',
      name: 'kidd dependency',
      status: 'fail',
    })
  }

  const deps = context.rawPackageJson.dependencies ?? {}
  const devDeps = context.rawPackageJson.devDependencies ?? {}

  if ('kidd' in deps) {
    return checkResult({
      message: 'Found in dependencies',
      name: 'kidd dependency',
      status: 'pass',
    })
  }

  if ('kidd' in devDeps) {
    return checkResult({
      message: 'Found in devDependencies',
      name: 'kidd dependency',
      status: 'pass',
    })
  }

  return checkResult({
    hint: 'Run "pnpm add kidd" or use --fix to add it (fixable with --fix)',
    message: 'Not found in dependencies or devDependencies',
    name: 'kidd dependency',
    status: 'fail',
  })
}

/**
 * Check whether the CLI entry point file exists on disk.
 *
 * @private
 * @param context - The diagnostic check context.
 * @returns A CheckResult indicating pass, warn, or fail.
 */
async function checkEntryPoint(context: CheckContext): Promise<CheckResult> {
  const config = extractConfig(context.configResult)
  const entryPath = resolveEntryPath(config)

  const absolutePath = join(context.cwd, entryPath)
  const exists = await fileExists(absolutePath)

  if (exists) {
    return checkResult({ message: `Found: ${entryPath}`, name: 'entry point', status: 'pass' })
  }

  if (!config) {
    return checkResult({
      hint: 'Create the entry file or update "entry" in kidd.config.ts (fixable with --fix)',
      message: `No config, default not found: ${entryPath}`,
      name: 'entry point',
      status: 'warn',
    })
  }

  return checkResult({
    hint: 'Create the entry file or update "entry" in kidd.config.ts (fixable with --fix)',
    message: `Not found: ${entryPath}`,
    name: 'entry point',
    status: 'fail',
  })
}

/**
 * Check whether the commands directory exists on disk.
 *
 * @private
 * @param context - The diagnostic check context.
 * @returns A CheckResult indicating pass, warn, or fail.
 */
async function checkCommandsDirectory(context: CheckContext): Promise<CheckResult> {
  const config = extractConfig(context.configResult)
  const commandsPath = resolveCommandsPath(config)

  const absolutePath = join(context.cwd, commandsPath)
  const exists = await fileExists(absolutePath)

  if (exists) {
    return checkResult({
      message: `Found: ${commandsPath}`,
      name: 'commands directory',
      status: 'pass',
    })
  }

  if (!config) {
    return checkResult({
      hint: 'Create the directory or update "commands" in kidd.config.ts (fixable with --fix)',
      message: `No config, default not found: ${commandsPath}`,
      name: 'commands directory',
      status: 'warn',
    })
  }

  return checkResult({
    hint: 'Create the directory or update "commands" in kidd.config.ts (fixable with --fix)',
    message: `Not found: ${commandsPath}`,
    name: 'commands directory',
    status: 'fail',
  })
}

/**
 * Check whether a tsconfig.json exists in the project root.
 *
 * @private
 * @param context - The diagnostic check context.
 * @returns A CheckResult indicating pass or warn.
 */
async function checkTsconfig(context: CheckContext): Promise<CheckResult> {
  const exists = await fileExists(join(context.cwd, 'tsconfig.json'))

  if (exists) {
    return checkResult({ message: 'Found', name: 'tsconfig.json', status: 'pass' })
  }

  return checkResult({
    hint: 'Run "tsc --init" to create a tsconfig.json',
    message: 'Not found (recommended)',
    name: 'tsconfig.json',
    status: 'warn',
  })
}

// ---------------------------------------------------------------------------
// Fix functions
// ---------------------------------------------------------------------------

/**
 * Fix the module type by adding "type": "module" to package.json.
 *
 * @private
 * @param context - The diagnostic check context.
 * @returns A FixResult indicating whether the fix was applied.
 */
async function fixModuleType(context: CheckContext): Promise<FixResult> {
  const [updateError] = await updatePackageJson(context.cwd, (pkg) => ({ ...pkg, type: 'module' }))

  if (updateError) {
    return fixResult({ fixed: false, message: updateError.message, name: 'module type' })
  }

  return fixResult({
    fixed: true,
    message: 'Added "type": "module" to package.json',
    name: 'module type',
  })
}

/**
 * Fix the kidd dependency by adding it to package.json dependencies.
 *
 * @private
 * @param context - The diagnostic check context.
 * @returns A FixResult indicating whether the fix was applied.
 */
async function fixKiddDependency(context: CheckContext): Promise<FixResult> {
  const [updateError] = await updatePackageJson(context.cwd, (pkg) => {
    const deps = pkg.dependencies as Record<string, string> | undefined
    return {
      ...pkg,
      dependencies: { ...deps, kidd: 'latest' },
    }
  })

  if (updateError) {
    return fixResult({ fixed: false, message: updateError.message, name: 'kidd dependency' })
  }

  return fixResult({
    fixed: true,
    message: 'Added "kidd": "latest" to dependencies',
    name: 'kidd dependency',
  })
}

/**
 * Fix the entry point by creating the entry file with a minimal scaffold.
 *
 * @private
 * @param context - The diagnostic check context.
 * @returns A FixResult indicating whether the fix was applied.
 */
async function fixEntryPoint(context: CheckContext): Promise<FixResult> {
  const config = extractConfig(context.configResult)
  const entryPath = resolveEntryPath(config)
  const absolutePath = join(context.cwd, entryPath)

  const [mkdirError] = await attemptAsync<string | undefined, Error>(() =>
    mkdir(dirname(absolutePath), { recursive: true })
  )

  if (mkdirError) {
    return fixResult({
      fixed: false,
      message: `Failed to create directory: ${mkdirError.message}`,
      name: 'entry point',
    })
  }

  const content = `import { create } from 'kidd'\n`
  const [writeError] = await attemptAsync<void, Error>(() =>
    writeFile(absolutePath, content, 'utf8')
  )

  if (writeError) {
    return fixResult({
      fixed: false,
      message: `Failed to create file: ${writeError.message}`,
      name: 'entry point',
    })
  }

  return fixResult({ fixed: true, message: `Created ${entryPath}`, name: 'entry point' })
}

/**
 * Fix the commands directory by creating it.
 *
 * @private
 * @param context - The diagnostic check context.
 * @returns A FixResult indicating whether the fix was applied.
 */
async function fixCommandsDirectory(context: CheckContext): Promise<FixResult> {
  const config = extractConfig(context.configResult)
  const commandsPath = resolveCommandsPath(config)
  const absolutePath = join(context.cwd, commandsPath)

  const [mkdirError] = await attemptAsync<string | undefined, Error>(() =>
    mkdir(absolutePath, { recursive: true })
  )

  if (mkdirError) {
    return fixResult({
      fixed: false,
      message: `Failed to create directory: ${mkdirError.message}`,
      name: 'commands directory',
    })
  }

  return fixResult({ fixed: true, message: `Created ${commandsPath}`, name: 'commands directory' })
}

/**
 * All diagnostic checks to run in order.
 */
export const CHECKS: readonly DiagnosticCheck[] = [
  { name: 'kidd.config', run: checkKiddConfig },
  { name: 'config schema', run: checkConfigSchema },
  { name: 'package.json', run: checkPackageJson },
  { name: 'package version', run: checkPackageVersion },
  { fix: fixModuleType, name: 'module type', run: checkModuleType },
  { fix: fixKiddDependency, name: 'kidd dependency', run: checkKiddDependency },
  { fix: fixEntryPoint, name: 'entry point', run: checkEntryPoint },
  { fix: fixCommandsDirectory, name: 'commands directory', run: checkCommandsDirectory },
  { name: 'tsconfig.json', run: checkTsconfig },
]

// ---------------------------------------------------------------------------
// Raw package.json loader
// ---------------------------------------------------------------------------

/**
 * Read and parse the raw package.json from a directory.
 *
 * Only extracts the fields needed by diagnostic checks that Manifest does not expose.
 *
 * @param cwd - The directory to read from.
 * @returns A Result tuple with the raw package.json data or an error message.
 */
export async function readRawPackageJson(cwd: string): AsyncResult<RawPackageJson> {
  const filePath = join(cwd, 'package.json')
  const [readError, content] = await attemptAsync<string, Error>(() => readFile(filePath, 'utf8'))

  if (readError) {
    return err(`Failed to read package.json: ${readError.message}`)
  }

  const [parseError, data] = jsonParse(content)

  if (parseError) {
    return [parseError, null]
  }

  return ok(data as RawPackageJson)
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a path exists on disk.
 *
 * @private
 * @param filePath - The path to check.
 * @returns True when the path is accessible, false otherwise.
 */
async function fileExists(filePath: string): Promise<boolean> {
  const [accessError] = await attemptAsync(() => access(filePath))
  return accessError === null
}

/**
 * Extract a KiddConfig from a load result, returning null when absent.
 *
 * @private
 * @param result - The config load result, or null.
 * @returns The config object or null.
 */
function extractConfig(result: LoadConfigResult | null): LoadConfigResult['config'] | null {
  if (result) {
    return result.config
  }

  return null
}

/**
 * Resolve the entry path from config, falling back to the default.
 *
 * @private
 * @param config - The loaded config or null.
 * @returns The entry path string.
 */
function resolveEntryPath(config: LoadConfigResult['config'] | null): string {
  if (config && config.entry) {
    return config.entry
  }

  return DEFAULT_ENTRY
}

/**
 * Resolve the commands directory path from config, falling back to the default.
 *
 * @private
 * @param config - The loaded config or null.
 * @returns The commands directory path string.
 */
function resolveCommandsPath(config: LoadConfigResult['config'] | null): string {
  if (config && config.commands) {
    return config.commands
  }

  return DEFAULT_COMMANDS
}

/**
 * Read, transform, and write back a package.json file.
 *
 * @private
 * @param cwd - The directory containing the package.json.
 * @param transform - A pure function that returns the updated package data.
 * @returns A Result tuple indicating success or failure.
 */
async function updatePackageJson(
  cwd: string,
  transform: (data: Record<string, unknown>) => Record<string, unknown>
): AsyncResult<void> {
  const filePath = join(cwd, 'package.json')

  const [readError, content] = await attemptAsync<string, Error>(() => readFile(filePath, 'utf8'))

  if (readError) {
    return err(`Failed to read package.json: ${readError.message}`)
  }

  const [parseError, data] = jsonParse(content)

  if (parseError) {
    return [parseError, null]
  }

  const updated = transform(data as Record<string, unknown>)

  const [stringifyError, json] = jsonStringify(updated, { pretty: true })

  if (stringifyError) {
    return [stringifyError, null]
  }

  const [writeError] = await attemptAsync<void, Error>(() =>
    writeFile(filePath, `${json}\n`, 'utf8')
  )

  if (writeError) {
    return err(`Failed to write package.json: ${writeError.message}`)
  }

  return ok()
}
