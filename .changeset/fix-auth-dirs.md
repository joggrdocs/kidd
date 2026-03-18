---
'@kidd-cli/core': minor
---

Add `DirsConfig` option to `cli()` for configuring separate local and global directory names, and fix auth dir mismatch where `login()`/`logout()` hardcoded the store directory while `credential()` respected `auth.file({ dirName })` overrides.
