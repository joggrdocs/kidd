---
'@kidd-cli/core': minor
'@kidd-cli/cli': minor
---

### Stories Viewer Enhancements

#### `--out` Option

Render stories to stdout with `kidd stories --out`. Supports `Group/Variant` filter format to target a specific story (e.g. `kidd stories --out "StatusBadge/Error"`). Useful for CI snapshots and scripted output.

#### `--check` Flag

Validate stories for common issues with `kidd stories --check`. Enforces a maximum of 6 editable fields per story and runs prop validation against the Zod schema. Reports diagnostics using the new screen-backed `ctx.report` interface.

#### Sidebar Improvements

- **Toggle visibility**: press `b` to hide/show the sidebar for a borderless full-width preview
- **Collapsed by default**: sidebar groups start collapsed with folder icons for cleaner navigation

#### `defaults` Field

`stories()` now accepts a `defaults` record for non-editable fixed context props. Values in `defaults` are merged into the rendered component but do not appear in the props editor, keeping the editor focused on the fields that matter.

#### Editable Field Limit

Stories are limited to 6 editable fields. Excess fields should be moved to `defaults`. The `--check` flag validates this constraint.
