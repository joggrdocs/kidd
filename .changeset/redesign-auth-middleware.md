---
'@kidd-cli/core': major
---

Redesign auth middleware API

Rename `resolvers` to `strategies` across all auth types and functions. Remove bundled `auth({ http })` option in favor of standalone `http()` middleware. Add `login({ strategies })` override for interactive auth. Add `auth.headers()` factory for resolving auth headers from context. Add `auth.require()` enforcement gate middleware. Add `compose()` middleware combinator for merging multiple middleware into one.
