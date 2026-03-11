---
'@kidd-cli/core': minor
---

Add optional credential validation before persistence in auth middleware

Add `ValidateCredential` callback type and optional `validate` field on `AuthOptions` (default for all logins) and `LoginOptions` (per-call override). When provided, the callback runs between strategy resolution and `store.save()` — if validation fails the credential is never persisted and a `validation_failed` error is returned. The callback may also transform or enrich the credential before it is saved.
