import { Text } from 'ink'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

/**
 * Props for the StatusBadge component.
 */
export interface StatusBadgeProps {
  readonly status: 'done' | 'in-progress' | 'todo'
}

/**
 * Renders a colored status badge for a task.
 */
export function StatusBadge({ status }: StatusBadgeProps): ReactElement {
  return match(status)
    .with('done', () => <Text color="green">✔ done</Text>)
    .with('in-progress', () => <Text color="yellow">● in-progress</Text>)
    .with('todo', () => <Text color="gray">○ todo</Text>)
    .exhaustive()
}
