# Current OAuth Implementation

> Updated after replacing the non-standard direct-token-POST flow with spec-compliant resolvers.

## Overview

The auth middleware now supports two spec-compliant OAuth flows:

1. **`oauth`** -- OAuth 2.0 Authorization Code + PKCE (RFC 7636 + RFC 8252)
2. **`device-code`** -- OAuth 2.0 Device Authorization Grant (RFC 8628)

The previous non-standard flow (direct token delivery via POST to a local server) has been removed entirely.

## OAuth Authorization Code + PKCE

```
CLI                         Browser / Auth Server
 |                                   |
 | 1. Generate code_verifier         |
 | 2. Derive code_challenge (S256)   |
 | 3. Generate state nonce           |
 | 4. Start local HTTP server        |
 |    on 127.0.0.1:<port>            |
 |                                   |
 | 5. Open browser ----------------->|
 |    authUrl?response_type=code     |
 |          &client_id=...           |
 |          &redirect_uri=...        |
 |          &code_challenge=...      |
 |          &code_challenge_method=S256
 |          &state=...               |
 |          &scope=...               |
 |                                   |
 |    User authenticates in browser  |
 |                                   |
 | 6. GET /callback?code=...&state=..|
 |    <------------------------------|
 |                                   |
 | 7. Validate state nonce           |
 | 8. POST to tokenUrl               |
 |    grant_type=authorization_code  |
 |    code=...                       |
 |    redirect_uri=...               |
 |    client_id=...                  |
 |    code_verifier=...              |
 |                                   |
 | 9. Receive access_token           |
 | 10. Return bearer credential      |
```

### Configuration

From `types.ts`:

```typescript
interface OAuthSourceConfig {
  readonly source: 'oauth'
  readonly clientId: string
  readonly authUrl: string
  readonly tokenUrl: string
  readonly scopes?: readonly string[]
  readonly port?: number
  readonly callbackPath?: string
  readonly timeout?: number
}
```

## Device Authorization Grant (RFC 8628)

```
CLI                         Auth Server              User (Browser)
 |                                |                        |
 | 1. POST deviceAuthUrl -------->|                        |
 |    client_id, scope            |                        |
 |                                |                        |
 | 2. Receive device_code, -------|                        |
 |    user_code, verification_uri |                        |
 |                                |                        |
 | 3. Display verification_uri    |                        |
 |    and user_code to user       |                        |
 |                                |                        |
 | 4. Open browser (optional) ----|----------------------->|
 |                                |                        |
 |                                |    User enters code -->|
 |                                |    and authorizes      |
 |                                |                        |
 | 5. Poll tokenUrl ------------->|                        |
 |    grant_type=device_code      |                        |
 |    device_code, client_id      |                        |
 |                                |                        |
 |    authorization_pending       |                        |
 |    (repeat poll)               |                        |
 |                                |                        |
 | 6. Receive access_token -------|                        |
 | 7. Return bearer credential    |                        |
```

### Configuration

From `types.ts`:

```typescript
interface DeviceCodeSourceConfig {
  readonly source: 'device-code'
  readonly clientId: string
  readonly deviceAuthUrl: string
  readonly tokenUrl: string
  readonly scopes?: readonly string[]
  readonly pollInterval?: number
  readonly timeout?: number
}
```

## Security Measures

| Measure                | Implementation                                     | Flow  |
| ---------------------- | -------------------------------------------------- | ----- |
| PKCE (S256)            | `code_verifier` + `code_challenge`                 | oauth |
| State nonce (CSRF)     | `randomBytes(32).toString('hex')`                  | oauth |
| Localhost binding      | Server listens on `127.0.0.1` only                 | oauth |
| Timeout                | Configurable flow timeout with cleanup             | both  |
| GET redirect only      | Authorization code via query params (no POST body) | oauth |
| Token via back-channel | Code exchanged server-to-server at token endpoint  | both  |

## What Changed from the Previous Implementation

| Aspect           | Old Flow                      | New Flow (PKCE)                   |
| ---------------- | ----------------------------- | --------------------------------- |
| Token delivery   | Direct POST to local server   | GET redirect with auth code       |
| Token exchange   | None (auth server handled it) | CLI exchanges code at tokenUrl    |
| PKCE             | Not applicable                | S256 code_challenge/code_verifier |
| Config fields    | `authUrl` only                | `clientId`, `authUrl`, `tokenUrl` |
| Interoperability | Non-standard                  | RFC 7636 + RFC 8252 compliant     |

## Files

| File                                                       | Role                     |
| ---------------------------------------------------------- | ------------------------ |
| `packages/core/src/middleware/auth/oauth-shared.ts`        | Shared OAuth utilities   |
| `packages/core/src/middleware/auth/resolve-oauth.ts`       | PKCE flow implementation |
| `packages/core/src/middleware/auth/resolve-device-code.ts` | Device code flow         |
| `packages/core/src/middleware/auth/types.ts`               | Type definitions         |
| `packages/core/src/middleware/auth/constants.ts`           | Default values           |
| `packages/core/src/middleware/auth/resolve-credentials.ts` | Resolver dispatcher      |
