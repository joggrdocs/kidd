import { stories } from '@kidd-cli/core/stories'
import type { StoryGroup } from '@kidd-cli/core/stories'
import type { ComponentType } from 'react'
import { z } from 'zod'

import { MultiSelect } from './multi-select.js'

const schema = z.object({
  maxVisible: z.number().describe('Max visible options'),
  required: z.boolean().describe('Require at least one selection'),
  isDisabled: z.boolean().describe('Disable interaction'),
})

const storyGroup: StoryGroup = stories({
  title: 'MultiSelect',
  component: MultiSelect as unknown as ComponentType<Record<string, unknown>>,
  schema,
  defaults: {
    options: [
      { value: 'ts', label: 'TypeScript' },
      { value: 'eslint', label: 'ESLint' },
      { value: 'prettier', label: 'Prettier' },
      { value: 'tailwind', label: 'Tailwind', disabled: true },
    ],
    onSubmit: (_v: readonly string[]) => {},
  },
  stories: {
    Default: {
      props: { maxVisible: 5, required: false, isDisabled: false },
      description: 'Standard multi-select with default settings',
    },
    WithRequired: {
      props: { maxVisible: 5, required: true, isDisabled: false },
      description: 'Multi-select that requires at least one selection',
    },
    DisabledOptions: {
      props: {
        maxVisible: 5,
        required: false,
        isDisabled: false,
        options: [
          { value: 'a', label: 'Available' },
          { value: 'b', label: 'Blocked', disabled: true },
          { value: 'c', label: 'Also available' },
          { value: 'd', label: 'Also blocked', disabled: true },
        ],
      },
      description: 'Mix of enabled and disabled options',
    },
    Preselected: {
      props: {
        maxVisible: 5,
        required: false,
        isDisabled: false,
        defaultValue: ['ts', 'prettier'],
      },
      description: 'Pre-selected values on mount',
    },
    Disabled: {
      props: { maxVisible: 5, required: false, isDisabled: true },
      description: 'Fully disabled multi-select',
    },
  },
})

export default storyGroup
