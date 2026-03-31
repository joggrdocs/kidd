# .zpress

This directory is managed by zpress. It contains the
materialized documentation site — synced content, build artifacts, and static assets.

| Directory  | Description                                |
| ---------- | ------------------------------------------ |
| `content/` | Synced markdown pages and generated config |
| `public/`  | Static assets (logos, icons, banners)      |
| `dist/`    | Build output                               |
| `cache/`   | Build cache                                |

## Commands

```bash
zpress sync    # Sync docs into content/
zpress dev     # Start dev server
zpress build   # Build static site
```

> **Do not edit files in `content/`** — they are regenerated on every sync.
> Edit the source markdown in your workspace packages instead.
