import { Box, Text } from 'ink'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the SystemMonitor component.
 */
export interface SystemMonitorProps {
  readonly hostname: string
  readonly uptime: string
  readonly cpuUsage: number
  readonly memoryUsage: number
  readonly diskUsage: number
  readonly networkIn: string
  readonly networkOut: string
  readonly activeConnections: number
  readonly processes: number
  readonly loadAvg1: number
  readonly loadAvg5: number
  readonly loadAvg15: number
  readonly services: readonly ServiceStatus[]
  readonly recentEvents: readonly EventEntry[]
}

/**
 * Status of a monitored service.
 */
export interface ServiceStatus {
  readonly name: string
  readonly status: 'healthy' | 'degraded' | 'down'
  readonly latency: string
}

/**
 * A recent system event.
 */
export interface EventEntry {
  readonly time: string
  readonly severity: 'info' | 'warn' | 'critical'
  readonly message: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BAR_WIDTH = 24
const FILLED_CHAR = '█'
const EMPTY_CHAR = '░'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * A wide, multi-panel system monitoring dashboard component.
 * Displays CPU, memory, disk, network, services, and events
 * in a structured box layout.
 */
export function SystemMonitor({
  hostname,
  uptime,
  cpuUsage,
  memoryUsage,
  diskUsage,
  networkIn,
  networkOut,
  activeConnections,
  processes,
  loadAvg1,
  loadAvg5,
  loadAvg15,
  services,
  recentEvents,
}: SystemMonitorProps): ReactElement {
  return (
    <Box flexDirection="column" width={80}>
      <TitleBar hostname={hostname} uptime={uptime} />
      <Box flexDirection="row" gap={1}>
        <ResourcePanel
          cpuUsage={cpuUsage}
          memoryUsage={memoryUsage}
          diskUsage={diskUsage}
        />
        <NetworkPanel
          networkIn={networkIn}
          networkOut={networkOut}
          activeConnections={activeConnections}
        />
      </Box>
      <Box flexDirection="row" gap={1}>
        <LoadPanel
          processes={processes}
          loadAvg1={loadAvg1}
          loadAvg5={loadAvg5}
          loadAvg15={loadAvg15}
        />
        <ServicesPanel services={services} />
      </Box>
      <EventsPanel events={recentEvents} />
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Header bar showing hostname and uptime.
 *
 * @private
 */
function TitleBar({
  hostname,
  uptime,
}: {
  readonly hostname: string
  readonly uptime: string
}): ReactElement {
  return (
    <Box
      borderStyle="double"
      borderColor="cyan"
      paddingX={1}
      justifyContent="space-between"
    >
      <Text bold color="cyan">
        ◈ {hostname}
      </Text>
      <Text dimColor>uptime: {uptime}</Text>
    </Box>
  )
}

/**
 * Panel showing CPU, memory, and disk usage with progress bars.
 *
 * @private
 */
function ResourcePanel({
  cpuUsage,
  memoryUsage,
  diskUsage,
}: {
  readonly cpuUsage: number
  readonly memoryUsage: number
  readonly diskUsage: number
}): ReactElement {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} flexGrow={1}>
      <Text bold>Resources</Text>
      <Text> </Text>
      <ProgressRow label="CPU " value={cpuUsage} />
      <ProgressRow label="MEM " value={memoryUsage} />
      <ProgressRow label="DISK" value={diskUsage} />
    </Box>
  )
}

/**
 * Panel showing network I/O and active connections.
 *
 * @private
 */
function NetworkPanel({
  networkIn,
  networkOut,
  activeConnections,
}: {
  readonly networkIn: string
  readonly networkOut: string
  readonly activeConnections: number
}): ReactElement {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} flexGrow={1}>
      <Text bold>Network</Text>
      <Text> </Text>
      <Box justifyContent="space-between">
        <Text dimColor>▼ In:</Text>
        <Text color="green">{networkIn}</Text>
      </Box>
      <Box justifyContent="space-between">
        <Text dimColor>▲ Out:</Text>
        <Text color="yellow">{networkOut}</Text>
      </Box>
      <Box justifyContent="space-between">
        <Text dimColor>Connections:</Text>
        <Text>{String(activeConnections)}</Text>
      </Box>
    </Box>
  )
}

/**
 * Panel showing process count and load averages.
 *
 * @private
 */
