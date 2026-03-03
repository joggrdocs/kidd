---
paths:
  - '**/*.md'
  - '!CLAUDE.md'
  - '!.claude/**'
---

# Documentation Rules

## Principles

- **Succinct** — no fluff, get to the point
- **Actionable** — lead with what to do, not background
- **Scannable** — tables, headers, and lists over paragraphs
- **Consistent** — use the same structure across all documents

## Templates

Use the correct template based on document type. See `contributing/standards/documentation/writing.md` for full templates:

| Type | Structure | Title Convention |
|---|---|---|
| Standard | Overview > Rules > Resources > References | Noun phrase |
| Guide | Prerequisites > Steps > Verification > Troubleshooting | Starts with verb |
| Overview | Architecture > Key Concepts > Usage > Configuration | Topic name |
| Troubleshooting | Issue sections with Fix blocks | "Domain Troubleshooting" |

## Sections

- **Resources** — external URLs only
- **References** — internal relative links only
- Never mix external and internal links in the same section

## Formatting

- Code examples: minimal snippets showing the pattern, not full files
- Specify language on all fenced code blocks (```ts, ```bash, etc.)
- Use tables for structured comparisons (Correct vs Incorrect, options, conventions)
- Prefer relative links for internal docs, full URLs for external

## Diagrams

- Use Mermaid with Catppuccin Mocha theme
- See `contributing/standards/documentation/diagrams.md` for color palette and conventions
