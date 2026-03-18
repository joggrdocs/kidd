import { defineConfig } from "@zpress/kit";

export default defineConfig({
  title: "kidd",
  description: "An opinionated CLI framework",
  tagline: "Built on yargs and Zod. Convention over configuration, end-to-end type safety.",
  actions: [
    { theme: "brand", text: "Introduction", link: "/getting-started/introduction" },
    { theme: "alt", text: "Quick Start", link: "/getting-started/quick-start" },
  ],
  sidebar: {
    below: [
      { text: "Contributing", link: "/contributing", icon: "pixelarticons:git-merge" },
    ],
  },
  sections: [
    // ── Getting Started ──
    {
      title: "Getting Started",
      icon: "pixelarticons:speed-fast",
      prefix: "/getting-started",
      items: [
        {
          title: "Introduction",
          link: "/getting-started/introduction",
          from: "docs/introduction.md",
        },
        {
          title: "Quick Start",
          link: "/getting-started/quick-start",
          from: "docs/quick-start.md",
        },
      ],
    },

    // ── Concepts ──
    {
      title: "Concepts",
      prefix: "/concepts",
      icon: "pixelarticons:lightbulb",
      items: [
        {
          title: "Lifecycle",
          link: "/concepts/lifecycle",
          from: "docs/concepts/lifecycle.md",
        },
        {
          title: "Context",
          link: "/concepts/context",
          from: "docs/concepts/context.md",
        },
        {
          title: "Configuration",
          link: "/concepts/configuration",
          from: "docs/concepts/configuration.md",
        },
        {
          title: "Authentication",
          link: "/concepts/authentication",
          from: "docs/concepts/authentication.md",
        },
        {
          title: "Icons",
          link: "/concepts/icons",
          from: "docs/concepts/icons.md",
        },
      ],
    },

    // ── Guides ──
    {
      title: "Guides",
      prefix: "/guides",
      icon: "pixelarticons:book-open",
      items: [
        {
          title: "Build a CLI",
          link: "/guides/build-a-cli",
          from: "docs/guides/build-a-cli.md",
        },
        {
          title: "Add Authentication",
          link: "/guides/add-authentication",
          from: "docs/guides/add-authentication.md",
        },
        {
          title: "Testing Your CLI",
          link: "/guides/testing-your-cli",
          from: "docs/guides/testing-your-cli.md",
        },
        {
          title: "Build a Compiled CLI",
          link: "/guides/build-a-compiled-cli",
          from: "docs/guides/build-a-compiled-cli.md",
        },
      ],
    },

    // ── Reference ──
    {
      title: "Reference",
      prefix: "/reference",
      icon: "pixelarticons:terminal",
      items: [
        {
          title: "@kidd-cli/core",
          link: "/reference/kidd",
          from: "docs/reference/kidd.md",
        },
        {
          title: "@kidd-cli/cli",
          link: "/reference/cli",
          from: "docs/reference/cli.md",
        },
      ],
    },

    // ── Contributing ──
    {
      title: "Contributing",
      icon: "pixelarticons:git-branch",
      isolated: true,
      items: [
        {
          title: "Concepts",
          prefix: "/contributing/concepts",
          from: "contributing/concepts/*.md",
          titleFrom: "heading",
          sort: "alpha",
        },
        {
          title: "Guides",
          prefix: "/contributing/guides",
          from: "contributing/guides/*.md",
          titleFrom: "heading",
          sort: "alpha",
        },
        {
          title: "Standards",
          items: [
            {
              title: "TypeScript",
              prefix: "/contributing/standards/typescript",
              from: "contributing/standards/typescript/*.md",
              titleFrom: "heading",
              sort: "alpha",
            },
            {
              title: "Documentation",
              prefix: "/contributing/standards/documentation",
              from: "contributing/standards/documentation/*.md",
              titleFrom: "heading",
              sort: "alpha",
            },
            {
              title: "Git",
              prefix: "/contributing/standards/git",
              from: "contributing/standards/git-*.md",
              titleFrom: "heading",
              sort: "alpha",
            },
          ],
        },
      ],
    },
  ],
  features: [
    {
      title: "Type-Safe Commands",
      description: "Define commands with Zod schemas and get fully typed args, config, and context in every handler.",
      icon: "pixelarticons:command",
    },
    {
      title: "Middleware Pipelines",
      description: "Compose auth, logging, timing, and custom logic with a nested onion model.",
      icon: "pixelarticons:card-stack",
    },
    {
      title: "Built-in Auth",
      description: "OAuth PKCE, device code, env vars, and file tokens with zero boilerplate.",
      icon: "pixelarticons:shield",
    },
    {
      title: "Terminal UI",
      description: "Logger, spinner, prompts, colors, and formatters all available on ctx.",
      icon: "pixelarticons:sparkle",
    },
    {
      title: "Config Discovery",
      description: "Automatic config file loading with Zod validation and typed access.",
      icon: "pixelarticons:sliders",
    },
    {
      title: "Build & Compile",
      description: "Bundle to ESM with tsdown and compile to standalone binaries with Bun.",
      icon: "pixelarticons:zap",
    },
  ],
  packages: [
    {
      title: "@kidd-cli/core",
      description: "The runtime framework for commands, middleware, auth, and terminal UI.",
      prefix: "/reference/kidd",
      icon: "pixelarticons:code",
      tags: ["framework", "runtime"],
    },
    {
      title: "@kidd-cli/cli",
      description: "The developer CLI for scaffolding, building, and diagnostics.",
      prefix: "/reference/cli",
      icon: "pixelarticons:command",
      tags: ["cli", "tooling"],
    },
  ],
  nav: [
    { title: "Getting Started", link: "/getting-started/introduction" },
    { title: "Concepts", link: "/concepts/lifecycle" },
    { title: "Guides", link: "/guides/build-a-cli" },
    { title: "Reference", link: "/reference/kidd" },
  ],
});
