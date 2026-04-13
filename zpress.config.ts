import { defineConfig } from '@zpress/kit'

export default defineConfig({
  title: 'kidd',
  description: 'An opinionated CLI framework',
  tagline: 'Built on yargs and Zod. Convention over configuration, end-to-end type safety.',
  theme: { name: 'midnight' },
  actions: [
    { theme: 'brand', text: 'Documentation', link: '/docs/introduction' },
    { theme: 'alt', text: 'Quick Start', link: '/docs/quick-start' },
  ],
  sidebar: {
    below: [{ text: 'Contributing', link: '/contributing', icon: 'pixelarticons:git-merge' }],
  },
  sections: [
    // ── Documentation ──
    {
      title: 'Documentation',
      icon: 'pixelarticons:notes',
      path: '/docs',
      items: [
        {
          title: 'Introduction',
          path: '/docs/introduction',
          include: 'docs/introduction.md',
        },
        {
          title: 'Quick Start',
          path: '/docs/quick-start',
          include: 'docs/quick-start.md',
        },
        {
          title: 'Concepts',
          path: '/docs/concepts',
          include: 'docs/concepts/*.md',
          sort: 'alpha',
        },
      ],
    },

    // ── Guides ──
    {
      title: 'Guides',
      path: '/guides',
      standalone: true,
      icon: 'pixelarticons:book-open',
      items: [
        {
          title: { from: 'heading' },
          path: '/guides',
          include: 'docs/guides/*.md',
          sort: 'alpha',
        },
      ],
    },

    // ── Reference ──
    {
      title: 'Reference',
      path: '/reference',
      standalone: true,
      icon: 'pixelarticons:terminal',
      items: [
        {
          title: 'Framework',
          path: '/reference/framework',
          include: 'docs/reference/framework/*.md',
          sort: 'alpha',
        },
        {
          title: 'Middleware',
          path: '/reference/middleware',
          include: 'docs/reference/middleware/*.md',
          sort: 'alpha',
        },
        {
          title: 'Packages',
          path: '/reference/packages',
          include: 'docs/reference/packages/*.md',
          sort: 'alpha',
        },
      ],
    },

    // ── Contributing ──
    {
      title: 'Contributing',
      icon: 'pixelarticons:git-branch',
      standalone: true,
      items: [
        {
          title: { from: 'heading' },
          path: '/contributing/concepts',
          include: 'contributing/concepts/*.md',
          sort: 'alpha',
        },
        {
          title: { from: 'heading' },
          path: '/contributing/guides',
          include: 'contributing/guides/*.md',
          sort: 'alpha',
        },
        {
          title: 'Standards',
          items: [
            {
              title: { from: 'heading' },
              path: '/contributing/standards/typescript',
              include: 'contributing/standards/typescript/*.md',
              sort: 'alpha',
            },
            {
              title: { from: 'heading' },
              path: '/contributing/standards/documentation',
              include: 'contributing/standards/documentation/*.md',
              sort: 'alpha',
            },
            {
              title: { from: 'heading' },
              path: '/contributing/standards/git',
              include: 'contributing/standards/git-*.md',
              sort: 'alpha',
            },
          ],
        },
      ],
    },
  ],
  features: [
    {
      title: 'Type-Safe Commands',
      description:
        'Define commands with Zod schemas and get fully typed args, config, and context in every handler.',
      icon: 'pixelarticons:command',
    },
    {
      title: 'Middleware Pipelines',
      description: 'Compose auth, logging, timing, and custom logic with a nested onion model.',
      icon: 'pixelarticons:card-stack',
    },
    {
      title: 'Built-in Auth',
      description: 'OAuth PKCE, device code, env vars, and file tokens with zero boilerplate.',
      icon: 'pixelarticons:shield',
    },
    {
      title: 'Terminal UI',
      description: 'Logger, spinner, prompts, colors, and formatters all available on ctx.',
      icon: 'pixelarticons:sparkle',
    },
    {
      title: 'Config Discovery',
      description: 'Automatic config file loading with Zod validation and typed access.',
      icon: 'pixelarticons:sliders',
    },
    {
      title: 'Build & Compile',
      description: 'Bundle to ESM with tsdown and compile to standalone binaries with Bun.',
      icon: 'pixelarticons:zap',
    },
  ],
  packages: [
    {
      title: '@kidd-cli/core',
      description: 'The runtime framework for commands, middleware, auth, and terminal UI.',
      path: '/reference/framework/bootstrap',
      icon: 'pixelarticons:code',
      tags: ['framework', 'runtime'],
    },
    {
      title: '@kidd-cli/cli',
      description: 'The developer CLI for scaffolding, building, and diagnostics.',
      path: '/reference/packages/cli',
      icon: 'pixelarticons:command',
      tags: ['cli', 'tooling'],
    },
  ],
  nav: [
    { title: 'Documentation', link: '/docs/introduction' },
    { title: 'Guides', link: '/guides/build-a-cli' },
    { title: 'Reference', link: '/reference/framework/bootstrap' },
  ],
})
