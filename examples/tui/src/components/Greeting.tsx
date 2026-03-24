import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

/**
 * Props for the Greeting component.
 */
export interface GreetingProps {
  readonly name: string
  readonly excited: boolean
}

/**
 * Renders a greeting message.
 */
export function Greeting({ name, excited }: GreetingProps): ReactElement {
  const suffix = excited ? '!' : '.'
  return (
    <Box padding={1}>
      <Text>
        Hello,{' '}
        <Text bold color="cyan">
          {name}
        </Text>
        {suffix}
      </Text>
    </Box>
  )
}
