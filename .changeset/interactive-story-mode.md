---
'@kidd-cli/core': minor
---

feat(core): add interactive mode and declarative key binding hooks

Adds interactive mode to the stories viewer, giving story components full terminal control with the header and sidebar hidden. Press `i` to enter interactive mode and double-press `Esc` to exit.

Introduces reusable key handling primitives:

- **keys.ts**: shared key vocabulary, pattern parser, and normalizer for Ink's `useInput`
- **useKeyBinding**: declarative keymap hook supporting single keys, modifier combos, and multi-key sequences
- **useKeyInput**: enhanced raw input hook with normalized key events
