# Add a CLI Command

Add a new command to the kidd CLI end-to-end: handler, registration, and verification.

## Prerequisites

- Familiarity with the [CLI concepts](../concepts/cli.md) and [architecture](../concepts/architecture.md)
- The project builds successfully (`pnpm typecheck`)

## Steps

### 1. Create the command file

Create a new file in the commands directory. The filename becomes the command name (e.g., `check.ts` registers as the `check` command).

**With Zod args:**

```ts
import { command } from 'kidd'
import { z } from 'zod'

export default command({
  description: 'Validate all scripts can be imported',
  args: z.object({
    fix: z.boolean().optional(),
  }),
  handler: async (ctx) => {
    ctx.spinner.start('Validating scripts')

    if (ctx.args.fix) {
      ctx.output.write('Running with auto-fix enabled')
    }

    ctx.spinner.stop('Validation complete')
  },
})
```

**Without args:**

```ts
import { command } from 'kidd'

export default command({
  description: 'List available scripts',
  handler: async (ctx) => {
    ctx.output.table(scripts)
  },
})
```

**With subcommands:**

Create a directory with an `index.ts` for the parent command and individual files for each subcommand:

```
commands/
└── auth/
    ├── index.ts         # Parent command (optional handler)
    ├── login.ts         # "auth login" subcommand
    └── logout.ts        # "auth logout" subcommand
```

```ts
import { command, autoload } from 'kidd'

export default command({
  description: 'Auth commands',
  commands: autoload({ dir: './auth' }),
})
```

### 2. Register the command

Commands are auto-registered via the autoloader when placed in the commands directory. The autoloader discovers files that:

- Have a `.ts` or `.js` extension (not `.d.ts`)
- Do not start with `_` or `.`
- Export a default `Command` object (created by the `command()` factory)

No manual registration is needed.

### 3. Add lib functions if needed

If the command needs new shared logic, add it to `packages/kidd/src/lib/`. Follow existing patterns:

- Return `Result` tuples for operations that can fail
- Use Zod for runtime validation at boundaries
- Keep functions pure where possible

### 4. Write tests

Create `*.test.ts` files in the `test/` directory following the existing structure. Test the handler directly by constructing a mock context:

- Test the success path with valid args
- Test each failure path with expected errors
- Test Zod validation rejects invalid inputs

### 5. Verify

Run the full CI check suite:

```bash
pnpm lint && pnpm format && pnpm typecheck
```

## Verification

After completing all steps:

1. Run `pnpm typecheck` and confirm no errors
2. Run `pnpm test` and confirm all tests pass
3. Run `pnpm kidd <name> --help` and confirm the command appears
4. Run the command and verify the expected behavior

## Troubleshooting

### Command not appearing in help

**Issue:** The new command does not show up in `kidd --help`.

**Fix:** Ensure the file is in the commands directory, has a `.ts` or `.js` extension, does not start with `_` or `.`, and exports a default `Command` created by the `command()` factory.

### Zod validation fails at runtime

**Issue:** The handler receives a validation error for a valid-looking input.

**Fix:** Verify the Zod schema matches the expected args shape. Args are validated against the schema before the handler runs. Check that optional fields use `.optional()` and defaults use `.default()`.

### Handler not receiving expected context

**Issue:** Properties on `ctx` are missing or mistyped.

**Fix:** Verify the command uses `command()` from `kidd` (not a custom wrapper). Check that module augmentation interfaces (`KiddArgs`, `KiddConfig`, `KiddStore`) are correctly declared if using typed store keys or global args.

## References

- [CLI](../concepts/cli.md)
- [Architecture](../concepts/architecture.md)
- [Coding Style](../standards/typescript/coding-style.md)
- [Errors](../standards/typescript/errors.md)
