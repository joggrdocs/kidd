import type { Tagged } from '@kidd-cli/utils/tag'
import type { ComponentType } from 'react'
import type { z } from 'zod'

/**
 * The kind of control used to edit a field in the story viewer.
 */
export type FieldControlKind =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'json'
  | 'readonly'

/**
 * Describes a single editable field derived from a Zod schema property.
 */
export interface FieldDescriptor {
  readonly name: string
  readonly control: FieldControlKind
  readonly isOptional: boolean
  readonly defaultValue: unknown
  readonly description: string | undefined
  readonly options?: readonly string[]
  readonly zodTypeName: string
}

/**
 * A decorator wraps a story component to provide layout, context, or other
 * rendering concerns.
 */
export type Decorator = (
  StoryComponent: ComponentType<Record<string, unknown>>
) => ComponentType<Record<string, unknown>>

/**
 * Input definition for a single story created via {@link story}.
 */
export interface StoryDef<TProps extends Record<string, unknown>> {
  readonly name: string
  readonly component: ComponentType<TProps>
  readonly schema: z.ZodObject<z.ZodRawShape>
  readonly props: TProps
  readonly decorators?: readonly Decorator[]
  readonly description?: string
}

/**
 * A single variant inside a {@link StoriesGroupDef}.
 */
export interface StoryVariantDef<TProps extends Record<string, unknown>> {
  readonly props: TProps
  readonly decorators?: readonly Decorator[]
  readonly description?: string
}

/**
 * Input definition for a group of stories created via {@link stories}.
 */
export interface StoriesGroupDef<TProps extends Record<string, unknown>> {
  readonly title: string
  readonly component: ComponentType<TProps>
  readonly schema: z.ZodObject<z.ZodRawShape>
  readonly decorators?: readonly Decorator[]
  readonly stories: Readonly<Record<string, StoryVariantDef<TProps>>>
}

/**
 * Tagged output of the {@link story} factory. Represents a single renderable
 * story bound to a component, schema, and default props.
 */
export type Story<TProps extends Record<string, unknown> = Record<string, unknown>> = Tagged<
  {
    readonly name: string
    readonly component: ComponentType<TProps>
    readonly schema: z.ZodObject<z.ZodRawShape>
    readonly props: TProps
    readonly decorators: readonly Decorator[]
    readonly description: string | undefined
  },
  'Story'
>

/**
 * Tagged output of the {@link stories} factory. Groups multiple story variants
 * under a shared title, component, and schema.
 */
export type StoryGroup = Tagged<
  {
    readonly title: string
    readonly component: ComponentType<Record<string, unknown>>
    readonly schema: z.ZodObject<z.ZodRawShape>
    readonly decorators: readonly Decorator[]
    readonly stories: Readonly<Record<string, Story>>
  },
  'StoryGroup'
>

/**
 * A registry entry that is either a single {@link Story} or a {@link StoryGroup}.
 */
export type StoryEntry = Story | StoryGroup

/**
 * File suffixes that identify story files (e.g. `.stories.tsx`).
 * Shared between discovery and file watching.
 */
export const STORY_FILE_SUFFIXES: readonly string[] = [
  '.stories.tsx',
  '.stories.ts',
  '.stories.jsx',
  '.stories.js',
]
