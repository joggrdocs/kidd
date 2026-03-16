# @kidd-cli/utils

Shared utilities for the kidd ecosystem. Provides functional programming helpers, filesystem operations, JSON handling, validation, and more.

## Installation

```bash
pnpm add @kidd-cli/utils
```

## Usage

### Result tuples

```ts
import { ok, err } from '@kidd-cli/utils'
import type { Result } from '@kidd-cli/utils'

function divide(a: number, b: number): Result<number> {
  if (b === 0) return err(new Error('Division by zero'))
  return ok(a / b)
}

const [error, value] = divide(10, 2)
```

### Validation

```ts
import { validate } from '@kidd-cli/utils'
import { z } from 'zod'

const schema = z.object({ name: z.string(), port: z.number() })
const [error, config] = validate(schema, input)
```

### JSON

```ts
import { jsonParse, jsonStringify } from '@kidd-cli/utils/json'

const [parseError, data] = jsonParse(rawString)
const [stringifyError, json] = jsonStringify(data, { pretty: true })
```

### Filesystem

```ts
import { fileExists } from '@kidd-cli/utils/fs'

const exists = await fileExists('/path/to/file')
```

### FP utilities

The `@kidd-cli/utils/fp` subpath re-exports all of `es-toolkit` and `ts-pattern` alongside kidd's Result helpers and predicates.

```ts
import { match, P, isString, pipe } from '@kidd-cli/utils/fp'
```

## Subpath exports

| Export                     | Description                              |
| -------------------------- | ---------------------------------------- |
| `@kidd-cli/utils`          | Core exports (Result, validate, fs, etc) |
| `@kidd-cli/utils/fp`       | es-toolkit + ts-pattern + Result helpers |
| `@kidd-cli/utils/fs`       | Filesystem utilities                     |
| `@kidd-cli/utils/json`     | JSON parse/stringify with Result tuples  |
| `@kidd-cli/utils/manifest` | package.json reader                      |
| `@kidd-cli/utils/redact`   | Sensitive data redaction                 |
| `@kidd-cli/utils/validate` | Zod schema validation                    |
| `@kidd-cli/utils/tag`      | Runtime type tagging                     |

## License

MIT -- [GitHub](https://github.com/joggrdocs/kidd)
