---
'@kidd-cli/core': patch
---

Harden auth middleware against insecure transport and injection

Enforce HTTPS on OAuth endpoint URLs (authUrl, tokenUrl, deviceAuthUrl) per RFC 8252 §8.3, allowing HTTP only for loopback addresses used during local redirect flows. Resolvers now return null for non-secure URLs.

Escape `cmd.exe` metacharacters (`&`, `|`, `<`, `>`, `^`) in URLs passed to `cmd /c start` on Windows to prevent command injection via query strings.

Remove redundant `existsSync` check in `loadFromPath` to eliminate a TOCTOU race condition, matching the pattern already used in the dotenv resolver.
