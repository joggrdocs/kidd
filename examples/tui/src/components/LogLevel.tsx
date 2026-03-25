import { Text } from 'ink'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

/**
 * Props for the LogLevel component.
 */
export interface LogLevelProps {
  readonly level: 'info' | 'warn' | 'error'
}

/**
 * Renders a colored log level indicator.
 */
export function LogLevel({ level }: LogLevelProps): ReactElement {
  return match(level)
    .with('info', () => <Text color="blue">INFO </Text>)
    .with('warn', () => <Text color="yellow">WARN </Text>)
    .with('error', () => <Text color="red">ERROR</Text>)
    .exhaustive()
}
