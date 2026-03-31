---
'@kidd-cli/core': minor
---

Replace implicit input gating with explicit `PromptProps` (`focused`, `disabled`)

- Add `PromptProps` interface with `focused` and `disabled` fields, shared by all prompt components
- Remove `InputBlock` / `useInputBlock` context-based input gating
- Remove `useFocus` from all prompt components (was conflicting with Tabs key interception)
- Remove `@inkjs/ui` dependency (no longer needed)
- Rename `isDisabled` to `disabled` across all prompts and stories
- Stories viewer passes `focused` explicitly to story components in preview mode
- `useInput` wrapper simplified to a direct proxy of ink's `useInput`
