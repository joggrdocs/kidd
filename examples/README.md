# Examples

Reference implementations demonstrating how to build CLIs with kidd.

## Simple

A multi-command CLI with Zod-typed args, structured output, and interactive prompts. No middleware, no auth -- just commands.

```
examples/simple/
├── index.ts                 # CLI entry point
└── commands/
    ├── greet.ts             # Greeting command with args
    ├── list.ts              # List command with table output
    └── init.ts              # Interactive scaffolding command
```

## Advanced

A production-style CLI with custom middleware, OAuth authentication, config loading, and credentials. Demonstrates the full middleware pipeline, auth provider setup, and module augmentation.

```
examples/advanced/
├── index.ts                 # CLI entry point with middleware and auth
├── register.ts              # Module augmentation for typed store/config
├── provider.ts              # OAuth provider configuration
├── middleware/
│   ├── timing.ts            # Request timing middleware
│   └── telemetry.ts         # Analytics/telemetry middleware
└── commands/
    ├── whoami.ts             # Display authenticated user info
    ├── status.ts             # Project status with config access
    └── deploy/
        ├── index.ts          # Deploy parent command
        ├── preview.ts        # Deploy preview subcommand
        └── production.ts     # Deploy production subcommand
```
