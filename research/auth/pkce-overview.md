# PKCE (Proof Key for Code Exchange)

> RFC 7636 — OAuth 2.0 extension for public clients

## What is PKCE?

PKCE (pronounced "pixy") is a security extension to the OAuth 2.0 Authorization Code flow, defined in [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636). It protects public clients (native apps, CLIs, SPAs) against **authorization code interception attacks** — where an attacker intercepts the authorization code during the redirect and exchanges it for a token before the legitimate client can.

PKCE was originally designed for mobile and native apps that cannot securely store a `client_secret`. As of OAuth 2.1, PKCE is **mandatory for all authorization code flows**, including confidential clients.

## The Problem PKCE Solves

In the standard Authorization Code flow:

1. Client redirects user to the authorization server
2. User authenticates and consents
3. Authorization server redirects back with an **authorization code**
4. Client exchanges the code for a token at the token endpoint

The vulnerability is in step 3 — the authorization code travels through the browser redirect. A malicious app on the same device, a compromised browser extension, or a network attacker could intercept this code. Without PKCE, anyone with the code (and the `client_secret`, which is often extractable from public clients) can exchange it for a token.

## How PKCE Works

PKCE adds a cryptographic proof that binds the authorization request to the token exchange request.

### Flow

```
Client                              Authorization Server
  |                                         |
  |  1. Generate code_verifier (random)     |
  |  2. Derive code_challenge = SHA256(v)   |
  |                                         |
  |--- Authorization Request -------------->|
  |    + code_challenge                     |
  |    + code_challenge_method=S256         |
  |                                         |
  |<-- Authorization Code ------------------|
  |                                         |
  |--- Token Request ---------------------->|
  |    + authorization_code                 |
  |    + code_verifier                      |
  |                                         |
  |    Server: SHA256(code_verifier)        |
  |            == stored code_challenge?    |
  |                                         |
  |<-- Access Token (if match) -------------|
```

### Parameters

| Parameter               | Sent In               | Value                                     |
| ----------------------- | --------------------- | ----------------------------------------- |
| `code_verifier`         | Token request         | Random URL-safe string, 43-128 characters |
| `code_challenge`        | Authorization request | `BASE64URL(SHA256(code_verifier))`        |
| `code_challenge_method` | Authorization request | `S256` (plain is allowed but discouraged) |

### Implementation Steps

#### 1. Generate code_verifier

A cryptographically random, URL-safe string between 43 and 128 characters:

```typescript
import { randomBytes } from 'node:crypto'

const codeVerifier = randomBytes(32).toString('base64url')
```

#### 2. Derive code_challenge

SHA-256 hash of the verifier, Base64url-encoded (no padding):

```typescript
import { createHash } from 'node:crypto'

const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
```

#### 3. Include in authorization request

```
GET /authorize?
  response_type=code&
  client_id=CLIENT_ID&
  redirect_uri=REDIRECT_URI&
  code_challenge=CODE_CHALLENGE&
  code_challenge_method=S256&
  state=STATE_NONCE
```

#### 4. Include verifier in token exchange

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTHORIZATION_CODE&
redirect_uri=REDIRECT_URI&
client_id=CLIENT_ID&
code_verifier=CODE_VERIFIER
```

## Security Properties

- **Code interception resistance** — an attacker who intercepts the authorization code cannot exchange it without the `code_verifier`, which never leaves the client
- **One-time use** — each flow uses a unique `code_verifier`, so a compromised value cannot be reused
- **No shared secrets** — unlike `client_secret`, the verifier is generated per-session and never registered with the server

## PKCE vs. State Parameter

| Concern           | State parameter | PKCE              |
| ----------------- | --------------- | ----------------- |
| CSRF protection   | Yes             | No (not its role) |
| Code interception | No              | Yes               |
| Replay prevention | No              | Yes               |

PKCE and `state` are complementary — use both.

## References

- [RFC 7636 — Proof Key for Code Exchange](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 for Native Apps (RFC 8252)](https://datatracker.ietf.org/doc/html/rfc8252)
- [OAuth 2.1 Draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-07)
- [Auth0 — Authorization Code Flow with PKCE](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce)
- [oauth.net — PKCE](https://oauth.net/2/pkce/)
