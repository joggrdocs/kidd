# Clerk PKCE Support

> Research on Clerk's OAuth 2.0 PKCE capabilities

## Clerk as an OAuth 2.0 Identity Provider

Clerk can act as an OAuth 2.0 / OpenID Connect Identity Provider (IdP). When configured this way, external applications authenticate users through Clerk using standard OAuth flows.

Clerk supports two client types for OAuth applications:

| Client Type  | Authentication Method | PKCE     |
| ------------ | --------------------- | -------- |
| Confidential | `client_secret`       | Optional |
| Public       | PKCE only (no secret) | Required |

### Public Clients

When an OAuth app is marked as **Public** in the Clerk Dashboard:

- The app **cannot store a `client_secret`** — this matches the CLI use case
- Only the **Authorization Code flow with PKCE** is allowed
- Public clients cannot be converted to confidential clients (or vice versa)

This is the relevant mode for CLI tools, which are public clients by definition.

### Clerk OAuth Endpoints

When Clerk acts as the IdP, the standard endpoints are:

| Endpoint       | Path                                                      |
| -------------- | --------------------------------------------------------- |
| Authorization  | `https://<clerk-domain>/oauth/authorize`                  |
| Token          | `https://<clerk-domain>/oauth/token`                      |
| UserInfo       | `https://<clerk-domain>/oauth/userinfo`                   |
| OIDC Discovery | `https://<clerk-domain>/.well-known/openid-configuration` |

### PKCE Flow with Clerk

1. CLI generates `code_verifier` and `code_challenge`
2. CLI opens browser to Clerk's `/oauth/authorize` with:
   - `response_type=code`
   - `client_id=<app_id>`
   - `redirect_uri=http://127.0.0.1:<port>/callback`
   - `code_challenge=<challenge>`
   - `code_challenge_method=S256`
   - `state=<nonce>`
3. User authenticates in browser
4. Clerk redirects to `redirect_uri` with `?code=<auth_code>&state=<nonce>`
5. CLI exchanges the code at `/oauth/token` with:
   - `grant_type=authorization_code`
   - `code=<auth_code>`
   - `redirect_uri=http://127.0.0.1:<port>/callback`
   - `client_id=<app_id>`
   - `code_verifier=<verifier>`
6. Clerk validates `SHA256(code_verifier) == stored code_challenge`
7. Clerk returns the access token (and optionally ID token, refresh token)

## Custom OAuth Providers with PKCE

As of [November 2025](https://clerk.com/changelog/2025-11-12-pkce-support-custom-oauth), Clerk also supports PKCE when connecting to **custom OAuth providers** as social connections (Clerk as the relying party, not the IdP). This is relevant if your CLI users authenticate through a third-party OAuth provider configured in Clerk.

## Device Authorization Grant (RFC 8628)

Clerk does **not** support the OAuth 2.0 Device Authorization Grant (RFC 8628). This flow requires a dedicated device authorization endpoint, which Clerk does not provide. For headless/browserless CLI environments authenticating against Clerk, alternative approaches include:

- Using the PKCE flow with a manually copied authorization URL
- Using the `prompt` resolver as a fallback for manual token entry
- Using an environment variable (`env` resolver) with a pre-generated token

## References

- [How Clerk implements OAuth](https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth)
- [Clerk as an Identity Provider](https://clerk.com/docs/advanced-usage/clerk-idp)
- [PKCE support for custom OAuth providers (Changelog)](https://clerk.com/changelog/2025-11-12-pkce-support-custom-oauth)
- [OAuth and OIDC overview](https://clerk.com/docs/guides/configure/auth-strategies/oauth/overview)
