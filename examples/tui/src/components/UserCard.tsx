import { Box, Text } from 'ink'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

/**
 * Props for the UserCard component.
 */
export interface UserCardProps {
  readonly username: string
  readonly role: 'admin' | 'editor' | 'viewer'
  readonly email: string
  readonly active: boolean
  readonly loginCount: number
}

/**
 * Resolve display properties for an active/inactive status.
 *
 * @private
 * @param active - Whether the user is active.
 * @returns The color and label for the status.
 */
function resolveStatus(active: boolean): { readonly color: string; readonly label: string } {
  return match(active)
    .with(true, () => ({ color: 'green', label: 'Active' }))
    .with(false, () => ({ color: 'red', label: 'Inactive' }))
    .exhaustive()
}

/**
 * Renders a user info card.
 */
export function UserCard({
  username,
  role,
  email,
  active,
  loginCount,
}: UserCardProps): ReactElement {
  const status = resolveStatus(active)

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text bold color="cyan">
          {username}
        </Text>
        <Text> </Text>
        <Text dimColor>({role})</Text>
      </Box>
      <Text>{email}</Text>
      <Box>
        <Text color={status.color}>{status.label}</Text>
        <Text dimColor> · </Text>
        <Text>{String(loginCount)} logins</Text>
      </Box>
    </Box>
  )
}
