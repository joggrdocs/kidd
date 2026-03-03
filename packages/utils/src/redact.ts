/**
 * Regex patterns that match sensitive values (tokens, keys, passwords, etc.).
 */
export const SENSITIVE_PATTERNS: RegExp[] = [
  /(?:token|key|secret|password|auth)[=:]\s*['"]?[A-Za-z0-9_-]{8,}['"]?/gi,
  /https?:\/\/[^:/\s]+:[^@/\s]+@/gi,
  /Bearer\s+[\w\-_.]{20,}/gi,
  /gh[ps]_[\w]+/gi,
  /github_pat_[A-Za-z0-9_]{36,255}/g,
  /[?&](?:token|key|secret|password)=[^&\s]+/gi,
  /(?:AKIA|ASIA)[A-Z0-9]{16}/g,
  /npm_[A-Za-z0-9]{36}/g,
  /xox[baprs]-[\w-]+/gi,
  /sk[-_](?:live|test)[-_][\w]+/gi,
  /-----BEGIN (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY-----[\s\S]*?-----END (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/gi,
  /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
  /(?:postgresql|postgres|mysql|mongodb(?:\+srv)?):\/\/[^:]+:[^@]+@[^\s]+/gi,
  /glpat-[A-Za-z0-9_-]{20,}/g,
  /ATBB[A-Za-z0-9]{28,}/g,
  /AIza[0-9A-Za-z_-]{35}/g,
  /Authorization:\s*Basic\s+[A-Za-z0-9+/]+=*/gi,
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
