import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

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
 * Map of active status to display properties.
 */
const STATUS_MAP: Record<string, { readonly color: string; readonly label: string }> = {
  true: { color: 'green', label: 'Active' },
  false: { color: 'red', label: 'Inactive' },
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
  const status = STATUS_MAP[String(active)] ?? STATUS_MAP['false']

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
