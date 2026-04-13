# Core

API reference for `@kidd-cli/core`. The runtime framework for building CLI applications with typed commands, middleware pipelines, and terminal UI.

## JavaScript API

| Function                        | Description                                       |
| ------------------------------- | ------------------------------------------------- |
| [command()](../framework/command)       | Define a command with typed options and a handler |
| [middleware()](../framework/middleware) | Define middleware that wraps command execution    |
| [cli()](../framework/bootstrap)         | Bootstrap and run a CLI application               |
| [screen()](../framework/screen)         | Define a screen command with a React/Ink render   |
| [report()](../middleware/report)         | Structured reporting middleware for diagnostics   |

## Core types

| Reference               | Description                                                 |
| ----------------------- | ----------------------------------------------------------- |
| [Context](../framework/context) | The central object threaded through handlers and middleware |

## Resources

- [yargs](https://yargs.js.org)
- [Zod](https://zod.dev)
- [@clack/prompts](https://www.clack.cc)
- [Ink](https://github.com/vadimdemedes/ink)
