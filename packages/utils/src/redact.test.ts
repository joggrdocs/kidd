import { describe, expect, it } from 'vitest'

import { SENSITIVE_PATTERNS, sanitize } from './redact.js'

describe('SENSITIVE_PATTERNS constant', () => {
  it('should be a non-empty array of RegExp instances', () => {
    expect(Array.isArray(SENSITIVE_PATTERNS)).toBeTruthy()
    expect(SENSITIVE_PATTERNS.length).toBeGreaterThan(0)
    expect(SENSITIVE_PATTERNS.every((pattern) => pattern instanceof RegExp)).toBeTruthy()
  })
})

describe('sanitize()', () => {
  // -- Messages without secrets --
  it('should return an unchanged message when no secrets are present', () => {
    const msg = 'This is a plain log message with no sensitive data.'
    expect(sanitize(msg)).toBe(msg)
  })

  it('should return an empty string unchanged', () => {
    expect(sanitize('')).toBe('')
  })

  // -- Generic key=value patterns --
  describe('generic secrets', () => {
    it('should redact token=value patterns', () => {
      const msg = 'Config: token=abcdefghijklmnop'
      expect(sanitize(msg)).not.toContain('abcdefghijklmnop')
      expect(sanitize(msg)).toContain('[REDACTED]')
    })

    it('should redact key: "value" patterns', () => {
      const msg = 'Using key: "mySecretKey12345678"'
      expect(sanitize(msg)).not.toContain('mySecretKey12345678')
    })

    it('should redact secret= with single quotes', () => {
      const msg = "secret= 'longSecretValue1234'"
      expect(sanitize(msg)).not.toContain('longSecretValue1234')
    })

    it('should redact password: patterns', () => {
      const msg = 'password: SuperSecretPassword1'
      expect(sanitize(msg)).not.toContain('SuperSecretPassword1')
    })

    it('should redact auth= patterns', () => {
      const msg = 'auth=SomeAuthToken12345678'
      expect(sanitize(msg)).not.toContain('SomeAuthToken12345678')
    })

    it('should redact JSON-formatted "token": "value" patterns', () => {
      const msg = '"token": "abcdefghijklmnop"'
      expect(sanitize(msg)).not.toContain('abcdefghijklmnop')
    })

    it('should redact JSON-formatted "secret":"value" (no space)', () => {
      const msg = '"secret":"abcdefghijklmnop"'
      expect(sanitize(msg)).not.toContain('abcdefghijklmnop')
    })

    it('should redact TOML/INI token = "value" (spaces around =)', () => {
      const msg = 'token = "abcdefghijklmnop"'
      expect(sanitize(msg)).not.toContain('abcdefghijklmnop')
    })

    it('should redact values containing / + . = characters fully', () => {
      const msg = 'secret=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
      expect(sanitize(msg)).not.toContain('K7MDENG')
      expect(sanitize(msg)).not.toContain('bPxRfiCYEXAMPLEKEY')
    })
  })

  // -- Bearer tokens --
  describe('Bearer tokens', () => {
    it('should redact Bearer tokens', () => {
      const msg = 'Authorization: Bearer eyABCDEFGHIJKLMNOPQRSTUVWXYZ1234'
      expect(sanitize(msg)).not.toContain('eyABCDEFGHIJKLMNOPQRSTUVWXYZ1234')
      expect(sanitize(msg)).toContain('[REDACTED]')
    })
  })

  // -- GitHub tokens --
  describe('GitHub tokens', () => {
    it('should redact server-to-server tokens (ghs_)', () => {
      const msg = 'Token is ghs_1234567890abcdef'
      expect(sanitize(msg)).not.toContain('ghs_1234567890abcdef')
    })

    it('should redact personal access tokens (ghp_)', () => {
      const msg = 'ghp_abcdefghijklmnopqrstuvwxyz1234'
      expect(sanitize(msg)).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz1234')
    })

    it('should redact OAuth access tokens (gho_)', () => {
      const msg = 'OAuth token: gho_16C7e42F292c6912E7710c838347Ae178B4a'
      expect(sanitize(msg)).not.toContain('gho_16C7e42F292c6912E7710c838347Ae178B4a')
    })

    it('should redact user-to-server tokens (ghu_)', () => {
      const msg = 'Token: ghu_abcdef1234567890abcdef'
      expect(sanitize(msg)).not.toContain('ghu_abcdef1234567890abcdef')
    })

    it('should redact refresh tokens (ghr_)', () => {
      const msg = 'Refresh: ghr_abcdef1234567890abcdef'
      expect(sanitize(msg)).not.toContain('ghr_abcdef1234567890abcdef')
    })

    it('should redact fine-grained PATs (github_pat_)', () => {
      const pat = `github_pat_${'A'.repeat(40)}`
      const msg = `Using token: ${pat}`
      expect(sanitize(msg)).not.toContain(pat)
    })
  })

  // -- npm tokens --
  describe('npm tokens', () => {
    it('should redact npm tokens', () => {
      const token = `npm_${'A'.repeat(36)}`
      expect(sanitize(`Publishing with ${token}`)).not.toContain(token)
    })
  })

  // -- AWS --
  describe('AWS credentials', () => {
    it('should redact access keys starting with AKIA', () => {
      const key = `AKIA${'A'.repeat(16)}`
      expect(sanitize(`AWS key: ${key}`)).not.toContain(key)
    })

    it('should redact temporary credentials starting with ASIA', () => {
      const key = `ASIA${'B'.repeat(16)}`
      expect(sanitize(`Temp key: ${key}`)).not.toContain(key)
    })

    it('should redact AWS_SECRET_ACCESS_KEY values fully', () => {
      const msg = 'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
      expect(sanitize(msg)).not.toContain('wJalrXUtnFEMI')
      expect(sanitize(msg)).not.toContain('K7MDENG')
    })

    it('should redact aws_secret_access_key with colon separator', () => {
      const msg = 'aws_secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"'
      expect(sanitize(msg)).not.toContain('wJalrXUtnFEMI')
    })
  })

  // -- JWTs --
  describe('JWTs', () => {
    it('should redact JSON Web Tokens', () => {
      const jwt =
        'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
      expect(sanitize(`Token: ${jwt}`)).not.toContain(jwt)
    })
  })

  // -- Database URIs --
  describe('database connection strings', () => {
    it('should redact PostgreSQL connection strings', () => {
      const uri = 'postgresql://admin:s3cret@db.example.com:5432/mydb'
      expect(sanitize(`Connecting to ${uri}`)).not.toContain('admin:s3cret@')
    })

    it('should redact postgres:// connection strings', () => {
      expect(sanitize('postgres://user:pass@localhost/db')).not.toContain('user:pass@')
    })

    it('should redact MySQL connection strings', () => {
      expect(sanitize('mysql://root:password123@mysql.host.com:3306/app')).not.toContain(
        'root:password123@'
      )
    })

    it('should redact MongoDB connection strings', () => {
      expect(sanitize('mongodb://user:pass@mongo.example.com:27017/db')).not.toContain('user:pass@')
    })

    it('should redact MongoDB+srv connection strings', () => {
      expect(sanitize('mongodb+srv://admin:supersecret@cluster.mongodb.net/prod')).not.toContain(
        'admin:supersecret@'
      )
    })

    it('should redact MSSQL connection strings', () => {
      expect(sanitize('mssql://sa:password@db.host:1433/master')).not.toContain('sa:password@')
    })
  })

  // -- Private keys --
  describe('PEM private keys', () => {
    it('should redact RSA private keys', () => {
      const key =
        '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn\n-----END RSA PRIVATE KEY-----'
      expect(sanitize(`Found PEM: ${key}`)).not.toContain('MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn')
    })

    it('should redact DSA private keys', () => {
      const key = '-----BEGIN DSA PRIVATE KEY-----\nDATA\n-----END DSA PRIVATE KEY-----'
      expect(sanitize(key)).not.toContain('DATA')
    })

    it('should redact EC private keys', () => {
      const key = '-----BEGIN EC PRIVATE KEY-----\nDATA\n-----END EC PRIVATE KEY-----'
      expect(sanitize(key)).not.toContain('DATA')
    })

    it('should redact OPENSSH private keys', () => {
      const key = '-----BEGIN OPENSSH PRIVATE KEY-----\nDATA\n-----END OPENSSH PRIVATE KEY-----'
      expect(sanitize(key)).not.toContain('DATA')
    })

    it('should redact generic PKCS#8 private keys (no algorithm prefix)', () => {
      const key = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki\n-----END PRIVATE KEY-----'
      expect(sanitize(key)).not.toContain('MIIEvQIBADANBgkqhki')
    })

    it('should redact encrypted private keys', () => {
      const key = '-----BEGIN ENCRYPTED PRIVATE KEY-----\nDATA\n-----END ENCRYPTED PRIVATE KEY-----'
      expect(sanitize(key)).not.toContain('DATA')
    })
  })

  // -- URL credentials --
  describe('URL credentials', () => {
    it('should redact HTTP URLs with embedded credentials', () => {
      expect(sanitize('http://user:p4ssw0rd@example.com/api')).not.toContain('user:p4ssw0rd@')
    })

    it('should redact HTTPS URLs with embedded credentials', () => {
      expect(sanitize('Fetching https://admin:secret@internal.service.io/data')).not.toContain(
        'admin:secret@'
      )
    })

    it('should redact Redis URLs with credentials', () => {
      expect(sanitize('redis://default:mypassword@redis-host:6379')).not.toContain(
        'default:mypassword@'
      )
    })

    it('should redact AMQP URLs with credentials', () => {
      expect(sanitize('amqp://user:pass@rabbit:5672/vhost')).not.toContain('user:pass@')
    })

    it('should redact FTP URLs with credentials', () => {
      expect(sanitize('ftp://user:pass@ftp.example.com')).not.toContain('user:pass@')
    })
  })

  // -- GitLab PATs --
  describe('GitLab tokens', () => {
    it('should redact GitLab personal access tokens', () => {
      const token = `glpat-${'x'.repeat(20)}`
      expect(sanitize(`GitLab token: ${token}`)).not.toContain(token)
    })
  })

  // -- Bitbucket tokens --
  describe('Bitbucket tokens', () => {
    it('should redact Bitbucket app tokens', () => {
      const token = `ATBB${'A'.repeat(28)}`
      expect(sanitize(`Bitbucket: ${token}`)).not.toContain(token)
    })
  })

  // -- Google API keys --
  describe('Google API keys', () => {
    it('should redact Google API keys', () => {
      const key = `AIza${'x'.repeat(35)}`
      expect(sanitize(`Google key: ${key}`)).not.toContain(key)
    })
  })

  // -- Basic auth --
  describe('Basic auth headers', () => {
    it('should redact Authorization Basic headers', () => {
      expect(sanitize('Authorization: Basic dXNlcjpwYXNz')).not.toContain('dXNlcjpwYXNz')
    })

    it('should redact Authorization Basic headers with padding', () => {
      expect(sanitize('Authorization: Basic dXNlcjpwYXNzd29yZA==')).not.toContain(
        'dXNlcjpwYXNzd29yZA=='
      )
    })
  })

  // -- Slack tokens --
  describe('Slack tokens', () => {
    it('should redact bot tokens (xoxb-)', () => {
      const token = 'xoxb-123456789-abcdefghij'
      expect(sanitize(`Slack token: ${token}`)).not.toContain(token)
    })

    it('should redact app tokens (xoxa-)', () => {
      const token = 'xoxa-2-something-more'
      expect(sanitize(`Slack app token: ${token}`)).not.toContain(token)
    })

    it('should redact user tokens (xoxp-)', () => {
      const token = 'xoxp-user-token-value'
      expect(sanitize(`Slack: ${token}`)).not.toContain(token)
    })

    it('should redact refresh tokens (xoxr-)', () => {
      const token = 'xoxr-refresh-value-here'
      expect(sanitize(`Slack refresh: ${token}`)).not.toContain(token)
    })

    it('should redact session tokens (xoxs-)', () => {
      const token = 'xoxs-session-value-here'
      expect(sanitize(`Slack session: ${token}`)).not.toContain(token)
    })
  })

  // -- Slack webhook URLs --
  describe('Slack webhook URLs', () => {
    it('should redact Slack incoming webhook URLs', () => {
      const url = 'https://hooks.slack.com/services/T0123456/B0123456/abcdefghijklmnopqrstuvwx'
      expect(sanitize(`Webhook: ${url}`)).not.toContain(url)
    })
  })

  // -- Discord webhook URLs --
  describe('Discord webhook URLs', () => {
    it('should redact Discord webhook URLs', () => {
      const url = 'https://discord.com/api/webhooks/123456789012345678/abcdef-ABCDEF_123456'
      expect(sanitize(`Webhook: ${url}`)).not.toContain(url)
    })

    it('should redact legacy discordapp.com webhook URLs', () => {
      const url = 'https://discordapp.com/api/webhooks/123456789012345678/abcdef_123456'
      expect(sanitize(`Webhook: ${url}`)).not.toContain(url)
    })
  })

  // -- Stripe keys --
  describe('Stripe keys', () => {
    it('should redact live secret keys (sk-live-)', () => {
      const key = 'sk-live-abcdefghijklmnop'
      expect(sanitize(`Stripe key: ${key}`)).not.toContain(key)
    })

    it('should redact test secret keys (sk_test_)', () => {
      const key = 'sk_test_abcdefghijklmnop'
      expect(sanitize(`Stripe test: ${key}`)).not.toContain(key)
    })

    it('should redact live keys with underscore separator', () => {
      const key = 'sk_live_abcdefghijklmnop'
      expect(sanitize(`Stripe: ${key}`)).not.toContain(key)
    })

    it('should redact restricted keys (rk_live_)', () => {
      const key = 'rk_live_abcdefghijklmnop'
      expect(sanitize(`Stripe: ${key}`)).not.toContain(key)
    })

    it('should redact webhook signing secrets (whsec_)', () => {
      const secret = 'whsec_abcdefghijklmnopqrstuvwxyz'
      expect(sanitize(`Secret: ${secret}`)).not.toContain(secret)
    })
  })

  // -- Query params with secrets --
  describe('URL query parameter secrets', () => {
    it('should redact token in query string with ?', () => {
      const msg = 'https://api.example.com/data?token=abcdef1234567890'
      expect(sanitize(msg)).not.toContain('token=abcdef1234567890')
    })

    it('should redact key in query string with &', () => {
      const msg = 'https://api.example.com/data?foo=bar&key=mysupersecretkey'
      expect(sanitize(msg)).not.toContain('key=mysupersecretkey')
    })

    it('should redact secret in query string', () => {
      const msg = 'https://api.example.com?secret=topsecretvalue123'
      expect(sanitize(msg)).not.toContain('secret=topsecretvalue123')
    })

    it('should redact password in query string', () => {
      const msg = 'https://api.example.com?password=hunter2hunter2'
      expect(sanitize(msg)).not.toContain('password=hunter2hunter2')
    })
  })

  // -- Anthropic API keys --
  describe('Anthropic API keys', () => {
    it('should redact Anthropic API keys', () => {
      const key = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890ABCDEF-QRSTUVWX'
      expect(sanitize(`Key: ${key}`)).not.toContain(key)
    })
  })

  // -- OpenAI API keys --
  describe('OpenAI API keys', () => {
    it('should redact project-scoped keys (sk-proj-)', () => {
      const key = 'sk-proj-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ'
      expect(sanitize(`Key: ${key}`)).not.toContain(key)
    })

    it('should redact service account keys (sk-svcacct-)', () => {
      const key = 'sk-svcacct-abcdefghijklmnopqrstuvwxyz1234567890'
      expect(sanitize(`Key: ${key}`)).not.toContain(key)
    })
  })

  // -- SendGrid API keys --
  describe('SendGrid API keys', () => {
    it('should redact SendGrid API keys', () => {
      const key = 'SG.abcdefghijklmnopqrstuvwxyz.1234567890abcdefghijklmnopqrstuvwxyz'
      expect(sanitize(`Key: ${key}`)).not.toContain(key)
    })
  })

  // -- Vault tokens --
  describe('HashiCorp Vault tokens', () => {
    it('should redact service tokens (hvs.)', () => {
      const token = 'hvs.CAESIAbcdefghijklmnopqrstuvwxyz1234567890'
      expect(sanitize(`Token: ${token}`)).not.toContain(token)
    })

    it('should redact batch tokens (hvb.)', () => {
      const token = 'hvb.AAAAAQIAbcdefghijklmnopqrstuvwxyz'
      expect(sanitize(`Token: ${token}`)).not.toContain(token)
    })
  })

  // -- PyPI tokens --
  describe('PyPI tokens', () => {
    it('should redact PyPI API tokens', () => {
      const token = 'pypi-AgEIcHlwaS5vcmc-abcdefghijklmnopqrstuvwxyz1234567890'
      expect(sanitize(`Token: ${token}`)).not.toContain(token)
    })
  })

  // -- Multiple secrets in one message --
  it('should redact multiple different secrets in a single message', () => {
    const msg = 'Using ghp_tokenvalue123456 with Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZ1234'
    const result = sanitize(msg)
    expect(result).not.toContain('ghp_tokenvalue123456')
    expect(result).not.toContain('ABCDEFGHIJKLMNOPQRSTUVWXYZ1234')
  })

  // -- Idempotency --
  it('should be idempotent: sanitizing twice yields the same result', () => {
    const msg = 'Token: ghp_abcdef1234567890'
    const once = sanitize(msg)
    const twice = sanitize(once)
    expect(once).toBe(twice)
  })

  // -- Regex lastIndex reset --
  it('should handle global regex state correctly across successive calls', () => {
    const r1 = sanitize('ghp_firsttoken12345')
    const r2 = sanitize('ghp_secondtoken6789')
    expect(r1).toContain('[REDACTED]')
    expect(r2).toContain('[REDACTED]')
    expect(r2).not.toContain('ghp_secondtoken6789')
  })
})
