/**
 * Matches `token=value`, `key: "value"`, `"secret": "value"`, etc.
 * Supports JSON, TOML/INI, and shell-style key-value pairs.
 * Value charset includes `/`, `+`, `.`, `=` to avoid partial redaction.
 *
 * @private
 */
const GENERIC_SECRET_PATTERN =
  /(?:token|key|secret|password|auth)['"]?\s*[=:]\s*['"]?[^\s'",;)}\]]{8,}['"]?/gi

/**
 * Matches credentials embedded in URLs for any protocol
 * (e.g. `https://user:pass@host`, `redis://default:pass@host`).
 *
 * @private
 */
const URL_CREDENTIALS_PATTERN = /\w+:\/\/[^:/\s]+:[^@/\s]+@/gi

/**
 * Matches `Bearer <token>` authorization values.
 *
 * @private
 */
const BEARER_TOKEN_PATTERN = /Bearer\s+[\w\-_.]{20,}/gi

/**
 * Matches GitHub tokens: server-to-server (`ghs_`), personal (`ghp_`),
 * OAuth (`gho_`), user-to-server (`ghu_`), and refresh (`ghr_`).
 *
 * @private
 */
const GITHUB_TOKEN_PATTERN = /gh[opsru]_[\w]+/gi

/**
 * Matches GitHub fine-grained personal access tokens (`github_pat_*`).
 *
 * @private
 */
const GITHUB_PAT_PATTERN = /github_pat_[A-Za-z0-9_]{36,255}/g

/**
 * Matches sensitive values in URL query parameters (e.g. `?token=abc`).
 *
 * @private
 */
const URL_QUERY_SECRET_PATTERN = /[?&](?:token|key|secret|password)=[^&\s]+/gi

/**
 * Matches AWS access key IDs (`AKIA*`, `ASIA*`).
 *
 * @private
 */
const AWS_ACCESS_KEY_PATTERN = /(?:AKIA|ASIA)[A-Z0-9]{16}/g

/**
 * Matches AWS secret access keys in key-value assignment context.
 * Uses explicit key names to avoid false positives on arbitrary base64 strings.
 *
 * @private
 */
const AWS_SECRET_KEY_PATTERN =
  /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}['"]?/g

/**
 * Matches npm authentication tokens (`npm_*`).
 *
 * @private
 */
const NPM_TOKEN_PATTERN = /npm_[A-Za-z0-9]{36}/g

/**
 * Matches Slack API tokens (`xoxb-*`, `xoxp-*`, `xoxa-*`, etc.).
 *
 * @private
 */
const SLACK_TOKEN_PATTERN = /xox[baprs]-[\w-]+/gi

/**
 * Matches Slack incoming webhook URLs (`hooks.slack.com/services/*`).
 *
 * @private
 */
const SLACK_WEBHOOK_PATTERN = /https:\/\/hooks\.slack\.com\/services\/[\w/]+/gi

/**
 * Matches Discord webhook URLs (`discord.com/api/webhooks/*`).
 *
 * @private
 */
const DISCORD_WEBHOOK_PATTERN =
  /https:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/[\w/-]+/gi

/**
 * Matches Stripe secret and restricted keys (`sk_live_*`, `sk_test_*`, `rk_live_*`, etc.).
 *
 * @private
 */
const STRIPE_KEY_PATTERN = /(?:sk|rk|pk)[-_](?:live|test)[-_][\w]+/gi

/**
 * Matches Stripe webhook signing secrets (`whsec_*`).
 *
 * @private
 */
const STRIPE_WEBHOOK_SECRET_PATTERN = /whsec_[\w]{20,}/g

/**
 * Matches PEM-encoded private keys (RSA, DSA, EC, OPENSSH, and generic PKCS#8).
 *
 * @private
 */
const PRIVATE_KEY_PATTERN =
  /-----BEGIN (?:(?:RSA|DSA|EC|OPENSSH) )?(?:ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (?:(?:RSA|DSA|EC|OPENSSH) )?(?:ENCRYPTED )?PRIVATE KEY-----/gi

/**
 * Matches JSON Web Tokens (three base64url-encoded segments separated by dots).
 *
 * @private
 */
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g

/**
 * Matches database connection strings with embedded credentials
 * (PostgreSQL, MySQL, MongoDB, MSSQL).
 *
 * @private
 */
const DATABASE_URL_PATTERN =
  /(?:postgresql|postgres|mysql|mongodb(?:\+srv)?|mssql):\/\/[^:]+:[^@]+@[^\s]+/gi

/**
 * Matches GitLab personal access tokens (`glpat-*`).
 *
 * @private
 */
const GITLAB_PAT_PATTERN = /glpat-[A-Za-z0-9_-]{20,}/g

/**
 * Matches Bitbucket app tokens (`ATBB*`).
 *
 * @private
 */
const BITBUCKET_TOKEN_PATTERN = /ATBB[A-Za-z0-9]{28,}/g

/**
 * Matches Google API keys (`AIza*`).
 *
 * @private
 */
const GOOGLE_API_KEY_PATTERN = /AIza[0-9A-Za-z_-]{35}/g

/**
 * Matches `Authorization: Basic <base64>` headers.
 *
 * @private
 */
const BASIC_AUTH_HEADER_PATTERN = /Authorization:\s*Basic\s+[A-Za-z0-9+/]+=*/gi

/**
 * Matches Anthropic API keys (`sk-ant-*`).
 *
 * @private
 */
const ANTHROPIC_API_KEY_PATTERN = /sk-ant-[\w-]{20,}/g

/**
 * Matches OpenAI API keys with `sk-proj-*` and `sk-svcacct-*` prefixes.
 * Must be ordered after Stripe/Anthropic patterns to avoid collisions.
 *
 * @private
 */
const OPENAI_API_KEY_PATTERN = /sk-(?:proj-|svcacct-)[A-Za-z0-9_-]{20,}/g

/**
 * Matches SendGrid API keys (`SG.*.*`).
 *
 * @private
 */
const SENDGRID_API_KEY_PATTERN = /SG\.[A-Za-z0-9_-]{22,}\.[A-Za-z0-9_-]{22,}/g

/**
 * Matches HashiCorp Vault tokens (`hvs.*`, `hvb.*`, `hvp.*`).
 *
 * @private
 */
const VAULT_TOKEN_PATTERN = /hv[sbp]\.[A-Za-z0-9_-]{24,}/g

/**
 * Matches PyPI API tokens (`pypi-*`).
 *
 * @private
 */
const PYPI_TOKEN_PATTERN = /pypi-[A-Za-z0-9_-]{16,}/g

/**
 * Regex patterns that match sensitive values (tokens, keys, passwords, etc.).
 *
 * Order matters: more specific patterns (Anthropic, OpenAI, Stripe) are placed
 * before the generic secret pattern to ensure precise matches take priority.
 */
export const SENSITIVE_PATTERNS: readonly RegExp[] = [
  ANTHROPIC_API_KEY_PATTERN,
  OPENAI_API_KEY_PATTERN,
  STRIPE_KEY_PATTERN,
  STRIPE_WEBHOOK_SECRET_PATTERN,
  GITHUB_PAT_PATTERN,
  GITHUB_TOKEN_PATTERN,
  GITLAB_PAT_PATTERN,
  BITBUCKET_TOKEN_PATTERN,
  SLACK_TOKEN_PATTERN,
  SLACK_WEBHOOK_PATTERN,
  DISCORD_WEBHOOK_PATTERN,
  NPM_TOKEN_PATTERN,
  PYPI_TOKEN_PATTERN,
  SENDGRID_API_KEY_PATTERN,
  VAULT_TOKEN_PATTERN,
  AWS_ACCESS_KEY_PATTERN,
  AWS_SECRET_KEY_PATTERN,
  GOOGLE_API_KEY_PATTERN,
  BEARER_TOKEN_PATTERN,
  BASIC_AUTH_HEADER_PATTERN,
  JWT_PATTERN,
  PRIVATE_KEY_PATTERN,
  DATABASE_URL_PATTERN,
  URL_CREDENTIALS_PATTERN,
  URL_QUERY_SECRET_PATTERN,
  GENERIC_SECRET_PATTERN,
]

/**
 * Replace sensitive patterns in a string with `[REDACTED]`.
 *
 * @param message - The string to sanitize.
 * @returns The sanitized string with sensitive patterns replaced.
 */
export function sanitize(message: string): string {
  return SENSITIVE_PATTERNS.reduce((acc, pattern) => {
    // oxlint-disable-next-line security/detect-non-literal-regexp -- source is a module-level constant
    const freshPattern = new RegExp(pattern.source, pattern.flags)
    return acc.replaceAll(freshPattern, '[REDACTED]')
  }, message)
}
