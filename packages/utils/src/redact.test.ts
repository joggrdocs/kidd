import { describe, expect, it } from 'vitest'

import { SENSITIVE_PATTERNS, sanitize } from './redact.js'

describe('SENSITIVE_PATTERNS constant', () => {
  it('is a non-empty array of RegExp instances', () => {
    expect(Array.isArray(SENSITIVE_PATTERNS)).toBeTruthy()
    expect(SENSITIVE_PATTERNS.length).toBeGreaterThan(0)
    expect(SENSITIVE_PATTERNS.every((pattern) => pattern instanceof RegExp)).toBeTruthy()
  })
})

describe('sanitize()', () => {
  // -- Messages without secrets --
  it('returns an unchanged message when no secrets are present', () => {
    const msg = 'This is a plain log message with no sensitive data.'
    expect(sanitize(msg)).toBe(msg)
  })

  it('returns an empty string unchanged', () => {
    expect(sanitize('')).toBe('')
  })

  // -- Bearer tokens --
  it('redacts Bearer tokens', () => {
    const msg = 'Authorization: Bearer eyABCDEFGHIJKLMNOPQRSTUVWXYZ1234'
    expect(sanitize(msg)).not.toContain('eyABCDEFGHIJKLMNOPQRSTUVWXYZ1234')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  // -- GitHub tokens --
  it('redacts GitHub server-to-server tokens (ghs_)', () => {
    const msg = 'Token is ghs_1234567890abcdef'
    expect(sanitize(msg)).not.toContain('ghs_1234567890abcdef')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts GitHub personal access tokens (ghp_)', () => {
    const msg = 'ghp_abcdefghijklmnopqrstuvwxyz1234'
    expect(sanitize(msg)).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz1234')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts fine-grained GitHub PATs (github_pat_)', () => {
    const pat = `github_pat_${'A'.repeat(40)}`
    const msg = `Using token: ${pat}`
    expect(sanitize(msg)).not.toContain(pat)
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  // -- npm tokens --
  it('redacts npm tokens', () => {
    const token = `npm_${'A'.repeat(36)}`
    const msg = `Publishing with ${token}`
    expect(sanitize(msg)).not.toContain(token)
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  // -- AWS access keys --
  it('redacts AWS access keys starting with AKIA', () => {
    const key = `AKIA${'A'.repeat(16)}`
    const msg = `AWS key: ${key}`
    expect(sanitize(msg)).not.toContain(key)
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts AWS temporary credentials starting with ASIA', () => {
    const key = `ASIA${'B'.repeat(16)}`
    const msg = `Temp key: ${key}`
    expect(sanitize(msg)).not.toContain(key)
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  // -- JWTs --
  it('redacts JSON Web Tokens', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
    const msg = `Token: ${jwt}`
    expect(sanitize(msg)).not.toContain(jwt)
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  // -- Database URIs --
  it('redacts PostgreSQL connection strings', () => {
    const uri = 'postgresql://admin:s3cret@db.example.com:5432/mydb'
    const msg = `Connecting to ${uri}`
    expect(sanitize(msg)).not.toContain('admin:s3cret@')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts postgres:// connection strings', () => {
    const uri = 'postgres://user:pass@localhost/db'
    expect(sanitize(uri)).not.toContain('user:pass@')
    expect(sanitize(uri)).toContain('[REDACTED]')
  })

  it('redacts MySQL connection strings', () => {
    const uri = 'mysql://root:password123@mysql.host.com:3306/app'
    expect(sanitize(uri)).not.toContain('root:password123@')
    expect(sanitize(uri)).toContain('[REDACTED]')
  })

  it('redacts MongoDB connection strings', () => {
    const uri = 'mongodb://user:pass@mongo.example.com:27017/db'
    expect(sanitize(uri)).not.toContain('user:pass@')
    expect(sanitize(uri)).toContain('[REDACTED]')
  })

  it('redacts MongoDB+srv connection strings', () => {
    const uri = 'mongodb+srv://admin:supersecret@cluster.mongodb.net/prod'
    expect(sanitize(uri)).not.toContain('admin:supersecret@')
    expect(sanitize(uri)).toContain('[REDACTED]')
  })

  // -- Private keys --
  it('redacts RSA private keys', () => {
    const key =
      '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn\n-----END RSA PRIVATE KEY-----'
    const msg = `Found PEM: ${key}`
    expect(sanitize(msg)).toContain('[REDACTED]')
    expect(sanitize(msg)).not.toContain('MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn')
  })

  it('redacts DSA private keys', () => {
    const key = '-----BEGIN DSA PRIVATE KEY-----\nDATA\n-----END DSA PRIVATE KEY-----'
    expect(sanitize(key)).toContain('[REDACTED]')
    expect(sanitize(key)).not.toContain('DATA')
  })

  it('redacts EC private keys', () => {
    const key = '-----BEGIN EC PRIVATE KEY-----\nDATA\n-----END EC PRIVATE KEY-----'
    expect(sanitize(key)).toContain('[REDACTED]')
    expect(sanitize(key)).not.toContain('DATA')
  })

  it('redacts OPENSSH private keys', () => {
    const key = '-----BEGIN OPENSSH PRIVATE KEY-----\nDATA\n-----END OPENSSH PRIVATE KEY-----'
    expect(sanitize(key)).toContain('[REDACTED]')
    expect(sanitize(key)).not.toContain('DATA')
  })

  // -- URL credentials --
  it('redacts HTTP URLs with embedded credentials', () => {
    const msg = 'http://user:p4ssw0rd@example.com/api'
    expect(sanitize(msg)).not.toContain('user:p4ssw0rd@')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts HTTPS URLs with embedded credentials', () => {
    const msg = 'Fetching https://admin:secret@internal.service.io/data'
    expect(sanitize(msg)).not.toContain('admin:secret@')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  // -- GitLab PATs --
  it('redacts GitLab personal access tokens', () => {
    const token = `glpat-${'x'.repeat(20)}`
    const msg = `GitLab token: ${token}`
    expect(sanitize(msg)).not.toContain(token)
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  // -- Bitbucket tokens --
  it('redacts Bitbucket app tokens', () => {
    const token = `ATBB${'A'.repeat(28)}`
    const msg = `Bitbucket: ${token}`
    expect(sanitize(msg)).not.toContain(token)
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  // -- Google API keys --
  it('redacts Google API keys', () => {
    const key = `AIza${'x'.repeat(35)}`
    const msg = `Google key: ${key}`
    expect(sanitize(msg)).not.toContain(key)
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  // -- Basic auth --
  it('redacts Authorization Basic headers', () => {
    const msg = 'Authorization: Basic dXNlcjpwYXNz'
    expect(sanitize(msg)).not.toContain('dXNlcjpwYXNz')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts Authorization Basic headers with padding', () => {
    const msg = 'Authorization: Basic dXNlcjpwYXNzd29yZA=='
    expect(sanitize(msg)).not.toContain('dXNlcjpwYXNzd29yZA==')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  // -- Slack tokens --
  it('redacts Slack bot tokens (xoxb-)', () => {
    const token = 'xoxb-123456789-abcdefghij'
    const msg = `Slack token: ${token}`
    expect(sanitize(msg)).not.toContain(token)
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts Slack app tokens (xoxa-)', () => {
    const token = 'xoxa-2-something-more'
    const msg = `Slack app token: ${token}`
    expect(sanitize(msg)).not.toContain(token)
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts Slack user tokens (xoxp-)', () => {
    const token = 'xoxp-user-token-value'
    const msg = `Slack: ${token}`
    expect(sanitize(msg)).not.toContain(token)
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts Slack refresh tokens (xoxr-)', () => {
    const token = 'xoxr-refresh-value-here'
    const msg = `Slack refresh: ${token}`
    expect(sanitize(msg)).not.toContain(token)
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts Slack session tokens (xoxs-)', () => {
    const token = 'xoxs-session-value-here'
    const msg = `Slack session: ${token}`
    expect(sanitize(msg)).not.toContain(token)
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  // -- Stripe keys --
  it('redacts Stripe live secret keys', () => {
    const key = 'sk-live-abcdefghijklmnop'
    const msg = `Stripe key: ${key}`
    expect(sanitize(msg)).not.toContain(key)
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts Stripe test secret keys', () => {
    const key = 'sk_test_abcdefghijklmnop'
    const msg = `Stripe test: ${key}`
    expect(sanitize(msg)).not.toContain(key)
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts Stripe live keys with underscore separator', () => {
    const key = 'sk_live_abcdefghijklmnop'
    const msg = `Stripe: ${key}`
    expect(sanitize(msg)).not.toContain(key)
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  // -- Query params with secrets --
  it('redacts token in query string with ?', () => {
    const msg = 'https://api.example.com/data?token=abcdef1234567890'
    expect(sanitize(msg)).not.toContain('token=abcdef1234567890')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts key in query string with &', () => {
    const msg = 'https://api.example.com/data?foo=bar&key=mysupersecretkey'
    expect(sanitize(msg)).not.toContain('key=mysupersecretkey')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts secret in query string', () => {
    const msg = 'https://api.example.com?secret=topsecretvalue123'
    expect(sanitize(msg)).not.toContain('secret=topsecretvalue123')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts password in query string', () => {
    const msg = 'https://api.example.com?password=hunter2hunter2'
    expect(sanitize(msg)).not.toContain('password=hunter2hunter2')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  // -- key=value / key: value patterns --
  it('redacts token=value patterns', () => {
    const msg = 'Config: token=abcdefghijklmnop'
    expect(sanitize(msg)).not.toContain('token=abcdefghijklmnop')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts key: "value" patterns', () => {
    const msg = 'Using key: "mySecretKey12345678"'
    expect(sanitize(msg)).not.toContain('mySecretKey12345678')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts secret= patterns with single quotes', () => {
    const msg = "secret= 'longSecretValue1234'"
    expect(sanitize(msg)).not.toContain('longSecretValue1234')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts password: patterns', () => {
    const msg = 'password: SuperSecretPassword1'
    expect(sanitize(msg)).not.toContain('SuperSecretPassword1')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  it('redacts auth= patterns', () => {
    const msg = 'auth=SomeAuthToken12345678'
    expect(sanitize(msg)).not.toContain('auth=SomeAuthToken12345678')
    expect(sanitize(msg)).toContain('[REDACTED]')
  })

  // -- Multiple secrets in one message --
  it('redacts multiple different secrets in a single message', () => {
    const msg = 'Using ghp_tokenvalue123456 with Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZ1234'
    const result = sanitize(msg)
    expect(result).not.toContain('ghp_tokenvalue123456')
    expect(result).not.toContain('ABCDEFGHIJKLMNOPQRSTUVWXYZ1234')
  })

  // -- Idempotency --
  it('is idempotent: sanitizing twice yields the same result', () => {
    const msg = 'Token: ghp_abcdef1234567890'
    const once = sanitize(msg)
    const twice = sanitize(once)
    expect(once).toBe(twice)
  })

  // -- Regex lastIndex reset --
  it('handles global regex state correctly across successive calls', () => {
    const msg1 = 'ghp_firsttoken12345'
    const msg2 = 'ghp_secondtoken6789'
    const r1 = sanitize(msg1)
    const r2 = sanitize(msg2)
    expect(r1).toContain('[REDACTED]')
    expect(r2).toContain('[REDACTED]')
    expect(r2).not.toContain('ghp_secondtoken6789')
  })
})
