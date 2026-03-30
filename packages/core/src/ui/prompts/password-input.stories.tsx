import { stories } from '@kidd-cli/core/stories'
import type { StoryGroup } from '@kidd-cli/core/stories'
import type { ComponentType } from 'react'
import { z } from 'zod'

import { PasswordInput } from './password-input.js'

const schema = z.object({
  placeholder: z.string().describe('Placeholder text'),
  mask: z.string().describe('Mask character'),
  isDisabled: z.boolean().describe('Disable interaction'),
})

const storyGroup: StoryGroup = stories({
  title: 'PasswordInput',
  component: PasswordInput as unknown as ComponentType<Record<string, unknown>>,
  schema,
  defaults: {
    onSubmit: (_v: string) => {},
  },
  stories: {
    Default: {
      props: { placeholder: 'Enter password...', mask: '*', isDisabled: false },
      description: 'Standard password input with asterisk mask',
    },
    CustomMask: {
      props: { placeholder: 'Enter secret...', mask: '#', isDisabled: false },
      description: 'Password input with custom hash mask character',
    },
    WithValidation: {
      props: {
        placeholder: 'Enter at least 8 characters...',
        mask: '*',
        isDisabled: false,
        validate: (value: string) => {
          if (value.length < 8) {
            return 'Password must be at least 8 characters'
          }
          return undefined
        },
      },
      description: 'Password input with minimum length validation',
    },
    Disabled: {
      props: { placeholder: 'Disabled input', mask: '*', isDisabled: true },
      description: 'Fully disabled password input',
    },
  },
})

export default storyGroup
