# Documentation Writing Standards

## Overview

Standards for writing clear, actionable documentation. Every document should be succinct, scannable, and consistent so contributors can find answers quickly without wading through prose. These rules apply to all markdown files in the repository.

## Rules

### Follow Core Principles

All documentation must follow these principles:

- **Succinct** - No fluff, get to the point
- **Actionable** - Lead with what to do, not background
- **Scannable** - Tables, headers, and lists over paragraphs
- **Consistent** - Use the same structure and formatting across all documents
- **Audience-first** - Write for the reader, not the writer

### Use the Standards Document Template

All standards documents must follow this canonical outline:

```markdown
# Standard Title

## Overview

What this standard covers, when it applies, and why it matters.

## Rules

### Rule Name

Description of the rule.

#### Correct

...example...

#### Incorrect

...example...

## Resources

- [External link](https://...)

## References

- [Related standard](./other.md)
```

Section details:

- **Overview** - A single paragraph (2-4 sentences) describing what the standard covers, when it applies, and why it matters.
- **Rules** - Each `### Rule Name` gets a description, then optionally `#### Correct` and `#### Incorrect` subsections with examples.
- **Resources** - External links only. Omit this section if there are none.
- **References** - Internal links to related standards documents.

### Use the Guide Template

Guides provide step-by-step instructions for completing a task.

- Title starts with a verb (Add, Create, Setup, Run, Debug, Write, Configure)
- Steps are numbered
- Include Prerequisites, Verification, and Troubleshooting sections
- Link to reference docs for detailed options

````markdown
# Action Title

Brief one-line description of what this guide accomplishes.

## Prerequisites

- Requirement 1
- Requirement 2

## Steps

### 1. First Step

Brief explanation of this step.

```bash
command here
```

### 2. Second Step

Brief explanation.

```ts
// Code example if needed
```

## Verification

How to verify the task completed successfully:

```bash
verification-command
```

## Troubleshooting

### Common Issue Name

**Issue:** Brief description of problem

**Fix:**

```bash
solution-command
```

## References

- [Related Doc 1](../path/to/doc.md)
- [External Resource](https://example.com)
````

### Use the Overview Template

Overviews provide a conceptual introduction to a topic.

- Explain "what" and "why" briefly
- Show "how" with focused examples
- Include architecture diagram if applicable
- Link to guides for step-by-step instructions

````markdown
# Topic Name

Brief one-line description of the topic.

## Architecture

High-level architectural overview (diagram if applicable).

## Key Concepts

### Concept 1

Explanation with minimal example.

## Usage

### Basic Usage

```ts
// Focused example
```

## Configuration

| Option    | Type      | Default     | Description      |
| --------- | --------- | ----------- | ---------------- |
| `option1` | `string`  | `"default"` | What it does     |
| `option2` | `boolean` | `false`     | What it controls |

## References

- [Related Guide](../../guides/related-guide.md)
- [External Docs](https://example.com)
````

### Use the Troubleshooting Template

Troubleshooting documents list common issues and fixes.

- H2 is the issue (linkable via anchor)
- Keep fixes short -- command or 1-2 sentences
- No background explanations
- Include exact error messages when applicable

**Issue Naming:**

| Good                        | Bad                 |
| --------------------------- | ------------------- |
| `Connection refused`        | `Database problems` |
| `Module not found: @pkg/ai` | `Import errors`     |
| `Authentication failed`     | `Login issues`      |

````markdown
# Domain Troubleshooting

Common issues and fixes for [domain].

## Issue Name

Brief symptoms description (1 line).

**Fix:**

```bash
solution-command
```

## Error: Specific Error Message

When you see this error:

```
Error: Something went wrong
```

**Fix:** Explanation or command.
````

### Include Common Sections Correctly

Add these sections to any document as needed:

- **Resources** - Link to external documentation at the end of a document. Contains only external URLs.
- **References** - Link to related internal standards or documentation. Contains only relative links to other files in the repository.

#### Correct

```markdown
## Resources

- [pnpm Documentation](https://pnpm.io/cli/install)
- [Turborepo Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)

## References

- [Formatting Standards](./formatting.md)
- [Diagram Standards](./diagrams.md)
```

#### Incorrect

```markdown
## Resources

- [Formatting Standards](./formatting.md)

## References

- [pnpm Documentation](https://pnpm.io/cli/install)
```

## References

- [Formatting Standards](./formatting.md)
- [Diagram Standards](./diagrams.md)
