# Contributing

Welcome to the kidd contributing docs. This directory contains standards, templates, and guides for working in this codebase.

## How to Use

- **Standards** define the rules -- read the relevant standard before writing code or docs.
- **Concepts** explain the "what" and "why" behind key architectural decisions.
- **Guides** are step-by-step walkthroughs for common tasks.

## Table of Contents

### Standards

#### TypeScript

- [Naming](./standards/typescript/naming.md) -- File, variable, and property naming conventions
- [Functions](./standards/typescript/functions.md) -- Object parameters, JSDoc, pure functions
- [Design Patterns](./standards/typescript/design-patterns.md) -- Functional patterns, factories, composition
- [Coding Style](./standards/typescript/coding-style.md) -- Formatting, naming conventions, code organization
- [State](./standards/typescript/state.md) -- Immutability, state encapsulation, data flow
- [Conditionals](./standards/typescript/conditionals.md) -- ts-pattern, branching logic
- [Types](./standards/typescript/types.md) -- Discriminated unions, branded types, type patterns
- [Errors](./standards/typescript/errors.md) -- Result type, error handling
- [Utilities](./standards/typescript/utilities.md) -- es-toolkit reference
- [Testing](./standards/typescript/testing.md) -- Test structure, mocking, coverage
- [Components](./standards/typescript/components.md) -- React/Ink component patterns for screen commands
- [Middleware](./standards/typescript/middleware.md) -- Middleware factory patterns and conventions

#### Git

- [Commits](./standards/git-commits.md) -- Commit message format and conventions
- [Pull Requests](./standards/git-pulls.md) -- PR creation, review, and merge process

#### Documentation

- [Writing](./standards/documentation/writing.md) -- Writing standards and templates
- [Formatting](./standards/documentation/formatting.md) -- Code examples, tables, markdown
- [Diagrams](./standards/documentation/diagrams.md) -- Mermaid diagram standards

### Concepts

- [Architecture](./concepts/architecture.md) -- Package ecosystem, system layers, context, data flow
- [CLI](./concepts/cli.md) -- Commands, middleware, context, autoloading, error flow
- [Tech Stack](./concepts/tech-stack.md) -- Tools, libraries, and version requirements

### Guides

- [Getting Started](./guides/getting-started.md) -- Local setup, reading order, Claude Code configuration
- [Developing a Feature](./guides/developing-a-feature.md) -- Branch, code, test, changeset, PR, merge
- [Adding a CLI Command](./guides/adding-a-cli-command.md) -- End-to-end walkthrough for new commands
- [Creating Middleware](./guides/creating-middleware.md) -- How to add a new built-in middleware
- [Adding a Package](./guides/adding-a-package.md) -- How to create a new monorepo package
- [Release and Publish](./guides/release-and-publish.md) -- Changeset workflow and npm publishing

## Reading Order

**New contributors:**

1. [Getting Started](./guides/getting-started.md) -- set up your local environment
2. [Architecture](./concepts/architecture.md) -- understand the package structure and data flow
3. [CLI](./concepts/cli.md) -- learn how commands, middleware, and context work

**Before writing code:**

1. [Coding Style](./standards/typescript/coding-style.md) -- the non-negotiable rules
2. The relevant standard for your area (naming, types, functions, errors, etc.)

**Before committing:**

1. [Commits](./standards/git-commits.md) -- commit message format
2. [Pull Requests](./standards/git-pulls.md) -- PR creation and review
