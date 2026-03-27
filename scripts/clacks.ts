import * as clack from '@clack/prompts'
import { lauf, z } from 'laufen'
import { match } from 'ts-pattern'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Example {
  readonly name: string
  readonly description: string
  readonly run: () => Promise<void>
}

interface Command {
  readonly name: string
  readonly description: string
  readonly examples: readonly Example[]
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const COMMANDS: readonly Command[] = [
  // -- text -----------------------------------------------------------------
  {
    name: 'text',
    description: 'Free-text input prompt',
    examples: [
      {
        name: 'basic',
        description: 'Simple text input with a message',
        async run() {
          const value = await clack.text({ message: 'What is your name?' })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`You entered: ${value}`)
        },
      },
      {
        name: 'placeholder',
        description: 'Text input with placeholder text',
        async run() {
          const value = await clack.text({
            message: 'Enter a project name',
            placeholder: 'my-awesome-project',
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Project: ${value}`)
        },
      },
      {
        name: 'default-value',
        description: 'Text input with a default value',
        async run() {
          const value = await clack.text({
            message: 'Enter output directory',
            defaultValue: './dist',
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Output dir: ${value}`)
        },
      },
      {
        name: 'initial-value',
        description: 'Text input pre-filled with an initial value',
        async run() {
          const value = await clack.text({
            message: 'Edit the greeting',
            initialValue: 'Hello, world!',
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Greeting: ${value}`)
        },
      },
      {
        name: 'validate',
        description: 'Text input with validation',
        async run() {
          const value = await clack.text({
            message: 'Enter an email address',
            placeholder: 'user@example.com',
            validate(input) {
              if (input === undefined || input.length === 0) {
                return 'Email is required'
              }
              if (!input.includes('@')) {
                return 'Must be a valid email'
              }
              return undefined
            },
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Email: ${value}`)
        },
      },
    ],
  },

  // -- password -------------------------------------------------------------
  {
    name: 'password',
    description: 'Masked password input prompt',
    examples: [
      {
        name: 'basic',
        description: 'Simple password input',
        async run() {
          const value = await clack.password({ message: 'Enter your password' })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Password length: ${value.length}`)
        },
      },
      {
        name: 'with-mask',
        description: 'Password input with a custom mask character',
        async run() {
          const value = await clack.password({
            message: 'Enter your API token',
            mask: '*',
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Token length: ${value.length}`)
        },
      },
      {
        name: 'validate',
        description: 'Password input with minimum length validation',
        async run() {
          const value = await clack.password({
            message: 'Create a password (min 8 chars)',
            validate(input) {
              if (input === undefined || input.length < 8) {
                return 'Password must be at least 8 characters'
              }
              return undefined
            },
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.success('Password accepted')
        },
      },
    ],
  },

  // -- confirm --------------------------------------------------------------
  {
    name: 'confirm',
    description: 'Yes/no confirmation prompt',
    examples: [
      {
        name: 'basic',
        description: 'Simple yes/no confirmation',
        async run() {
          const value = await clack.confirm({ message: 'Do you want to continue?' })
          if (clack.isCancel(value)) {
            return
          }
          const label = match(value)
            .with(true, () => 'yes')
            .with(false, () => 'no')
            .exhaustive()
          clack.log.info(`Answer: ${label}`)
        },
      },
      {
        name: 'custom-labels',
        description: 'Confirmation with custom active/inactive labels',
        async run() {
          const value = await clack.confirm({
            message: 'Deploy to production?',
            active: 'Deploy',
            inactive: 'Abort',
          })
          if (clack.isCancel(value)) {
            return
          }
          const label = match(value)
            .with(true, () => 'deploying')
            .with(false, () => 'aborted')
            .exhaustive()
          clack.log.info(`Action: ${label}`)
        },
      },
      {
        name: 'default-false',
        description: 'Confirmation defaulting to no',
        async run() {
          const value = await clack.confirm({
            message: 'Delete all files?',
            initialValue: false,
          })
          if (clack.isCancel(value)) {
            return
          }
          const label = match(value)
            .with(true, () => 'yes')
            .with(false, () => 'no')
            .exhaustive()
          clack.log.info(`Delete: ${label}`)
        },
      },
    ],
  },

  // -- select ---------------------------------------------------------------
  {
    name: 'select',
    description: 'Single-choice selection prompt',
    examples: [
      {
        name: 'basic',
        description: 'Simple select with three options',
        async run() {
          const value = await clack.select({
            message: 'Pick a color',
            options: [
              { value: 'red', label: 'Red' },
              { value: 'green', label: 'Green' },
              { value: 'blue', label: 'Blue' },
            ],
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Selected: ${value}`)
        },
      },
      {
        name: 'with-hints',
        description: 'Select with hint text on each option',
        async run() {
          const value = await clack.select({
            message: 'Choose a framework',
            options: [
              { value: 'react', label: 'React', hint: 'Component-based UI' },
              { value: 'vue', label: 'Vue', hint: 'Progressive framework' },
              { value: 'svelte', label: 'Svelte', hint: 'Compile-time framework' },
              { value: 'solid', label: 'Solid', hint: 'Fine-grained reactivity' },
            ],
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Framework: ${value}`)
        },
      },
      {
        name: 'initial-value',
        description: 'Select with a pre-selected value',
        async run() {
          const value = await clack.select({
            message: 'Pick a package manager',
            options: [
              { value: 'npm', label: 'npm' },
              { value: 'pnpm', label: 'pnpm' },
              { value: 'yarn', label: 'yarn' },
              { value: 'bun', label: 'bun' },
            ],
            initialValue: 'pnpm',
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Package manager: ${value}`)
        },
      },
      {
        name: 'with-disabled',
        description: 'Select with a disabled option',
        async run() {
          const value = await clack.select({
            message: 'Choose a plan',
            options: [
              { value: 'free', label: 'Free', hint: '0/mo' },
              { value: 'pro', label: 'Pro', hint: '$10/mo' },
              { value: 'enterprise', label: 'Enterprise', hint: 'Contact us', disabled: true },
            ],
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Plan: ${value}`)
        },
      },
    ],
  },

  // -- multiselect ----------------------------------------------------------
  {
    name: 'multiselect',
    description: 'Multi-choice selection prompt',
    examples: [
      {
        name: 'basic',
        description: 'Simple multiselect',
        async run() {
          const value = await clack.multiselect({
            message: 'Select toppings',
            options: [
              { value: 'cheese', label: 'Cheese' },
              { value: 'pepperoni', label: 'Pepperoni' },
              { value: 'mushrooms', label: 'Mushrooms' },
              { value: 'olives', label: 'Olives' },
            ],
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Toppings: ${(value as string[]).join(', ')}`)
        },
      },
      {
        name: 'with-initial',
        description: 'Multiselect with pre-selected values',
        async run() {
          const value = await clack.multiselect({
            message: 'Select features to enable',
            options: [
              { value: 'typescript', label: 'TypeScript' },
              { value: 'eslint', label: 'ESLint' },
              { value: 'prettier', label: 'Prettier' },
              { value: 'testing', label: 'Testing' },
            ],
            initialValues: ['typescript', 'eslint'],
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Features: ${(value as string[]).join(', ')}`)
        },
      },
      {
        name: 'optional',
        description: 'Multiselect where selection is optional',
        async run() {
          const value = await clack.multiselect({
            message: 'Select optional plugins (press enter to skip)',
            options: [
              { value: 'analytics', label: 'Analytics' },
              { value: 'sentry', label: 'Sentry' },
              { value: 'i18n', label: 'Internationalization' },
            ],
            required: false,
          })
          if (clack.isCancel(value)) {
            return
          }
          const selected = value as string[]
          const label = match(selected.length > 0)
            .with(true, () => `Plugins: ${selected.join(', ')}`)
            .with(false, () => 'No plugins selected')
            .exhaustive()
          clack.log.info(label)
        },
      },
    ],
  },

  // -- groupMultiselect -----------------------------------------------------
  {
    name: 'groupMultiselect',
    description: 'Multi-select with grouped/categorized options',
    examples: [
      {
        name: 'basic',
        description: 'Grouped multiselect with categories',
        async run() {
          const value = await clack.groupMultiselect({
            message: 'Select dependencies to install',
            options: {
              Runtime: [
                { value: 'react', label: 'React' },
                { value: 'vue', label: 'Vue' },
              ],
              Testing: [
                { value: 'vitest', label: 'Vitest' },
                { value: 'playwright', label: 'Playwright' },
              ],
              Linting: [
                { value: 'eslint', label: 'ESLint' },
                { value: 'oxlint', label: 'OXLint' },
              ],
            },
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Selected: ${(value as string[]).join(', ')}`)
        },
      },
    ],
  },

  // -- spinner --------------------------------------------------------------
  {
    name: 'spinner',
    description: 'Loading spinner for long-running operations',
    examples: [
      {
        name: 'basic',
        description: 'Simple start/stop spinner',
        async run() {
          const s = clack.spinner()
          s.start('Installing dependencies...')
          await sleep(2000)
          s.stop('Dependencies installed')
        },
      },
      {
        name: 'message-update',
        description: 'Spinner with message updates during progress',
        async run() {
          const s = clack.spinner()
          s.start('Compiling...')
          await sleep(1000)
          s.message('Bundling...')
          await sleep(1000)
          s.message('Optimizing...')
          await sleep(1000)
          s.stop('Build complete')
        },
      },
    ],
  },

  // -- log ------------------------------------------------------------------
  {
    name: 'log',
    description: 'Structured logging methods',
    examples: [
      {
        name: 'all-levels',
        description: 'Demonstrate all log levels',
        async run() {
          clack.log.info('This is an info message')
          clack.log.success('This is a success message')
          clack.log.step('This is a step message')
          clack.log.warn('This is a warning message')
          clack.log.error('This is an error message')
          clack.log.message('This is a plain message')
        },
      },
      {
        name: 'custom-symbol',
        description: 'Log message with a custom symbol prefix',
        async run() {
          clack.log.message('Custom rocket symbol', { symbol: '~' })
          clack.log.message('Custom star symbol', { symbol: '*' })
          clack.log.message('Custom arrow symbol', { symbol: '>' })
        },
      },
    ],
  },

  // -- note -----------------------------------------------------------------
  {
    name: 'note',
    description: 'Boxed note display',
    examples: [
      {
        name: 'basic',
        description: 'Simple note with title and message',
        async run() {
          clack.note('Remember to commit your changes\nbefore deploying.', 'Reminder')
        },
      },
      {
        name: 'no-title',
        description: 'Note without a title',
        async run() {
          clack.note('This is a standalone note\nwith multiple lines.')
        },
      },
    ],
  },

  // -- intro/outro ----------------------------------------------------------
  {
    name: 'intro-outro',
    description: 'Session bookend messages',
    examples: [
      {
        name: 'basic',
        description: 'Intro and outro pair',
        async run() {
          clack.intro('create-my-app')
          clack.log.info('Setting up your project...')
          clack.log.step('Creating files...')
          clack.log.success('Project created!')
          clack.outro('You are all set!')
        },
      },
    ],
  },

  // -- tasks ----------------------------------------------------------------
  {
    name: 'tasks',
    description: 'Sequential task runner with spinners',
    examples: [
      {
        name: 'basic',
        description: 'Run a series of tasks sequentially',
        async run() {
          await clack.tasks([
            {
              title: 'Validating configuration',
              async task() {
                await sleep(1000)
                return 'Config valid'
              },
            },
            {
              title: 'Installing dependencies',
              async task() {
                await sleep(1500)
                return 'Installed 42 packages'
              },
            },
            {
              title: 'Building project',
              async task() {
                await sleep(1200)
                return 'Build succeeded'
              },
            },
          ])
        },
      },
      {
        name: 'with-disabled',
        description: 'Tasks with a conditionally disabled step',
        async run() {
          await clack.tasks([
            {
              title: 'Linting',
              async task() {
                await sleep(800)
                return 'No issues found'
              },
            },
            {
              title: 'Type checking',
              enabled: false,
              async task() {
                await sleep(1000)
                return 'Types valid'
              },
            },
            {
              title: 'Running tests',
              async task() {
                await sleep(1000)
                return '12 tests passed'
              },
            },
          ])
        },
      },
    ],
  },

  // -- group ----------------------------------------------------------------
  {
    name: 'group',
    description: 'Sequential prompt orchestration with shared results',
    examples: [
      {
        name: 'basic',
        description: 'Grouped prompts that share results',
        async run() {
          const result = await clack.group(
            {
              name: () => clack.text({ message: 'Project name?', placeholder: 'my-app' }),
              language: () =>
                clack.select({
                  message: 'Language?',
                  options: [
                    { value: 'ts', label: 'TypeScript' },
                    { value: 'js', label: 'JavaScript' },
                  ],
                }),
              install: () => clack.confirm({ message: 'Install dependencies?' }),
            },
            {
              onCancel() {
                clack.cancel('Setup cancelled.')
                process.exit(0)
              },
            }
          )
          clack.log.info(
            `Name: ${result.name}, Language: ${result.language}, Install: ${result.install}`
          )
        },
      },
    ],
  },

  // -- autocomplete ---------------------------------------------------------
  {
    name: 'autocomplete',
    description: 'Type-ahead search with single selection',
    examples: [
      {
        name: 'basic',
        description: 'Autocomplete with static options',
        async run() {
          const value = await clack.autocomplete({
            message: 'Search for a country',
            options: [
              { value: 'us', label: 'United States' },
              { value: 'gb', label: 'United Kingdom' },
              { value: 'ca', label: 'Canada' },
              { value: 'au', label: 'Australia' },
              { value: 'de', label: 'Germany' },
              { value: 'fr', label: 'France' },
              { value: 'jp', label: 'Japan' },
              { value: 'br', label: 'Brazil' },
              { value: 'in', label: 'India' },
              { value: 'mx', label: 'Mexico' },
            ],
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Country: ${value}`)
        },
      },
      {
        name: 'with-placeholder',
        description: 'Autocomplete with placeholder and max items',
        async run() {
          const value = await clack.autocomplete({
            message: 'Pick a programming language',
            placeholder: 'Start typing...',
            maxItems: 5,
            options: [
              { value: 'ts', label: 'TypeScript', hint: 'Typed JavaScript' },
              { value: 'rs', label: 'Rust', hint: 'Systems programming' },
              { value: 'go', label: 'Go', hint: 'Cloud native' },
              { value: 'py', label: 'Python', hint: 'Data science' },
              { value: 'rb', label: 'Ruby', hint: 'Web development' },
              { value: 'java', label: 'Java', hint: 'Enterprise' },
              { value: 'kt', label: 'Kotlin', hint: 'Android' },
              { value: 'swift', label: 'Swift', hint: 'Apple platforms' },
              { value: 'zig', label: 'Zig', hint: 'Low-level control' },
              { value: 'elixir', label: 'Elixir', hint: 'Fault-tolerant' },
            ],
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Language: ${value}`)
        },
      },
      {
        name: 'async-options',
        description: 'Autocomplete with dynamically generated options',
        async run() {
          const allOptions = Array.from({ length: 50 }, (_, i) => ({
            value: `item-${i + 1}`,
            label: `Item ${i + 1}`,
            hint: `Description for item ${i + 1}`,
          }))
          const value = await clack.autocomplete({
            message: 'Search from 50 items',
            maxItems: 8,
            options: allOptions,
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Selected: ${value}`)
        },
      },
    ],
  },

  // -- autocompleteMultiselect ----------------------------------------------
  {
    name: 'autocompleteMultiselect',
    description: 'Type-ahead search with multiple selection',
    examples: [
      {
        name: 'basic',
        description: 'Search and select multiple items',
        async run() {
          const value = await clack.autocompleteMultiselect({
            message: 'Search and select npm packages',
            options: [
              { value: 'react', label: 'react', hint: 'UI library' },
              { value: 'vue', label: 'vue', hint: 'Progressive framework' },
              { value: 'svelte', label: 'svelte', hint: 'Compiler framework' },
              { value: 'solid-js', label: 'solid-js', hint: 'Reactive UI' },
              { value: 'preact', label: 'preact', hint: 'Lightweight React' },
              { value: 'lit', label: 'lit', hint: 'Web components' },
              { value: 'htmx', label: 'htmx', hint: 'HTML extensions' },
              { value: 'alpine', label: 'alpinejs', hint: 'Lightweight reactivity' },
            ],
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Packages: ${(value as string[]).join(', ')}`)
        },
      },
      {
        name: 'with-initial',
        description: 'Search multiselect with pre-selected values',
        async run() {
          const value = await clack.autocompleteMultiselect({
            message: 'Select middleware',
            options: [
              { value: 'cors', label: 'CORS' },
              { value: 'auth', label: 'Authentication' },
              { value: 'rate-limit', label: 'Rate Limiting' },
              { value: 'compression', label: 'Compression' },
              { value: 'logging', label: 'Logging' },
              { value: 'cache', label: 'Caching' },
            ],
            initialValues: ['cors', 'auth'],
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Middleware: ${(value as string[]).join(', ')}`)
        },
      },
    ],
  },

  // -- selectKey ------------------------------------------------------------
  {
    name: 'selectKey',
    description: 'Select an option by pressing a key',
    examples: [
      {
        name: 'basic',
        description: 'Key-press selection with letter keys',
        async run() {
          const value = await clack.selectKey({
            message: 'What do you want to do?',
            options: [
              { value: 'c', label: 'Create a new project' },
              { value: 'd', label: 'Delete a project' },
              { value: 'l', label: 'List all projects' },
              { value: 'q', label: 'Quit' },
            ],
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Action: ${value}`)
        },
      },
    ],
  },

  // -- path -----------------------------------------------------------------
  {
    name: 'path',
    description: 'Filesystem path autocomplete prompt',
    examples: [
      {
        name: 'basic',
        description: 'Pick a file path from current directory',
        async run() {
          const value = await clack.path({ message: 'Select a file' })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Path: ${value}`)
        },
      },
      {
        name: 'directories-only',
        description: 'Pick a directory path only',
        async run() {
          const value = await clack.path({
            message: 'Select an output directory',
            directory: true,
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Directory: ${value}`)
        },
      },
      {
        name: 'with-root',
        description: 'Path picker starting from a specific root',
        async run() {
          const value = await clack.path({
            message: 'Select a package',
            root: './packages',
          })
          if (clack.isCancel(value)) {
            return
          }
          clack.log.info(`Package path: ${value}`)
        },
      },
    ],
  },

  // -- box ------------------------------------------------------------------
  {
    name: 'box',
    description: 'Bordered box with title and content',
    examples: [
      {
        name: 'basic',
        description: 'Simple box with title and message',
        async run() {
          clack.box(
            'Welcome to the playground!\nExplore all clack components here.',
            'Clack Playground'
          )
        },
      },
      {
        name: 'centered',
        description: 'Box with centered content and title',
        async run() {
          clack.box('Centered content\nin a box', 'Centered', {
            contentAlign: 'center',
            titleAlign: 'center',
          })
        },
      },
      {
        name: 'custom-width',
        description: 'Box with fixed width and right-aligned content',
        async run() {
          clack.box('Right-aligned text\ninside a wide box', 'Wide Box', {
            width: 60,
            contentAlign: 'right',
          })
        },
      },
      {
        name: 'rounded',
        description: 'Box with rounded corners',
        async run() {
          clack.box('Smooth corners!', 'Rounded', { rounded: true })
        },
      },
    ],
  },

  // -- progress -------------------------------------------------------------
  {
    name: 'progress',
    description: 'Visual progress bar indicator',
    examples: [
      {
        name: 'basic',
        description: 'Simple progress bar from 0 to 100',
        async run() {
          const bar = clack.progress({ max: 100 })
          bar.start('Downloading...')
          const steps = Array.from({ length: 10 }, (_, i) => i)
          for (const i of steps) {
            await sleep(300)
            bar.advance(10, `Downloading... ${(i + 1) * 10}%`)
          }
          bar.stop('Download complete')
        },
      },
      {
        name: 'file-processing',
        description: 'Progress bar simulating file processing',
        async run() {
          const files = ['config.ts', 'index.ts', 'utils.ts', 'types.ts', 'cli.ts']
          const bar = clack.progress({ max: files.length })
          bar.start('Processing files...')
          for (const file of files) {
            await sleep(600)
            bar.advance(1, `Processing ${file}`)
          }
          bar.stop(`Processed ${files.length} files`)
        },
      },
    ],
  },

  // -- stream ---------------------------------------------------------------
  {
    name: 'stream',
    description: 'Async iterable logging (token-by-token output)',
    examples: [
      {
        name: 'info',
        description: 'Stream an info message token by token',
        async run() {
          const tokens = ['Streaming ', 'a ', 'message ', 'token ', 'by ', 'token...']
          async function* generate(): AsyncIterable<string> {
            for (const token of tokens) {
              await sleep(200)
              yield token
            }
          }
          await clack.stream.info(generate())
        },
      },
      {
        name: 'success',
        description: 'Stream a success message',
        async run() {
          const words = ['Build ', 'completed ', 'successfully ', 'with ', 'no ', 'errors!']
          async function* generate(): AsyncIterable<string> {
            for (const word of words) {
              await sleep(150)
              yield word
            }
          }
          await clack.stream.success(generate())
        },
      },
      {
        name: 'all-levels',
        description: 'Stream messages at every log level',
        async run() {
          const makeStream = (text: string) => {
            const words = text.split(' ')
            return async function* streamWords(): AsyncIterable<string> {
              for (const word of words) {
                await sleep(100)
                yield `${word} `
              }
            }
          }
          await clack.stream.info(makeStream('Information streamed in real time')())
          await clack.stream.success(makeStream('Operation completed successfully')())
          await clack.stream.step(makeStream('Step completed in sequence')())
          await clack.stream.warn(makeStream('Warning detected during processing')())
          await clack.stream.error(makeStream('Error encountered during execution')())
        },
      },
    ],
  },

  // -- taskLog --------------------------------------------------------------
  {
    name: 'taskLog',
    description: 'Sub-process output handler (retains logs on failure)',
    examples: [
      {
        name: 'success',
        description: 'Task log that completes successfully (clears output)',
        async run() {
          const tl = clack.taskLog({ title: 'Building project' })
          const lines = [
            'Compiling src/index.ts...',
            'Compiling src/utils.ts...',
            'Compiling src/cli.ts...',
            'Generating type declarations...',
            'Writing dist/index.mjs...',
          ]
          for (const line of lines) {
            tl.message(line)
            await sleep(500)
          }
          tl.success('Build succeeded')
        },
      },
      {
        name: 'error',
        description: 'Task log that fails (retains output for debugging)',
        async run() {
          const tl = clack.taskLog({ title: 'Running tests' })
          const lines = [
            'PASS src/utils.test.ts',
            'PASS src/cli.test.ts',
            'FAIL src/config.test.ts',
            '  Expected: true',
            '  Received: false',
          ]
          for (const line of lines) {
            tl.message(line)
            await sleep(400)
          }
          tl.error('3 tests failed')
        },
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function findCommand(name: string): Command | undefined {
  return COMMANDS.find((c) => c.name === name)
}

function findExample(command: Command, name: string): Example | undefined {
  return command.examples.find((e) => e.name === name)
}

// ---------------------------------------------------------------------------
// Script
// ---------------------------------------------------------------------------

export default lauf({
  description: 'Clack prompts playground - interactive demos for every prompt type',
  args: {
    command: z.string().optional().describe('Command to run (e.g. text, select, confirm)'),
    example: z.string().optional().describe('Example to run (e.g. basic, validate)'),
  },
  async run(ctx) {
    clack.intro('clack playground')

    const commandName = await match(ctx.args.command)
      .with(undefined, async () => {
        const value = await clack.select({
          message: 'Pick a command to demo',
          options: COMMANDS.map((c) => ({
            value: c.name,
            label: c.name,
            hint: c.description,
          })),
        })
        if (clack.isCancel(value)) {
          clack.cancel('Cancelled.')
          process.exit(0)
        }
        return value as string
      })
      .otherwise((name) => Promise.resolve(name))

    const command = findCommand(commandName)
    if (command === undefined) {
      clack.log.error(`Unknown command: ${commandName}`)
      clack.log.info(`Available: ${COMMANDS.map((c) => c.name).join(', ')}`)
      clack.outro('Done')
      return
    }

    const exampleName = await match(ctx.args.example)
      .with(undefined, async () => {
        const value = await clack.select({
          message: `Pick an example for "${command.name}"`,
          options: command.examples.map((e) => ({
            value: e.name,
            label: e.name,
            hint: e.description,
          })),
        })
        if (clack.isCancel(value)) {
          clack.cancel('Cancelled.')
          process.exit(0)
        }
        return value as string
      })
      .otherwise((name) => Promise.resolve(name))

    const example = findExample(command, exampleName)
    if (example === undefined) {
      clack.log.error(`Unknown example: ${exampleName}`)
      clack.log.info(
        `Available for "${command.name}": ${command.examples.map((e) => e.name).join(', ')}`
      )
      clack.outro('Done')
      return
    }

    clack.log.step(`Running: ${command.name} > ${example.name}`)
    clack.note(`${command.description}\n\n${example.description}`, command.name)
    await example.run()

    clack.outro('Done')
  },
})
