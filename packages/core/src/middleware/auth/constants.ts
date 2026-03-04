/**
 * Default store key used by the auth middleware to store credentials.
 */
export const DEFAULT_AUTH_STORE_KEY = 'auth' as const

/**
 * Default filename for file-based credential storage.
 */
export const DEFAULT_AUTH_FILENAME = 'auth.json' as const

/**
 * Suffix appended to the derived token environment variable name.
 */
export const TOKEN_VAR_SUFFIX = '_TOKEN' as const

/**
 * Derive the default environment variable name from a CLI name.
 *
 * Converts kebab-case to SCREAMING_SNAKE_CASE and appends `_TOKEN`.
 * Example: `my-app` → `MY_APP_TOKEN`
 *
 * @param cliName - The CLI name.
 * @returns The derived environment variable name.
 */
export function deriveTokenVar(cliName: string): string {
  return `${cliName.replaceAll('-', '_').toUpperCase()}${TOKEN_VAR_SUFFIX}`
}