function LoadPanel({
  processes,
  loadAvg1,
  loadAvg5,
  loadAvg15,
}: {
  readonly processes: number
  readonly loadAvg1: number
  readonly loadAvg5: number
  readonly loadAvg15: number
}): ReactElement {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} flexGrow={1}>
      <Text bold>System Load</Text>
      <Text> </Text>
      <Box justifyContent="space-between">
        <Text dimColor>Processes:</Text>
        <Text>{String(processes)}</Text>
      </Box>
      <Box gap={2}>
        <Box flexDirection="column" alignItems="center">
          <Text dimColor>1m</Text>
          <Text bold color={loadColor(loadAvg1)}>
            {loadAvg1.toFixed(2)}
          </Text>
        </Box>
        <Box flexDirection="column" alignItems="center">
          <Text dimColor>5m</Text>
          <Text bold color={loadColor(loadAvg5)}>
            {loadAvg5.toFixed(2)}
          </Text>
        </Box>
        <Box flexDirection="column" alignItems="center">
          <Text dimColor>15m</Text>
          <Text bold color={loadColor(loadAvg15)}>
            {loadAvg15.toFixed(2)}
          </Text>
        </Box>
      </Box>
    </Box>
  )
}

/**
 * Panel listing services with health indicators.
 *
 * @private
 */
function ServicesPanel({
  services,
}: {
  readonly services: readonly ServiceStatus[]
}): ReactElement {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} flexGrow={1}>
      <Text bold>Services</Text>
      <Text> </Text>
      {services.map((svc) => (
        <Box key={svc.name} justifyContent="space-between">
          <Box gap={1}>
            <Text color={serviceColor(svc.status)}>{serviceIcon(svc.status)}</Text>
            <Text>{svc.name}</Text>
          </Box>
          <Text dimColor>{svc.latency}</Text>
        </Box>
      ))}
    </Box>
  )
}

/**
 * Panel showing recent system events with severity coloring.
 *
 * @private
 */
function EventsPanel({
  events,
}: {
  readonly events: readonly EventEntry[]
}): ReactElement {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      <Text bold>Recent Events</Text>
      <Text> </Text>
      {events.map((evt) => (
        <Box key={`${evt.time}-${evt.message}`} gap={1}>
          <Text dimColor>{evt.time}</Text>
          <Text bold color={severityColor(evt.severity)}>
            {severityLabel(evt.severity)}
          </Text>
          <Text>{evt.message}</Text>
        </Box>
      ))}
    </Box>
  )
}

/**
 * Render a labeled progress bar row.
 *
 * @private
 */
function ProgressRow({
  label,
  value,
}: {
  readonly label: string
  readonly value: number
}): ReactElement {
  const clamped = Math.max(0, Math.min(100, value))
  const filled = Math.round((clamped / 100) * BAR_WIDTH)
  const empty = BAR_WIDTH - filled
  const bar = FILLED_CHAR.repeat(filled) + EMPTY_CHAR.repeat(empty)

  return (
    <Box gap={1}>
      <Text dimColor>{label}</Text>
      <Text color={usageColor(clamped)}>{bar}</Text>
      <Text bold color={usageColor(clamped)}>
        {String(clamped).padStart(3)}%
      </Text>
    </Box>
  )
}

/**
 * Determine color for a usage percentage.
 *
 * @private
 */
function usageColor(value: number): string {
  return match(true)
    .when(
      () => value >= 90,
      () => 'red'
    )
    .when(
      () => value >= 70,
      () => 'yellow'
    )
    .otherwise(() => 'green')
}

/**
 * Determine color for a load average value.
 *
 * @private
 */
function loadColor(value: number): string {
  return match(true)
    .when(
      () => value >= 4.0,
      () => 'red'
    )
    .when(
      () => value >= 2.0,
      () => 'yellow'
    )
    .otherwise(() => 'green')
}

/**
 * Map service status to a display color.
 *
 * @private
 */
function serviceColor(status: ServiceStatus['status']): string {
  return match(status)
    .with('healthy', () => 'green')
    .with('degraded', () => 'yellow')
    .with('down', () => 'red')
    .exhaustive()
}

/**
 * Map service status to an icon.
 *
 * @private
 */
function serviceIcon(status: ServiceStatus['status']): string {
  return match(status)
    .with('healthy', () => '●')
    .with('degraded', () => '▲')
    .with('down', () => '✖')
    .exhaustive()
}

/**
 * Map event severity to a display color.
 *
 * @private
 */
function severityColor(severity: EventEntry['severity']): string {
  return match(severity)
    .with('info', () => 'blue')
    .with('warn', () => 'yellow')
    .with('critical', () => 'red')
    .exhaustive()
}

/**
 * Map event severity to a padded label.
 *
 * @private
 */
function severityLabel(severity: EventEntry['severity']): string {
  return match(severity)
    .with('info', () => 'INFO')
    .with('warn', () => 'WARN')
    .with('critical', () => 'CRIT')
    .exhaustive()
}
