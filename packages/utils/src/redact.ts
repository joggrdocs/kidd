/**
 * @private
 */
const GENERIC_SECRET_PATTERN =
  /(?:token|key|secret|password|auth)[=:]\s*['"]?[A-Za-z0-9_-]{8,}['"]?/gi

/**
 * @private
 */
const URL_CREDENTIALS_PATTERN = /https?:\/\/[^:/\s]+:[^@/\s]+@/gi

/**
 * @private
 */
const BEARER_TOKEN_PATTERN = /Bearer\s+[\w\-_.]{20,}/gi

/**
 * @private
 */
const GITHUB_TOKEN_PATTERN = /gh[ps]_[\w]+/gi

/**
 * @private
 */
const GITHUB_PAT_PATTERN = /github_pat_[A-Za-z0-9_]{36,255}/g

/**
 * @private
 */
const URL_QUERY_SECRET_PATTERN = /[?&](?:token|key|secret|password)=[^&\s]+/gi

/**
 * @private
 */
const AWS_ACCESS_KEY_PATTERN = /(?:AKIA|ASIA)[A-Z0-9]{16}/g

/**
 * @private
 */
const NPM_TOKEN_PATTERN = /npm_[A-Za-z0-9]{36}/g

/**
 * @private
 */
const SLACK_TOKEN_PATTERN = /xox[baprs]-[\w-]+/gi

/**
 * @private
 */
const STRIPE_KEY_PATTERN = /sk[-_](?:live|test)[-_][\w]+/gi

/**
 * @private
 */
const PRIVATE_KEY_PATTERN =
  /-----BEGIN (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY-----[\s\S]*?-----END (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/gi

/**
 * @private
 */
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g

/**
 * @private
 */
const DATABASE_URL_PATTERN =
  /(?:postgresql|postgres|mysql|mongodb(?:\+srv)?):\/\/[^:]+:[^@]+@[^\s]+/gi

/**
 * @private
 */
const GITLAB_PAT_PATTERN = /glpat-[A-Za-z0-9_-]{20,}/g

/**
 * @private
 */
const BITBUCKET_TOKEN_PATTERN = /ATBB[A-Za-z0-9]{28,}/g

/**
 * @private
 */
const GOOGLE_API_KEY_PATTERN = /AIza[0-9A-Za-z_-]{35}/g

/**
 * @private
 */
const BASIC_AUTH_HEADER_PATTERN = /Authorization:\s*Basic\s+[A-Za-z0-9+/]+=*/gi

/**
 * Regex patterns that match sensitive values (tokens, keys, passwords, etc.).
 */
export const SENSITIVE_PATTERNS: RegExp[] = [
  GENERIC_SECRET_PATTERN,
  URL_CREDENTIALS_PATTERN,
  BEARER_TOKEN_PATTERN,
  GITHUB_TOKEN_PATTERN,
  GITHUB_PAT_PATTERN,
  URL_QUERY_SECRET_PATTERN,
  AWS_ACCESS_KEY_PATTERN,
  NPM_TOKEN_PATTERN,
  SLACK_TOKEN_PATTERN,
  STRIPE_KEY_PATTERN,
  PRIVATE_KEY_PATTERN,
  JWT_PATTERN,
  DATABASE_URL_PATTERN,
  GITLAB_PAT_PATTERN,
  BITBUCKET_TOKEN_PATTERN,
  GOOGLE_API_KEY_PATTERN,
  BASIC_AUTH_HEADER_PATTERN,
]

/**
 * Replace sensitive patterns in a string with `[REDACTED]`.
 *
 * @param message - The string to sanitize.
 * @returns The sanitized string with sensitive patterns replaced.
 */
export function sanitize(message: string): string {
  return SENSITIVE_PATTERNS.reduce((acc, pattern) => {
    pattern.lastIndex = 0
    return acc.replace(pattern, '[REDACTED]')
  }, message)
}
