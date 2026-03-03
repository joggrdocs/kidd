# Pull Request Standards

## Overview

Standards for creating, reviewing, and merging pull requests. All pull requests must pass CI checks, receive at least one approving review, have no unresolved blocking comments, include tests for new features, and update documentation as needed. These rules keep the main branch stable and the review process predictable.

## Rules

### Write Clear PR Titles

Use the same `type(scope): description` format as commit messages. The title should be a concise summary of the change.

#### Correct

```
feat(runtime): add parallel script execution
fix(config): resolve nested workspace discovery
docs: update CLI usage guide
```

#### Incorrect

```
fix stuff
update code
WIP changes
```

### Write Complete PR Descriptions

Follow a consistent description structure so reviewers can quickly understand the change, verify it, and trace it back to an issue.

#### Correct

```markdown
## Summary

Brief description of changes (2-3 sentences).

## Changes

- Bullet list of specific changes
- What was added/fixed/changed
- Key files modified

## Testing

How to test these changes:

1. Step-by-step testing instructions
2. Expected behavior
3. Edge cases covered

## Related Issues

Closes #123
Refs #456
```

### Follow Review Process

Authors and reviewers share responsibility for keeping PRs moving. Authors self-review before requesting feedback and respond within 24 hours. Reviewers provide constructive, timely reviews within 24-48 hours.

Use this checklist when reviewing:

| Category          | Items                                                     |
| ----------------- | --------------------------------------------------------- |
| **Functionality** | Works as intended, handles edge cases, no regressions     |
| **Code Quality**  | Readable, maintainable, follows patterns, DRY             |
| **Security**      | Input validation, auth checks, no sensitive data leaks    |
| **Performance**   | No obvious bottlenecks, efficient queries, proper caching |
| **Tests**         | Adequate coverage, tests pass, tests are meaningful       |
| **Documentation** | Code comments where needed, docs updated, clear naming    |

### Use Squash and Merge

All PRs use **Squash and Merge** as the merge strategy. This combines all commits into one, keeps main branch history clean, and preserves the PR discussion link.

Before merging, verify:

1. All CI checks pass
2. At least one approval
3. No unresolved comments
4. Branch is up to date with main

## References

- [Commit Standards](./git-commits.md)
