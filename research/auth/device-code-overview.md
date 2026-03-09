# Device Authorization Grant (RFC 8628) Overview

> Research on the OAuth 2.0 Device Authorization Grant for CLI authentication.

## Summary

[RFC 8628](https://tools.ietf.org/html/rfc8628) defines a flow for devices that have limited input capabilities or lack a browser. The device displays a URL and a short code; the user visits the URL on another device and enters the code to authorize.

This is a natural fit for CLI tools running in headless environments (SSH sessions, containers, CI).

## Flow

```
1. Device requests authorization
   POST /device/code
   client_id=...&scope=...

2. Server responds with:
   {
     "device_code": "...",
     "user_code": "ABCD-1234",
     "verification_uri": "https://example.com/activate",
     "expires_in": 900,
     "interval": 5
   }

3. Device displays to user:
   "Open https://example.com/activate and enter code: ABCD-1234"

4. Device polls token endpoint:
   POST /token
   grant_type=urn:ietf:params:oauth:grant-type:device_code
   device_code=...&client_id=...

5. Server responds with error or token:
   - { "error": "authorization_pending" }  -> keep polling
   - { "error": "slow_down" }              -> increase interval by 5s
   - { "error": "expired_token" }          -> stop, flow expired
   - { "error": "access_denied" }          -> stop, user denied
   - { "access_token": "..." }             -> success
```

## Error Codes

| Code                    | Action                            |
| ----------------------- | --------------------------------- |
| `authorization_pending` | Continue polling at same interval |
| `slow_down`             | Increase interval by 5 seconds    |
| `expired_token`         | Abort -- device code expired      |
| `access_denied`         | Abort -- user denied access       |

## Provider Compatibility

| Provider | Supported | Device Auth Endpoint                                                |
| -------- | --------- | ------------------------------------------------------------------- |
| GitHub   | Yes       | `https://github.com/login/device/code`                              |
| Azure AD | Yes       | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/devicecode` |
| Google   | Yes       | `https://oauth2.googleapis.com/device/code`                         |
| Clerk    | No        | N/A -- no device authorization endpoint                             |
| Auth0    | Yes       | `https://{domain}/oauth/device/code`                                |
| Okta     | Yes       | `https://{domain}/oauth2/v1/device/authorize`                       |

## Key Considerations

- **Interval**: The server may provide an `interval` field (in seconds) indicating the minimum polling delay. If not provided, clients should default to 5 seconds.
- **Expires**: The `expires_in` field indicates how long the device code is valid. Clients should stop polling after this period.
- **User code format**: Typically a short alphanumeric string with a separator (e.g., `ABCD-1234`). Easy to type on a phone or separate device.
- **No PKCE**: Device code flow does not use PKCE -- the device code itself serves as the binding between the authorization request and the token request.
- **No redirect URI**: Unlike the authorization code flow, there is no redirect. The user manually enters the code.

## References

- [RFC 8628 -- OAuth 2.0 Device Authorization Grant](https://tools.ietf.org/html/rfc8628)
- [GitHub Device Flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow)
- [Microsoft Identity Platform Device Code Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code)
