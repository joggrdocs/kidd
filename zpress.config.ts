import { defineConfig } from "@zpress/kit";

export default defineConfig({
  title: "kidd",
  description:
    "An opinionated CLI framework for Node.js. Convention over configuration, end-to-end type safety.",
  tagline: "Convention over configuration, end-to-end type safety.",
  sections: [
    {
      title: "Introduction",
      link: "/introduction",
      from: "docs/README.md",
    },
    {
      title: "Concepts",
      prefix: "/concepts",
      from: "docs/concepts/*.md",
      icon: "pixelarticons:lightbulb",
    },
    {
      title: "Guides",
      prefix: "/guides",
      from: "docs/guides/*.md",
      icon: "pixelarticons:book-open",
    },
    {
      title: "Reference",
      prefix: "/reference",
      from: "docs/reference/*.md",
      icon: "pixelarticons:terminal",
    },
    {
      title: "Contributing",
      prefix: "/contributing",
      icon: "pixelarticons:git-branch",
      collapsible: true,
      items: [
        {
          title: "Concepts",
          prefix: "/contributing/concepts",
          from: "contributing/concepts/*.md",
        },
        {
          title: "Guides",
          prefix: "/contributing/guides",
          from: "contributing/guides/*.md",
        },
        {
          title: "Standards",
          prefix: "/contributing/standards",
          collapsible: true,
          items: [
            {
              title: "TypeScript",
              prefix: "/contributing/standards/typescript",
              from: "contributing/standards/typescript/*.md",
            },
            {
              title: "Documentation",
              prefix: "/contributing/standards/documentation",
              from: "contributing/standards/documentation/*.md",
            },
            {
              title: "Git",
              prefix: "/contributing/standards/git",
              from: "contributing/standards/git-*.md",
            },
          ],
        },
      ],
    },
  ],
  packages: [
    {
      title: "@kidd-cli/core",
      description: "Core CLI framework — commands, middleware, config, store",
      prefix: "/packages/core",
      icon: "pixelarticons:terminal",
      tags: ["cli", "framework"],
    },
    {
      title: "@kidd-cli/cli",
      description: "DX companion CLI — init, build, doctor, add",
      prefix: "/packages/cli",
      icon: "pixelarticons:tool",
      tags: ["cli", "dx"],
    },
    {
      title: "@kidd-cli/config",
      description: "Configuration loading, validation, and schema",
      prefix: "/packages/config",
      icon: "pixelarticons:sliders",
      tags: ["config"],
    },
    {
      title: "@kidd-cli/utils",
      description: "Shared functional utilities",
      prefix: "/packages/utils",
      icon: "pixelarticons:wrench",
      tags: ["utilities"],
    },
    {
      title: "@kidd-cli/bundler",
      description: "tsdown bundling and binary compilation",
      prefix: "/packages/bundler",
      icon: "pixelarticons:archive",
      tags: ["build", "bundler"],
    },
  ],
});
